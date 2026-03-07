#!/usr/bin/env python3
"""Scraper for chinesedrivingtest.com - collects all questions with answers and images."""

import requests
import re
import json
import os
import time
import hashlib
from html import unescape
from urllib.parse import urljoin

BASE_URL = "https://www.chinesedrivingtest.com"
DATA_DIR = "/home/admin/projects/driving/data"
IMAGES_DIR = os.path.join(DATA_DIR, "images")

CATEGORIES = [
    "Bad_conditions_and_Safety",
    "Basics",
    "Breakdowns_and_Stopping",
    "Controls_and_Meters",
    "Dashboard_lights_1",
    "Dashboard_lights_2",
    "Directional_and_tourist_signs",
    "Driving_license",
    "Expressways_1",
    "Expressways_2",
    "General_driving_1",
    "General_driving_2",
    "Indicative_signs",
    "Intersections",
    "Law_and_Punishment_1",
    "Law_and_Punishment_2",
    "Mountains_and_hills",
    "Night_driving",
    "Overtaking",
    "Pedestrians_and_bikes",
    "Penalty_points",
    "Prohibitive_signs",
    "Road_markings_1",
    "Road_markings_2",
    "Rules",
    "Signaling_Signs_and_Police_signals",
    "Speed_limits",
    "Traffic_signal_lights",
    "Warning_signs_1",
    "Warning_signs_2",
    "Warning_signs_3",
    "Weather",
]

os.makedirs(IMAGES_DIR, exist_ok=True)

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
})


def parse_question(html, category):
    """Parse a single question from HTML response."""
    question = {}
    question["category"] = category.replace("_", " ")

    # Get question ID
    rand_match = re.search(r'name="rand" value="(\d+)"', html)
    if not rand_match:
        return None
    question["id"] = int(rand_match.group(1))

    # Get question text (between title and either image or form)
    text_match = re.search(
        r'<i class ="title">[^<]+</i></a><br /><br />\s*\n(.+?)(?:\n\s*\n|\s*<br />)',
        html
    )
    if text_match:
        question["text"] = unescape(text_match.group(1).strip())
    else:
        return None

    # Get image if present
    img_match = re.search(r'<img src="(/static/img/[^"]+)"', html)
    if img_match:
        question["image_url"] = img_match.group(1)
        question["image_file"] = os.path.basename(img_match.group(1))
    else:
        question["image_url"] = None
        question["image_file"] = None

    # Determine question type
    if 'id="rwbutton"' in html:
        # True/False question
        question["type"] = "true_false"
        question["options"] = ["Right", "Wrong"]
        # Need to determine correct answer by submitting
        question["correct_answer"] = None  # Will be filled later
    else:
        # Multiple choice
        question["type"] = "multiple_choice"

        # Get scramble values
        scram = re.search(r'name="scram" value="(\d+)"', html)
        scrbm = re.search(r'name="scrbm" value="(\d+)"', html)
        scrcm = re.search(r'name="scrcm" value="(\d+)"', html)
        scrdm = re.search(r'name="scrdm" value="(\d+)"', html)

        # Get options text
        options = re.findall(r'<td class="qr">(.+?)</td>', html)
        question["options"] = [unescape(o) for o in options]

        # Find correct answer (scramble value 0 = correct)
        if scram and scrbm and scrcm and scrdm:
            scrambles = {
                "a": int(scram.group(1)),
                "b": int(scrbm.group(1)),
                "c": int(scrcm.group(1)),
                "d": int(scrdm.group(1)),
            }
            for letter, val in scrambles.items():
                if val == 0:
                    idx = ord(letter) - ord("a")
                    if idx < len(question["options"]):
                        question["correct_answer"] = question["options"][idx]
                        question["correct_index"] = idx
                    break
        else:
            question["correct_answer"] = None

    return question


def get_tf_answer(category, rand_val, csrf, cookies):
    """Submit 'right' to a T/F question and check if correct."""
    url = f"{BASE_URL}/study/{category}/#answer"
    data = {
        "csrfmiddlewaretoken": csrf,
        "rand": rand_val,
        "choice": "right",
    }
    resp = session.post(url, data=data, headers={
        "Referer": f"{BASE_URL}/study/{category}/",
    }, allow_redirects=True, timeout=30)

    if "CORRECT" in resp.text and "INCORRECT" not in resp.text:
        return "Right"
    elif "INCORRECT" in resp.text:
        return "Wrong"
    return None


def download_image(image_url):
    """Download an image if not already downloaded."""
    filename = os.path.basename(image_url)
    filepath = os.path.join(IMAGES_DIR, filename)
    if os.path.exists(filepath):
        return filepath

    full_url = urljoin(BASE_URL, image_url)
    try:
        resp = session.get(full_url, timeout=30)
        if resp.status_code == 200:
            with open(filepath, "wb") as f:
                f.write(resp.content)
            return filepath
    except Exception as e:
        print(f"  Failed to download {image_url}: {e}")
    return None


def scrape_category(category, all_questions, max_consecutive_dupes=30):
    """Scrape all questions from a category by repeated fetching."""
    url = f"{BASE_URL}/study/{category}/"
    seen_ids = {q["id"] for q in all_questions.values() if q["category"] == category.replace("_", " ")}
    consecutive_dupes = 0
    new_count = 0

    print(f"\n[{category}] Starting (already have {len(seen_ids)} questions)...")

    while consecutive_dupes < max_consecutive_dupes:
        try:
            resp = session.get(url, timeout=30)
            html = resp.text

            q = parse_question(html, category)
            if q is None:
                consecutive_dupes += 1
                time.sleep(0.3)
                continue

            qid = q["id"]

            if qid in all_questions:
                consecutive_dupes += 1
                time.sleep(0.15)
                continue

            consecutive_dupes = 0

            # For T/F questions, determine correct answer
            if q["type"] == "true_false" and q["correct_answer"] is None:
                csrf_match = re.search(r'csrfmiddlewaretoken" value="([^"]+)"', html)
                if csrf_match:
                    answer = get_tf_answer(category, str(qid), csrf_match.group(1), session.cookies)
                    q["correct_answer"] = answer
                    if answer == "Right":
                        q["correct_index"] = 0
                    elif answer == "Wrong":
                        q["correct_index"] = 1
                    time.sleep(0.2)

            # Download image
            if q["image_url"]:
                download_image(q["image_url"])

            all_questions[qid] = q
            seen_ids.add(qid)
            new_count += 1

            if new_count % 5 == 0:
                print(f"  [{category}] Found {new_count} new questions (total unique: {len(all_questions)})")

            time.sleep(0.15)

        except Exception as e:
            print(f"  [{category}] Error: {e}")
            time.sleep(1)

    print(f"  [{category}] Done. Found {new_count} new questions this round.")
    return new_count


def main():
    all_questions = {}

    # Load existing data if available
    output_file = os.path.join(DATA_DIR, "questions.json")
    if os.path.exists(output_file):
        with open(output_file) as f:
            existing = json.load(f)
        for q in existing:
            all_questions[q["id"]] = q
        print(f"Loaded {len(all_questions)} existing questions.")

    # Run multiple passes to catch all questions
    for pass_num in range(1, 4):
        print(f"\n{'='*60}")
        print(f"PASS {pass_num}")
        print(f"{'='*60}")

        total_new = 0
        for category in CATEGORIES:
            new = scrape_category(category, all_questions, max_consecutive_dupes=40 if pass_num == 1 else 25)
            total_new += new

            # Save progress after each category
            questions_list = sorted(all_questions.values(), key=lambda q: (q["category"], q["id"]))
            with open(output_file, "w") as f:
                json.dump(questions_list, f, indent=2, ensure_ascii=False)

        print(f"\nPass {pass_num} complete. Total new: {total_new}, Total questions: {len(all_questions)}")

        if total_new == 0:
            print("No new questions found, stopping.")
            break

    # Final save
    questions_list = sorted(all_questions.values(), key=lambda q: (q["category"], q["id"]))
    with open(output_file, "w") as f:
        json.dump(questions_list, f, indent=2, ensure_ascii=False)

    # Print summary
    print(f"\n{'='*60}")
    print(f"FINAL SUMMARY")
    print(f"{'='*60}")
    print(f"Total questions: {len(all_questions)}")

    by_category = {}
    by_type = {"true_false": 0, "multiple_choice": 0}
    missing_answers = 0
    with_images = 0

    for q in all_questions.values():
        cat = q["category"]
        by_category[cat] = by_category.get(cat, 0) + 1
        by_type[q["type"]] = by_type.get(q["type"], 0) + 1
        if q.get("correct_answer") is None:
            missing_answers += 1
        if q.get("image_url"):
            with_images += 1

    print(f"True/False: {by_type['true_false']}")
    print(f"Multiple Choice: {by_type['multiple_choice']}")
    print(f"With images: {with_images}")
    print(f"Missing answers: {missing_answers}")
    print(f"\nBy category:")
    for cat in sorted(by_category.keys()):
        print(f"  {cat}: {by_category[cat]}")


if __name__ == "__main__":
    main()
