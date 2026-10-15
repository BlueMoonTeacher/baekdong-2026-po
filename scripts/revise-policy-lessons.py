"""Apply the reviewed 26-30 lesson sequence to the app and native HWPX guides.

Run from the repository root with lxml installed. Native Hancom export must follow
to recalculate pagination and PDF previews; this script never publishes files.
Backups in artifacts/policy-lesson-refinement are retained across repeat runs.
"""
from copy import deepcopy
from pathlib import Path
import json
import shutil
import zipfile
from lxml import etree as E

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / 'artifacts/policy-lesson-refinement'
WORK.mkdir(parents=True, exist_ok=True)
SPEC = json.loads((ROOT / 'scripts/policy-lessons-26-30.json').read_text(encoding='utf-8'))
HP = 'http://www.hancom.co.kr/hwpml/2011/paragraph'
NS = {'hp': HP}
q = lambda name: f'{{{HP}}}{name}'
text = lambda node: ''.join(node.xpath('.//hp:t/text()', namespaces=NS))


def paragraphs(node):
    return [value for p in node.iter(q('p'))
            if (value := ''.join(p.xpath('./hp:run/hp:t/text()', namespaces=NS)).strip())]


def backup(path):
    destination = WORK / ('before-' + path.name)
    if not destination.exists():
        shutil.copy2(path, destination)
    return destination


serial = 3200000000


def write_cell(cell, lines, template=None):
    """Keep cell geometry and reuse existing paragraph/character styles by marker."""
    global serial
    sub = cell.find(q('subList'))
    seeds = (template if template is not None else cell).find(q('subList')).findall(q('p'))
    seeds = deepcopy(seeds)
    for child in list(sub):
        sub.remove(child)
    for line in lines:
        marker = line.lstrip()[:1]
        seed = next((p for p in seeds if text(p).strip().startswith(marker)), seeds[0])
        serial += 1
        attrs = {**seed.attrib, 'id': str(serial), 'pageBreak': '0', 'columnBreak': '0'}
        p = E.SubElement(sub, q('p'), **attrs)
        runs = seed.findall(q('run'))
        # Prefer the text run over a marker-only run with a symbol font.
        run = max(runs, key=lambda r: len(text(r))) if runs else None
        r = E.SubElement(p, q('run'), **(dict(run.attrib) if run is not None else {'charPrIDRef': '0'}))
        E.SubElement(r, q('t')).text = line


def save_package(source, destination, section):
    with zipfile.ZipFile(source) as archive:
        replacements = {
            'Contents/section0.xml': E.tostring(section, encoding='UTF-8', xml_declaration=True),
            'Preview/PrvText.txt': '\n'.join(paragraphs(section)).encode('utf-8'),
        }
        with zipfile.ZipFile(destination, 'w') as output:
            for info in archive.infolist():
                if info.filename != 'Preview/PrvImage.png':
                    output.writestr(deepcopy(info), replacements.get(info.filename, archive.read(info.filename)))


curriculum_path = ROOT / 'src/curriculum.json'
backup(curriculum_path)
curriculum = json.loads(curriculum_path.read_text(encoding='utf-8'))
original = deepcopy(curriculum)
by_number = {lesson['number']: lesson for lesson in original}
guide = next((ROOT / '추가자료/2026_인구교육_26~30차시_개정본').glob('*.hwpx'))
guide_before = backup(guide)
with zipfile.ZipFile(guide_before) as archive:
    section = E.fromstring(archive.read('Contents/section0.xml'))
tables = section.xpath('./hp:p/hp:run/hp:tbl', namespaces=NS)
main_tables = tables[::2]
assessment_tables = tables[1::2]
assert len(main_tables) == 27
table_by_group = {text(table.findall(q('tr'))[0][-1]).split('/')[0]: table for table in main_tables}
reference = table_by_group['23'].findall(q('tr'))
unaltered = [E.tostring(child) for child in list(section)[:46]]
labels = [('Wonder', '(문제인식)'), ('Analyze', '(분석 및 탐구)'),
          ('Realize', '(실행 및 적용)'), ('Meditate', '(공유 및 반성)')]

for unit in SPEC['lessons']:
    group = unit['group']
    main = table_by_group[group]
    rows = main.findall(q('tr'))
    assert len(rows) == 12, (group, len(rows))
    standard = by_number[unit['standardFrom']]['standard']
    write_cell(rows[1][1], [SPEC['topic']], reference[1][1])
    write_cell(rows[2][1], [unit['title']], reference[2][1])
    write_cell(rows[3][1], [unit['objective']], reference[3][1])
    write_cell(rows[4][1], [standard], reference[4][1])
    for index, stage in enumerate(unit['stages']):
        row = rows[8 + index]
        write_cell(row[0], list(labels[index]), reference[8 + index][0])
        write_cell(row[1], stage['activities'], reference[8 + index][1])
        write_cell(row[2], stage['notes'], reference[8 + index][2])
    assessment = assessment_tables[main_tables.index(main)].findall(q('tr'))
    write_cell(assessment[1][0], [unit['objective']])
    write_cell(assessment[1][2], [unit['assessment'][0]])
    write_cell(assessment[2][1], [unit['assessment'][1]])
    write_cell(assessment[3][1], [unit['assessment'][2]])
    write_cell(assessment[1][3], ['관찰평가, 산출물 평가, 자기평가'])
    for lesson in curriculum:
        if lesson['group'] != group:
            continue
        lesson.update(title=unit['title'], sourceTitle=unit['title'], objective=unit['objective'],
                      topic=SPEC['topic'], standard=standard, detail=paragraphs(main),
                      detailVersion='policy-inquiry-2026')
        lesson['planCells']['2']['text'] = SPEC['topic']
        lesson['planCells']['7']['text'] = unit['product']
    assert unit['title'].endswith('하기'), unit['title']

assert unaltered == [E.tostring(child) for child in list(section)[:46]], 'Lessons 1-25 changed'
assert original[:25] == curriculum[:25], 'App lessons 1-25 changed'
candidate = WORK / 'lesson-plan-refined.hwpx'
save_package(guide_before, candidate, section)
curriculum_path.write_text(json.dumps(curriculum, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# The common plan uses local lesson numbers 6, 7, 8~9, 10 in project 3.
plan = ROOT / '추가자료/공통자료/인구교육 프로젝트 수업 계획 및 논의 사항 정리.hwpx'
plan_before = backup(plan)
with zipfile.ZipFile(plan_before) as archive:
    plan_section = E.fromstring(archive.read('Contents/section0.xml'))
plan_rows = plan_section.xpath('.//hp:tbl', namespaces=NS)[0].findall(q('tr'))
for row_index, unit in zip(range(24, 28), SPEC['lessons']):
    cells = plan_rows[row_index].findall(q('tc'))
    if row_index == 24:
        write_cell(cells[1], [SPEC['topic']])
    suffix = '(공개수업 후보1)' if unit['group'] == '26' else '(공개수업 후보2)' if unit['group'] == '30' else ''
    write_cell(cells[2] if row_index == 24 else cells[0], [unit['title'], suffix] if suffix else [unit['title']])
    for cell in cells:
        address = cell.find(q('cellAddr'))
        if address is not None and address.get('colAddr') == '7':
            write_cell(cell, [unit['product']])
plan_candidate = WORK / 'project-plan-refined.hwpx'
save_package(plan_before, plan_candidate, plan_section)

manifest = {'guideCandidate': str(candidate), 'guideOutput': str(guide),
            'planCandidate': str(plan_candidate), 'planOutput': str(plan)}
(WORK / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

review = ['# 26~30차시 수업 정선안', '',
          '인구·정책 탐구 → 근거를 갖춘 글쓰기 → 홍보 자료 제작 → 반응 확인과 보완 → 발표와 성찰', '',
          '기존 1~25차시, 차시 번호, 28~29차시 묶음, 26·30차시 공개수업 후보를 유지합니다.', '',
          '## 차시 연결', '', '| 차시 | 교육활동명 | 이어지는 산출물 |', '| --- | --- | --- |']
for unit in SPEC['lessons']:
    review.append(f"| {unit['group']} | {unit['title']} | {unit['product']} |")
review += ['', '## 정선 기준', '',
           '- 활동명은 모두 ‘~하기’, 목표는 ‘~할 수 있다.’로 서술합니다.',
           '- WARM 단계와 기존 지도안의 ▣ 활동, ◦ 주요 활동, - 세부 활동, ▶자료, ▵유의점 위계를 맞춥니다.',
           '- 26차시는 탐구와 정책 선택에 집중하고, 개선 제안은 근거를 확보한 27차시에 씁니다.',
           '- 28차시는 기획·제작, 29차시는 다른 모둠에 시범 공유·실제 반응 기록·보완으로 운영합니다.',
           '- 30차시는 자료를 새로 만들기보다 근거를 들어 발표하고 제안과 실천을 다듬습니다.',
           '- AI는 선택적인 질문·근거 확인 도구로 사용합니다. 활동을 대신하는 별도 단계로 두지 않습니다.',
           '- 관찰한 인구 현상, 정책 원문의 사실, 학생의 제안, 실제 반응, 기대 효과를 구분합니다.',
           '- 26차시의 국가기관·권력분립 기준은 실제 인구문제 탐구와 맞지 않아 기존 23차시의 [6사12-02]를 지역 문제에 적용하는 흐름으로 연결했습니다.',
           '- 30차시의 문장 성분·표현 효과 기준은 발표 활동과 맞지 않아 기존 28~29차시의 [6국06-03]을 제작 자료의 공유·반응 반영까지 이어 적용했습니다.',
           '- 27차시 [6국03-02], 28~29차시 [6국06-03]은 유지합니다. 평가 기준은 차시별 목표와 산출물에 맞춰 구분합니다.',
           '', '## 차시별 지도 내용', '']
for unit in SPEC['lessons']:
    review += [f"### {unit['group']}차시 · {unit['title']}", '', unit['objective'], '',
               by_number[unit['standardFrom']]['standard'], '']
    for label, stage in zip(labels, unit['stages']):
        review += [f'**{label[0]} {label[1]}**', ''] + [line + '\\' for line in stage['activities']] + ['']
        review += [line + '\\' for line in stage['notes']] + ['']
    review += ['평가: ' + unit['assessment'][0], '']
(ROOT / '추가자료/2026_인구교육_26~30차시_개정본/26~30차시_수업정선안.md').write_text('\n'.join(review), encoding='utf-8')
print('Prepared native guide and common-plan candidates; updated app lessons 26-30 and review document.')
