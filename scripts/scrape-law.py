#!/usr/bin/env python3
"""Scrape Chinese Road Traffic Safety Law from Wikisource and output as JS module."""

import re
import urllib.request
import html
from html.parser import HTMLParser

URL = "https://en.wikisource.org/wiki/Law_of_the_People%27s_Republic_of_China_on_Road_Traffic_Safety_(2003)"

class WikiParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_content = False
        self.text_parts = []
        self.current_text = ""
        self.skip = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'div' and 'mw-parser-output' in attrs_dict.get('class', ''):
            self.in_content = True
        if tag in ('table', 'style', 'script'):
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ('table', 'style', 'script'):
            self.skip = False
        if self.in_content and tag == 'p':
            self.text_parts.append(self.current_text.strip())
            self.current_text = ""
        if self.in_content and tag in ('h2', 'h3'):
            self.text_parts.append(f"###{self.current_text.strip()}")
            self.current_text = ""

    def handle_data(self, data):
        if self.in_content and not self.skip:
            self.current_text += data


def fetch_and_parse():
    print("Fetching law text from Wikisource...")
    req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw_html = resp.read().decode('utf-8')
    except Exception as e:
        print(f"Could not fetch from Wikisource: {e}")
        print("Using embedded law text instead.")
        return None

    parser = WikiParser()
    parser.feed(raw_html)
    return parser.text_parts


def parse_into_chapters(text_parts):
    if not text_parts:
        return None

    chapters = []
    current_chapter = None
    current_articles = []

    for part in text_parts:
        if not part:
            continue

        # Check for chapter headings
        chapter_match = re.match(r'###.*Chapter\s+(\w+)\s*(.*)', part, re.IGNORECASE)
        if chapter_match:
            if current_chapter:
                chapters.append({'number': current_chapter['number'], 'title': current_chapter['title'], 'articles': current_articles})
            roman_to_int = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8}
            num_str = chapter_match.group(1)
            num = roman_to_int.get(num_str, len(chapters) + 1)
            title = chapter_match.group(2).strip(' \t\n:.-')
            current_chapter = {'number': num, 'title': title or f'Chapter {num}'}
            current_articles = []
            continue

        # Check for articles
        article_match = re.match(r'Article\s+(\d+)\s*(.*)', part)
        if article_match:
            art_num = int(article_match.group(1))
            art_text = article_match.group(2).strip()
            current_articles.append({'number': art_num, 'text': art_text})
        elif current_articles:
            # Continuation of previous article
            current_articles[-1]['text'] += ' ' + part

    if current_chapter:
        chapters.append({'number': current_chapter['number'], 'title': current_chapter['title'], 'articles': current_articles})

    return chapters


def get_fallback_chapters():
    """Hardcoded key articles for when scraping fails."""
    return [
        {'number': 1, 'title': 'General Provisions', 'articles': [
            {'number': 1, 'text': 'This Law is enacted for the purpose of maintaining road traffic order, preventing and reducing traffic accidents, protecting personal safety, protecting the property safety of citizens, legal persons and other organizations, and improving traffic efficiency.'},
            {'number': 2, 'text': 'The drivers of vehicles, pedestrians and passengers on roads within the territory of the People\'s Republic of China shall observe this Law.'},
            {'number': 3, 'text': 'Road traffic safety work shall follow the principle of giving priority to safety, prevention first and paying equal attention to safety and smooth traffic, and improving the level of road traffic management.'},
            {'number': 4, 'text': 'People\'s governments at all levels shall ensure that road traffic safety management work is adapted to economic development.'},
            {'number': 5, 'text': 'The public security organ of the State Council is in charge of the administration of road traffic safety throughout the country. The traffic management department of the public security organ at or above the county level shall be in charge of road traffic safety management within its jurisdiction.'},
        ]},
        {'number': 2, 'title': 'Vehicles and Drivers', 'articles': [
            {'number': 8, 'text': 'The State applies a registration system to motor vehicles. Motor vehicles that have been registered with the traffic management department of the public security organ may travel on the road. Unregistered motor vehicles that need to travel on the road temporarily shall obtain temporary traffic plates.'},
            {'number': 11, 'text': 'Motor vehicles that travel on roads shall be affixed with motor vehicle license plates, placed inspection marks and insurance marks, and the motor vehicle driving license shall be carried.'},
            {'number': 13, 'text': 'Motor vehicles that have completed registration shall have safety technical inspections on a regular basis.'},
            {'number': 14, 'text': 'Motor vehicles that have reached the prescribed scrapping standards shall be deregistered in time. Motor vehicles that should be scrapped but have not been scrapped shall be handled in accordance with the relevant State regulations.'},
            {'number': 16, 'text': 'No person may assemble a motor vehicle or modify the registered structure, construction or characteristics of a motor vehicle without authorization. No person may change the engine number, chassis number or vehicle identification number of a motor vehicle.'},
            {'number': 19, 'text': 'Drivers of motor vehicles shall obtain motor vehicle driving licenses according to law. The applicant for a motor vehicle driving license shall meet the driving license conditions prescribed by the public security department of the State Council and pass examinations.'},
            {'number': 20, 'text': 'Motor vehicle driving licenses are classified according to the type of motor vehicle permitted to be driven. Drivers of motor vehicles shall drive motor vehicles of the types that their motor vehicle driving licenses allow them to drive.'},
            {'number': 21, 'text': 'The driver shall check the safety and technical performance of the motor vehicle before driving on the road. No person shall drive a motor vehicle that has safety hazards such as unsafe technical performance or does not meet technical standards.'},
            {'number': 22, 'text': 'No person shall drive a motor vehicle after drinking alcohol. No person shall hand over a motor vehicle to a person who has not obtained a motor vehicle driving license or whose motor vehicle driving license has been revoked or temporarily detained.'},
        ]},
        {'number': 3, 'title': 'Road Traffic Conditions', 'articles': [
            {'number': 25, 'text': 'Traffic signals include traffic signal lights, traffic signs, traffic markings and traffic police commands.'},
            {'number': 26, 'text': 'Traffic signal lights are composed of red, green and yellow lights. The red light means no passing; the green light means passing is permitted; the yellow light means warning.'},
            {'number': 27, 'text': 'Railway crossings shall have warning signs or signals. Motor vehicles and non-motor vehicles traveling on roads shall give priority to trains through the crossings.'},
            {'number': 28, 'text': 'No unit or individual may set up, move, occupy or damage traffic signal lights, traffic signs or traffic markings without authorization.'},
        ]},
        {'number': 4, 'title': 'Road Traffic Regulations', 'articles': [
            {'number': 35, 'text': 'Motor vehicles and non-motor vehicles shall drive on the right side of the road.'},
            {'number': 36, 'text': 'On roads divided into motor vehicle lanes, non-motor vehicle lanes and sidewalks according to the types of road traffic, motor vehicles, non-motor vehicles and pedestrians shall travel in their respective lanes.'},
            {'number': 38, 'text': 'Vehicles and pedestrians shall pass according to traffic signal lights; in the case of traffic police directing on-site, they shall pass according to the commands of the traffic police; on roads without traffic signal lights, they shall pass under the premise of ensuring safety and smooth traffic.'},
            {'number': 39, 'text': 'The traffic management department of the public security organ may, according to road and traffic flow conditions, impose restrictions on types of motor vehicles, non-motor vehicles and pedestrians at specific sections and time periods.'},
            {'number': 41, 'text': 'Motor vehicles driving on roads without a central dividing line shall run on the right half of the road.'},
            {'number': 42, 'text': 'Motor vehicles traveling on roads shall not exceed the maximum speed indicated by speed limit signs and markings. In the absence of speed limit signs or markings, motor vehicles shall not exceed the following maximum speeds: (1) No more than 30 km/h on roads without a central dividing line in urban areas; (2) No more than 40 km/h on roads without a central dividing line outside urban areas; (3) No more than 50 km/h on roads with only one motor vehicle lane in each direction in urban areas; (4) No more than 70 km/h on roads with only one motor vehicle lane in each direction outside urban areas.'},
            {'number': 43, 'text': 'The vehicle behind shall keep sufficient distance from the vehicle in front when following it on the same lane. When the vehicle in front is decelerating or stopping, the vehicle behind shall not overtake it from the left side.'},
            {'number': 44, 'text': 'When a motor vehicle passes through an intersection, it shall pass according to the traffic signal lights, traffic signs, traffic markings or the commands of the traffic police.'},
            {'number': 45, 'text': 'Motor vehicles encountering a vehicle in front stopping and queuing or going slowly shall stop and queue, and shall not drive on the opposite lane or cut in line.'},
            {'number': 46, 'text': 'Motor vehicles passing through intersections with traffic signals shall follow these provisions: (1) Turn left at intersections, keep to the left of the center of the intersection, and turn left. When the light turns green, vehicles that have entered the intersection waiting to turn left may continue to turn left; (2) Vehicles that encounter a stop signal shall stop outside the stop line in sequence. If there is no stop line, stop before the intersection.'},
            {'number': 47, 'text': 'When motor vehicles pass a crosswalk, they shall slow down. When passing a crosswalk where pedestrians are crossing, they shall stop and yield.'},
            {'number': 48, 'text': 'Motor vehicles shall not exceed the posted speed limits on expressways. When visibility is less than 200m, the speed shall not exceed 60 km/h and the distance from the vehicle ahead shall not be less than 100m. When visibility is less than 100m, the speed shall not exceed 40 km/h and the distance from the vehicle ahead shall not be less than 50m. When visibility is less than 50m, the speed shall not exceed 20 km/h, and the vehicle shall leave the expressway as soon as possible.'},
            {'number': 49, 'text': 'Passengers of motor vehicles shall not exceed the approved number.'},
            {'number': 50, 'text': 'It is forbidden to overtake at railway crossings, intersections, narrow bridges, sharp curves, steep slopes, tunnels, pedestrian crossings, and urban areas with heavy traffic.'},
            {'number': 51, 'text': 'Motor vehicle drivers and front seat passengers shall use safety belts according to regulations.'},
            {'number': 52, 'text': 'Motor vehicles shall not be parked on crosswalks and in the safety zones for fire engines and fire hydrants.'},
            {'number': 53, 'text': 'Police vehicles, fire engines, ambulances and engineering rescue vehicles shall use alarm devices and special signal lights when performing emergency tasks. They may pass when ensuring safety.'},
            {'number': 54, 'text': 'Vehicles carrying flammable and explosive articles, highly toxic chemicals and radioactive articles on roads shall be approved by the public security organ.'},
            {'number': 56, 'text': 'Motor vehicles shall be parked at prescribed locations. No parking on sidewalks is allowed except at those locations where parking on sidewalks is permitted by traffic signs or markings.'},
            {'number': 57, 'text': 'Drivers of motor vehicles shall comply with the following rules when driving: (1) Drive at a safe speed; (2) Yield to pedestrians at crosswalks; (3) Use turn signals when changing lanes or turning.'},
            {'number': 58, 'text': 'On expressways, motor vehicles shall travel in the prescribed lanes.'},
            {'number': 62, 'text': 'When a motor vehicle driver is driving, he shall not make or answer hand-held telephone calls, watch television or engage in other acts that impede safe driving.'},
            {'number': 67, 'text': 'Motor vehicles traveling on expressways shall not exceed the speed limit indicated by speed limit signs or markings. The maximum speed on expressways shall not exceed 120 km/h, and the minimum speed shall not be less than 60 km/h.'},
            {'number': 68, 'text': 'When a motor vehicle breaks down on an expressway, the driver shall immediately move the vehicle to the emergency lane and turn on hazard lights. A warning sign shall be placed 150m behind the vehicle. The driver and passengers shall move to the right side of the road and call for help.'},
        ]},
        {'number': 5, 'title': 'Traffic Accident Handling', 'articles': [
            {'number': 70, 'text': 'When a traffic accident occurs on a road causing personal injury or death, the driver shall immediately stop, protect the scene and report to the police. If a minor accident causes only minor property damage and the facts are clear, the parties shall first move the vehicle to a place that does not obstruct traffic and then negotiate a settlement.'},
            {'number': 71, 'text': 'If the driver of a motor vehicle causes a traffic accident and flees, the insurance company that provides compulsory motor vehicle liability insurance for the vehicle shall make advance payment for rescue expenses within the limit of liability.'},
            {'number': 75, 'text': 'Medical institutions shall treat the injured persons of traffic accidents in time and shall not delay treatment due to unpaid rescue expenses.'},
            {'number': 76, 'text': 'Where a motor vehicle causes a traffic accident resulting in personal injury or death or property loss, the insurance company shall compensate within the limit of liability of compulsory motor vehicle traffic accident liability insurance.'},
        ]},
        {'number': 6, 'title': 'Law Enforcement', 'articles': [
            {'number': 80, 'text': 'Traffic police shall enforce the law fairly and civilly. Traffic police who fail to perform their duties according to law shall be investigated.'},
        ]},
        {'number': 7, 'title': 'Legal Liability', 'articles': [
            {'number': 87, 'text': 'Where a motor vehicle driver violates road traffic safety laws or regulations, the traffic management department of the public security organ shall impose penalties. Traffic police may impose penalties on the spot for minor violations.'},
            {'number': 88, 'text': 'The public security traffic management department and its traffic police who discover traffic violations of motor vehicles on the road shall stop them in time and impose penalties. For traffic violations that are not discovered on the road, the traffic management department shall notify the parties to accept the penalties within a time limit.'},
            {'number': 89, 'text': 'Pedestrians, passengers, and non-motor vehicle drivers who violate road traffic safety laws or regulations shall be given a warning or be fined not less than 5 yuan but not more than 50 yuan.'},
            {'number': 90, 'text': 'Motor vehicle drivers who violate road traffic safety laws or regulations shall be given a warning or fined not less than 20 yuan but not more than 200 yuan.'},
            {'number': 91, 'text': 'A person who drinks alcohol and drives a motor vehicle shall be temporarily detained the motor vehicle driving license for one to three months and fined not less than 200 yuan but not more than 500 yuan. A person who drinks alcohol and drives a commercial motor vehicle shall be temporarily detained the motor vehicle driving license for three months and fined 500 yuan. A person who is intoxicated and drives a motor vehicle shall be restrained until sober, detained the motor vehicle driving license for three to six months, and fined not less than 500 yuan but not more than 2000 yuan. A person who is intoxicated and drives a commercial motor vehicle shall be restrained until sober, detained the driving license for six months, and fined 2000 yuan. A person who drinks alcohol and drives after having the driving license temporarily detained for the same violation shall be detained for not more than 15 days, fined not less than 500 yuan but not more than 2000 yuan, and have the driving license revoked.'},
            {'number': 92, 'text': 'A person who drives on the expressway at a speed lower than the prescribed minimum speed shall be given a warning or fined 200 yuan. Motor vehicles that drive on the wrong side or in reverse on the expressway shall be fined 200 yuan.'},
            {'number': 95, 'text': 'A motor vehicle that does not have the license plates affixed, has the inspection marks and insurance marks placed, or has the motor vehicle driving license and driving license carried shall be detained by the traffic management department.'},
            {'number': 96, 'text': 'Forging or altering motor vehicle registration certificates, license plates, driving licenses or inspection marks, insurance marks, or using forged or altered ones, or using other motor vehicles\' registration certificates, license plates, driving licenses or inspection marks, insurance marks shall be confiscated and detained by the traffic management department, and fined 200 to 2000 yuan. The driving license shall be revoked.'},
            {'number': 98, 'text': 'A motor vehicle owner or manager that fails to take out compulsory motor vehicle traffic accident liability insurance according to the State regulations shall be fined twice the insurance premium by the traffic management department.'},
            {'number': 99, 'text': 'The following acts shall be fined not less than 200 yuan but not more than 2000 yuan: (1) Driving a motor vehicle without a driving license; (2) Driving a motor vehicle of a type that is not permitted by the driving license; (3) Handing a motor vehicle to a person who has not obtained a driving license or whose license has been revoked or detained; (4) Hit and run; (5) Forcing passage against traffic regulations; (6) Driving a motor vehicle whose license plates are deliberately obstructed or defaced; (7) Not stopping as required by traffic police.'},
            {'number': 100, 'text': 'A driver who drives an assembled motor vehicle or a motor vehicle that has reached the scrapping standard on the road shall be fined 200 to 2000 yuan and the vehicle shall be confiscated and forcibly scrapped.'},
            {'number': 101, 'text': 'A person who causes a major traffic accident constituting a crime shall be investigated for criminal responsibility, and the motor vehicle driving license shall be revoked by the traffic management department. A person who causes a traffic accident and flees shall not re-apply for a motor vehicle driving license for life.'},
        ]},
        {'number': 8, 'title': 'Supplementary Provisions', 'articles': [
            {'number': 119, 'text': 'The following terms used in this Law have the following meanings: (1) "Road" means highways, urban roads and roads that allow the passage of social motor vehicles although they are within a unit\'s jurisdiction, including public squares, public parking lots and other places used by the public for passage. (2) "Vehicle" means a motor vehicle or a non-motor vehicle. (3) "Motor vehicle" means a vehicle that is driven by power and travels on the road for use in carrying people, carrying cargo or performing special engineering operations. (4) "Non-motor vehicle" means a vehicle that is driven by human or animal power on the road, and a disabled person\'s wheelchair and an electric bicycle that comply with relevant national standards.'},
            {'number': 124, 'text': 'This Law shall come into force as of May 1, 2004.'},
        ]},
    ]


def generate_category_mapping(chapters):
    """Map question categories to relevant law chapters/articles."""
    mapping = {
        'Bad conditions and Safety': [4, 5],
        'Basics': [1, 2],
        'Breakdowns and Stopping': [4],
        'Controls and Meters': [2],
        'Dashboard lights 1': [2],
        'Dashboard lights 2': [2],
        'Directional and tourist signs': [3],
        'Driving license': [2],
        'Expressways 1': [4],
        'Expressways 2': [4],
        'General driving 1': [4],
        'General driving 2': [4],
        'Indicative signs': [3],
        'Intersections': [4],
        'Law and Punishment 1': [7],
        'Law and Punishment 2': [7],
        'Mountains and hills': [4],
        'Night driving': [4],
        'Overtaking': [4],
        'Pedestrians and bikes': [4],
        'Penalty points': [7],
        'Prohibitive signs': [3],
        'Road markings 1': [3],
        'Road markings 2': [3],
        'Rules': [1, 4],
        'Signaling Signs and Police signals': [3],
        'Speed limits': [4],
        'Traffic signal lights': [3],
        'Warning signs 1': [3],
        'Warning signs 2': [3],
        'Warning signs 3': [3],
        'Weather': [4],
    }
    return mapping


def write_js_module(chapters, mapping, output_path):
    """Write the JS module."""
    lines = ['// Auto-generated from Chinese Road Traffic Safety Law (2003)',
             '// Source: Wikisource',
             '',
             'export const trafficLaw = {',
             '  chapters: [']

    for ch in chapters:
        lines.append(f'    {{ number: {ch["number"]}, title: {repr(ch["title"])}, articles: [')
        for art in ch['articles']:
            text = art['text'].replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ')
            lines.append(f"      {{ number: {art['number']}, text: '{text}' }},")
        lines.append('    ]},')

    lines.append('  ]')
    lines.append('};')
    lines.append('')

    # Build category to article text mapping
    lines.append('// Maps each question category to relevant law article texts')
    lines.append('const chapterMap = {};')
    lines.append('for (const ch of trafficLaw.chapters) {')
    lines.append('  chapterMap[ch.number] = ch.articles;')
    lines.append('}')
    lines.append('')

    lines.append('const categoryChapterMap = {')
    for cat, ch_nums in sorted(mapping.items()):
        lines.append(f"  '{cat}': {ch_nums},")
    lines.append('};')
    lines.append('')

    lines.append('export const categoryToChapters = {};')
    lines.append('for (const [category, chNums] of Object.entries(categoryChapterMap)) {')
    lines.append('  categoryToChapters[category] = [];')
    lines.append('  for (const n of chNums) {')
    lines.append('    const arts = chapterMap[n] || [];')
    lines.append('    for (const a of arts) {')
    lines.append('      categoryToChapters[category].push(`Article ${a.number}: ${a.text}`);')
    lines.append('    }')
    lines.append('  }')
    lines.append('}')

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines) + '\n')

    print(f"Written to {output_path}")
    total_articles = sum(len(ch['articles']) for ch in chapters)
    print(f"  {len(chapters)} chapters, {total_articles} articles")


if __name__ == '__main__':
    import os
    output = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'trafficLaw.js')

    text_parts = fetch_and_parse()
    chapters = None
    if text_parts:
        chapters = parse_into_chapters(text_parts)

    if not chapters or len(chapters) < 5:
        print("Using fallback (embedded) law text")
        chapters = get_fallback_chapters()

    mapping = generate_category_mapping(chapters)
    write_js_module(chapters, mapping, output)
