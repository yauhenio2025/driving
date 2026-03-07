#!/usr/bin/env python3
"""Fix incorrect correct_answer/correct_index in questions.json.

Instead of hunting for specific questions (slow), we crawl each category
and verify every question we encounter against the site's actual answers.
"""

import requests
import re
import json
import time
from html import unescape

BASE_URL = "https://www.chinesedrivingtest.com"
DATA_FILE = "/home/admin/projects/driving/data/questions.json"

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
})

CATEGORIES = [
    "Bad_conditions_and_Safety", "Basics", "Breakdowns_and_Stopping",
    "Controls_and_Meters", "Dashboard_lights_1", "Dashboard_lights_2",
    "Directional_and_tourist_signs", "Driving_license", "Expressways_1",
    "Expressways_2", "General_driving_1", "General_driving_2",
    "Indicative_signs", "Intersections", "Law_and_Punishment_1",
    "Law_and_Punishment_2", "Mountains_and_hills", "Night_driving",
    "Overtaking", "Pedestrians_and_bikes", "Penalty_points",
    "Prohibitive_signs", "Road_markings_1", "Road_markings_2", "Rules",
    "Signaling_Signs_and_Police_signals", "Speed_limits",
    "Traffic_signal_lights", "Warning_signs_1", "Warning_signs_2",
    "Warning_signs_3", "Weather",
]


def verify_and_get_answer(category_slug):
    """Fetch a random question from a category, submit choice=a, and return the verified answer."""
    url = f"{BASE_URL}/study/{category_slug}/"

    try:
        resp = session.get(url, timeout=30)
        html = resp.text
    except Exception as e:
        return None

    rand_match = re.search(r'name="rand" value="(\d+)"', html)
    if not rand_match:
        return None
    qid = int(rand_match.group(1))

    # Check if this is T/F (skip, those are verified differently)
    if 'id="rwbutton"' in html:
        return {"id": qid, "type": "true_false"}

    csrf = re.search(r'csrfmiddlewaretoken" value="([^"]+)"', html)
    scram = re.search(r'name="scram" value="(\d+)"', html)
    scrbm = re.search(r'name="scrbm" value="(\d+)"', html)
    scrcm = re.search(r'name="scrcm" value="(\d+)"', html)
    scrdm = re.search(r'name="scrdm" value="(\d+)"', html)
    if not all([csrf, scram, scrbm, scrcm, scrdm]):
        return None

    options = re.findall(r'<td class="qr">(.+?)</td>', html)
    options = [unescape(o) for o in options]

    try:
        result = session.post(
            f"{url}#answer",
            data={
                "csrfmiddlewaretoken": csrf.group(1),
                "rand": str(qid),
                "scram": scram.group(1),
                "scrbm": scrbm.group(1),
                "scrcm": scrcm.group(1),
                "scrdm": scrdm.group(1),
                "choice": "a",
            },
            headers={"Referer": url},
            timeout=30,
        )
    except Exception:
        return None

    result_html = result.text

    if "CORRECT" in result_html and "INCORRECT" not in result_html:
        correct_letter = "a"
    elif "INCORRECT" in result_html:
        m = re.search(r'the answer is <b>([a-d])</b>', result_html)
        if not m:
            return None
        correct_letter = m.group(1)
    else:
        return None

    correct_idx = ord(correct_letter) - ord("a")
    correct_answer = options[correct_idx] if correct_idx < len(options) else None

    return {
        "id": qid,
        "type": "multiple_choice",
        "options": options,
        "correct_answer": correct_answer,
        "correct_index_in_displayed": correct_idx,
    }


def main():
    with open(DATA_FILE) as f:
        questions = json.load(f)

    q_by_id = {q["id"]: q for q in questions}
    mc_ids = {q["id"] for q in questions if q["type"] == "multiple_choice"}
    verified_ids = set()
    fixed = 0
    errors = 0

    print(f"Total questions: {len(questions)}, MC to verify: {len(mc_ids)}")

    for cat_slug in CATEGORIES:
        cat_name = cat_slug.replace("_", " ")
        cat_mc = {q["id"] for q in questions if q["category"] == cat_name and q["type"] == "multiple_choice"}
        cat_remaining = cat_mc - verified_ids
        if not cat_remaining:
            continue

        print(f"\n[{cat_name}] {len(cat_remaining)} MC questions to verify")
        consecutive_dupes = 0

        while cat_remaining and consecutive_dupes < 50:
            result = verify_and_get_answer(cat_slug)
            if result is None:
                time.sleep(0.3)
                consecutive_dupes += 1
                continue

            if result["type"] == "true_false":
                time.sleep(0.15)
                consecutive_dupes += 1
                continue

            qid = result["id"]
            if qid not in mc_ids:
                consecutive_dupes += 1
                time.sleep(0.15)
                continue

            if qid in verified_ids:
                consecutive_dupes += 1
                time.sleep(0.15)
                continue

            consecutive_dupes = 0
            verified_ids.add(qid)
            cat_remaining.discard(qid)

            q = q_by_id[qid]
            site_answer = result["correct_answer"]
            site_options = result["options"]

            # Find this answer in our stored options
            stored_idx = None
            for si, opt in enumerate(q["options"]):
                if opt.strip() == site_answer.strip():
                    stored_idx = si
                    break

            if stored_idx is None:
                # Try to match options and rebuild
                print(f"  Q{qid}: OPTIONS DIFFER from site, updating entirely")
                q["options"] = site_options
                q["correct_answer"] = site_answer
                q["correct_index"] = result["correct_index_in_displayed"]
                fixed += 1
            elif stored_idx != q["correct_index"]:
                old = q["correct_answer"]
                q["correct_answer"] = site_answer
                q["correct_index"] = stored_idx
                print(f"  Q{qid}: FIXED '{old}' (idx {q['correct_index']}) -> '{site_answer}' (idx {stored_idx})")
                # correct the print (already updated)
                fixed += 1
            # else: already correct

            remaining_total = len(mc_ids - verified_ids)
            if len(verified_ids) % 20 == 0:
                print(f"  Progress: {len(verified_ids)}/{len(mc_ids)} verified, {fixed} fixed, {remaining_total} remaining")

            time.sleep(0.15)

        print(f"  [{cat_name}] verified {len(cat_mc - cat_remaining)}/{len(cat_mc)}, {len(cat_remaining)} missed")

    print(f"\n{'='*60}")
    print(f"DONE. Verified: {len(verified_ids)}/{len(mc_ids)}, Fixed: {fixed}")
    if mc_ids - verified_ids:
        print(f"Could not verify {len(mc_ids - verified_ids)} questions (not encountered)")

    # Save
    questions_list = sorted(questions, key=lambda q: (q["category"], q["id"]))
    with open(DATA_FILE, "w") as f:
        json.dump(questions_list, f, indent=2, ensure_ascii=False)
    print(f"Saved to {DATA_FILE}")


if __name__ == "__main__":
    main()
