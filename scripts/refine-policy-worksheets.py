"""Refine existing 26/27 HWPX worksheets, retaining all activities and artwork.

Native Hancom export and preview rendering follow this preparation step.
Backups preserve the pre-edit originals in artifacts/policy-worksheet-refinement.
"""
from copy import deepcopy
from pathlib import Path
import json
import shutil
import zipfile
from lxml import etree as E

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / 'artifacts/policy-worksheet-refinement'
WORK.mkdir(parents=True, exist_ok=True)
FOLDER = ROOT / '추가자료/2026_인구교육_26~30차시_개정본/차시별 활동지'
HP = 'http://www.hancom.co.kr/hwpml/2011/paragraph'
NS = {'hp': HP}
q = lambda name: f'{{{HP}}}{name}'


def plain(p):
    return ''.join(p.xpath('./hp:run/hp:t/text()', namespaces=NS)).strip()


def replace_paragraph(p, value):
    nodes = p.xpath('./hp:run/hp:t', namespaces=NS)
    first = next((n for n in nodes if n.text and n.text.strip()), nodes[0])
    for node in nodes:
        node.text = value if node is first else None
    for cache in p.findall(q('linesegarray')):
        p.remove(cache)


serial = 3300000000
source_style = None


def source_cell(cell, values):
    global serial
    sub = cell.find(q('subList'))
    seed = deepcopy(sub.find(q('p')))
    for child in list(sub):
        sub.remove(child)
    for value in values:
        serial += 1
        paragraph = deepcopy(seed)
        paragraph.set('id', str(serial))
        if source_style is not None:
            paragraph.set('paraPrIDRef', source_style)
        replace_paragraph(paragraph, value)
        sub.append(paragraph)


manifest = []
report = []
for number in (26, 27):
    original = next(FOLDER.glob(f'* - {number}차시.hwpx'))
    before = WORK / ('before-' + original.name)
    if not before.exists():
        shutil.copy2(original, before)
    with zipfile.ZipFile(before) as archive:
        root = E.fromstring(archive.read('Contents/section0.xml'))
        paragraphs = [p for p in root.iter(q('p')) if plain(p)]
        original_texts = [plain(p) for p in paragraphs]
        tables = root.xpath('.//hp:tbl', namespaces=NS)
        before_tables = [(t.get('rowCnt'), t.get('colCnt')) for t in tables]
        edits = {
            26: {
                17: "웹앱 ‘양산시 인구 살펴보기’의 [6학년 수업] → [정책 찾기]에서 정책 3가지를 찾아봅시다. [자세히 읽기]에서 ‘활동지에 기록할 출처’를 옮겨 적고, 원문에서 지원 대상·조건을 확인해 봅시다.",
                22: '출처 (자료명·연도·PDF 쪽수)',
                23: '예) 2026년 + 임신·출산',
                24: '산후조리비용',
                25: '지원',
                26: '출산 가정의 산후조리비용 지원 (지원 조건은 원문에서 확인)',
                39: '웹앱의 정책 내용과 친구 의견을 바탕으로 더 나아질 점을 적어 봅시다.',
            },
            27: {
                16: '사람들을 설득할 이유와 근거를 2가지 이상 정리해 봅시다. Gems의 질문에 답하며 이유가 주장과 연결되는지, 근거가 사실이고 출처가 분명한지 점검해 봅시다.',
                21: '정책 자료명·연도·PDF 쪽수 확인',
                30: '짝꿍의 의견과 Gems의 점검을 바탕으로 이유·근거와 슬로건을 직접 고쳐 봅시다.',
                37: '예) 이 근거가 홍보 목적을 뒷받침하니? 출처로 확인한 뒤 문구를 고쳐 봐.',
            },
        }[number]
        for index, value in edits.items():
            report.append({'lesson': number, 'before': plain(paragraphs[index]), 'after': value})
            replace_paragraph(paragraphs[index], value)
        if number == 26:
            header = E.fromstring(archive.read('Contents/header.xml'))
            paragraph_properties = header.xpath('.//*[local-name()="paraProperties"]')[0]
            style = deepcopy(next(p for p in paragraph_properties if p.get('id') == '40'))
            source_style = str(max(int(p.get('id')) for p in paragraph_properties) + 1)
            style.set('id', source_style)
            for spacing in style.xpath('.//*[local-name()="lineSpacing"]'):
                spacing.set('value', '120')
            for alignment in style.xpath('./*[local-name()="align"]'):
                alignment.set('horizontal', 'LEFT')
            paragraph_properties.append(style)
            paragraph_properties.set('itemCnt', str(len(paragraph_properties)))
            table = tables[2]
            widths = [8595, 9161, 14319, 10900]
            for row in table.findall(q('tr'))[1:]:
                cells = row.findall(q('tc'))
                assert len(cells) == 4
                for column, cell in enumerate(cells):
                    cell.find(q('cellSz')).set('width', str(widths[column]))
            rows = table.findall(q('tr'))
            source_cell(rows[2][-1], [
                '2026 생애주기별', '인구정책 가이드북', '2026년 · PDF 26쪽'])
            for row in rows[3:]:
                source_cell(row[-1], ['자료명:', '', '연도:    년 · PDF    쪽'])
            assert 'NotebookLM' not in ''.join(root.xpath('.//hp:t/text()', namespaces=NS))
            assert 'Gems' not in ''.join(root.xpath('.//hp:t/text()', namespaces=NS))
        else:
            # Keep every untouched prompt and answer space in the five activities.
            for index, paragraph in enumerate(paragraphs):
                if index not in edits:
                    assert plain(paragraph) == original_texts[index]
        assert before_tables == [(t.get('rowCnt'), t.get('colCnt')) for t in tables]
        candidate = WORK / original.name
        replacements = {
            'Contents/section0.xml': E.tostring(root, encoding='UTF-8', xml_declaration=True),
            'Preview/PrvText.txt': '\n'.join(plain(p) for p in root.iter(q('p')) if plain(p)).encode('utf-8'),
        }
        if number == 26:
            replacements['Contents/header.xml'] = E.tostring(header, encoding='UTF-8', xml_declaration=True)
        with zipfile.ZipFile(candidate, 'w') as output:
            for info in archive.infolist():
                if info.filename != 'Preview/PrvImage.png':
                    output.writestr(deepcopy(info), replacements.get(info.filename, archive.read(info.filename)))
    manifest.append({'lesson': number, 'candidate': str(candidate), 'output': str(original)})

(WORK / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
(WORK / 'changes.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print('Prepared 26/27 worksheet candidates, preserving all activity tables and artwork.')
