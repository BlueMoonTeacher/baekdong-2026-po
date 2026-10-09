"""Split the supplied HWPX at worksheet boundaries, retaining native shapes/tables.

Run from the repository root. Shared worksheets stay shared; no lesson content is
invented for missing periods. Source files are never modified.
"""
from pathlib import Path
from copy import deepcopy
from lxml import etree as E
import hashlib
import json
import re
import shutil
import sys
import zipfile

sys.stdout.reconfigure(encoding='utf-8')
folder = Path('추가자료/2차년도 활동지')
source = next(folder.glob('[[]서식4]*교환.hwpx'))
output = folder / '차시별 활동지'
output.mkdir(exist_ok=True)
HP = 'http://www.hancom.co.kr/hwpml/2011/paragraph'
OPF = 'http://www.idpf.org/2007/opf/'

def text(node):
    return ''.join(node.xpath('.//*[local-name()="t"]/text()'))

def xml(node):
    return E.tostring(node, encoding='UTF-8', xml_declaration=True, standalone=True)

def blank(node):
    return not text(node).strip() and not node.xpath('.//*[local-name()="tbl" or local-name()="pic" or local-name()="container" or local-name()="rect" or local-name()="ctrl"]')

digest = hashlib.sha256(source.read_bytes()).hexdigest()
entries = []
with zipfile.ZipFile(source) as original:
    root = E.fromstring(original.read('Contents/section0.xml'))
    paragraphs = []
    for node in root:
        # Lesson 9's floating heading is anchored in lesson 7's body paragraph.
        # Separate the native controls, without rebuilding either shape/table.
        containers = node.xpath('./hp:run/hp:container', namespaces={'hp': HP})
        heading = next((c for c in containers if '(9/30)' in text(c)), None)
        if heading is not None and '양성평등' in text(node):
            body, title = deepcopy(node), deepcopy(node)
            for c in body.xpath('./hp:run/hp:container', namespaces={'hp': HP}):
                if '(9/30)' in text(c): c.getparent().remove(c)
            for table in title.xpath('./hp:run/hp:tbl', namespaces={'hp': HP}):
                table.getparent().remove(table)
            paragraphs.extend([body, title])
        else:
            paragraphs.append(deepcopy(node))
    assert ''.join(map(text, paragraphs)) == text(root)
    boundaries = []
    for index, node in enumerate(paragraphs):
        matches = re.findall(r'\((\d+(?:~\d+)?)/(?:(?:30)|(?:10))\)', text(node))
        if matches:
            assert len(matches) == 1, f'Ambiguous worksheet at paragraph {index}'
            boundaries.append((index, matches[0], False))
    assert boundaries[0][0] == 0 and len(boundaries) == 22
    setup = deepcopy(paragraphs[0][0])
    assert setup.find(f'{{{HP}}}secPr') is not None
    all_tables = 0
    split_tables = 0
    for position, (start, period, inferred) in enumerate(boundaries):
        end = boundaries[position + 1][0] if position + 1 < len(boundaries) else len(paragraphs)
        selected = [deepcopy(p) for p in paragraphs[start:end]]
        while len(selected) > 1 and blank(selected[-1]):
            selected.pop()
        section = deepcopy(root)
        section[:] = selected
        selected[0].set('pageBreak', '0')
        selected[0].set('columnBreak', '0')
        if not section.xpath('.//*[local-name()="secPr"]'):
            selected[0].insert(0, deepcopy(setup))
        assert len(section.xpath('.//*[local-name()="secPr"]')) == 1
        first, *last = map(int, period.split('~'))
        lesson_ids = [str(n) for n in range(first, (last[0] if last else first) + 1)]
        project = (first - 1) // 10 + 1
        name = f'인구교육 프로젝트{project} 활동지(6학년) - {period}차시.hwpx'
        target = output / name
        note = period + '차시 활동지' if last else '차시별 활동지'
        if inferred:
            note += ' · 원본 차시 표기 없음: 현행 9차시 내용과 대조하여 연결'
        if period == '21~22':
            note += ' · 21차시 학교 변화 자료는 별도 보완 필요'
        if period == '23~25':
            note += ' · 24~25차시 포스터 제작 활동은 별도 보완 필요'
        # Only retain assets referenced by this worksheet or its style header.
        header = E.fromstring(original.read('Contents/header.xml'))
        refs = set(section.xpath('.//@binaryItemIDRef') + header.xpath('.//@binaryItemIDRef'))
        package = E.fromstring(original.read('Contents/content.hpf'))
        manifest = package.find(f'{{{OPF}}}manifest')
        removed_assets = set()
        for item in list(manifest):
            if item.get('href', '').startswith('BinData/') and item.get('id') not in refs:
                removed_assets.add(item.get('href'))
                manifest.remove(item)
        package.find(f'{{{OPF}}}metadata/{{{OPF}}}title').text = name.removesuffix('.hwpx')
        settings = E.fromstring(original.read('settings.xml'))
        caret = settings.xpath('.//*[local-name()="CaretPosition"]')[0]
        caret.set('listIDRef', '0'); caret.set('paraIDRef', selected[0].get('id')); caret.set('pos', '0')
        replacements = {
            'Contents/section0.xml': xml(section),
            'Contents/content.hpf': xml(package),
            'settings.xml': xml(settings),
            'Preview/PrvText.txt': '\n'.join(text(p) for p in selected).encode('utf-8'),
        }
        with zipfile.ZipFile(target, 'w') as dest:
            for info in original.infolist():
                # The original thumbnail depicts lesson 1 and would mislabel all
                # other files. HWPX text previews remain available.
                if info.filename in removed_assets or info.filename == 'Preview/PrvImage.png':
                    continue
                dest.writestr(deepcopy(info), replacements.get(info.filename, original.read(info.filename)))
        if period == '1':
            reference = folder / '인구교육 프로젝트1 활동지(6학년) - 1차시.hwpx'
            with zipfile.ZipFile(reference) as ref:
                assert text(E.fromstring(ref.read('Contents/section0.xml'))) == text(section)
            shutil.copy2(reference, target)
        with zipfile.ZipFile(target) as check:
            assert check.testzip() is None
            result = E.fromstring(check.read('Contents/section0.xml'))
            assert text(result) == text(section), f'Content changed: {name}'
            table_count = len(section.xpath('.//*[local-name()="tbl"]'))
            assert len(result.xpath('.//*[local-name()="tbl"]')) == table_count
            package_check = E.fromstring(check.read('Contents/content.hpf'))
            for href in package_check.xpath('.//*[local-name()="item"]/@href'):
                assert href in check.namelist(), f'Missing package member: {href}'
            asset_ids = set(package_check.xpath('.//*[local-name()="item"]/@id'))
            assert set(result.xpath('.//@binaryItemIDRef')) <= asset_ids
            assert len(result.xpath('.//*[local-name()="secPr"]')) == 1
            split_tables += table_count
        entries.append(dict(file=name, project=project, lessonId=lesson_ids[0],
                            lessonIds=lesson_ids, lessonRange=period, type='활동지',
                            description=note, sourceParagraphs=[start, end - 1],
                            inferredLesson=inferred))
    all_tables = len(root.xpath('.//*[local-name()="tbl"]'))
    assert split_tables == all_tables, 'Some source tables were lost or duplicated'

entries.sort(key=lambda row: int(row['lessonId']))
covered = {int(n) for row in entries for n in row['lessonIds']}
assert len(covered) == 26
assert hashlib.sha256(source.read_bytes()).hexdigest() == digest
(output / '등록목록.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
report = '''# 활동지와 현행 수업 계획 대조

통합 원본과 기존 1차시 파일은 그대로 보관했습니다. 활동지 22개를 분리하여 총 26차시에 연결합니다. 21~22, 23~25, 28~29차시는 원본 공통 활동지를 유지합니다. 파일명과 웹앱 표시는 전체 30차시 기준입니다(프로젝트 2 = 11~20, 프로젝트 3 = 21~30).

## 확인·보완이 필요한 부분

- **프로젝트 1 / 3~4, 8, 10차시:** 해당 차시의 독립 활동지가 원본에서 확인되지 않습니다. 자료를 새로 만들어 넣거나 다른 차시 파일을 복제하지 않았습니다.
- **프로젝트 1 / 9차시:** 제목 도형이 앞선 7차시 본문과 같은 문단에 삽입되어 있었습니다. 제목 도형과 7차시 표를 분리하여, 9차시 제목과 만화 구상·친구 피드백 표를 하나의 파일로 묶었습니다. 10차시 웹툰 디자인 활동은 별도로 확인되지 않습니다.
- **프로젝트 1 / 5~7차시:** 원본 머리말이 5/10, 6/10, 7/10으로 되어 있습니다. 내용과 서식을 유지했으며 웹앱과 파일명은 전체 차시 기준으로 연결했습니다. 5차시 자료에는 성차별 사례 분석도 포함되어 6차시 활동과 일부 겹칩니다.
- **프로젝트 1 / 6차시:** 성차별 사례 활동은 있으나 현행 계획의 디지털 성폭력 예방 메시지 활동은 확인되지 않습니다.
- **프로젝트 3 / 21~22차시:** 활동지는 대한민국·해외 및 시도별 인구 통계를 다룹니다. 현행 22차시와 연결되지만, 21차시의 우리 학교 변화 데이터 조사 항목은 없습니다.
- **프로젝트 3 / 23~25차시:** 저출산·고령화 정책과 해외 대책 조사·토의는 있습니다. 현행 24~25차시의 포스터 제작 항목은 없습니다. 공통 자료로 연결하되 포스터 제작 안내의 보완이 필요합니다.
- **프로젝트 3 / 26차시:** 활동지는 ‘양산시 인구정책 탐험대’ 명칭과 ‘누구를 위한 정책일까요? / 어떤 분야일까요?’ 필터를 안내합니다. 현재 ‘양산 인구 탐험’ 화면의 명칭·조작 방식과 차이가 있어 안내 문구 확인이 필요합니다.

프로젝트 2의 11~20차시는 현행 활동 순서와 맞습니다. 원본의 물리적 순서는 프로젝트 1→3→2지만, 분리 파일 및 자료실은 1→2→3 순서로 정리했습니다. PPT는 이번 작업에서 수정·등록하지 않았습니다.

## 분리 내역

| 프로젝트 | 전체 차시 | 파일 | 비고 |
|---|---|---|---|
'''
report += '\n'.join(f"| {r['project']} | {r['lessonRange']} | {r['file']} | {r['description']} |" for r in entries)
report += f'\n\n최소 검증: 22개 HWPX 압축 무결성, XML 구문, 전체 {all_tables}개 표 보존, 원본 텍스트 일치, 이미지 참조 및 문서 섹션 설정을 확인했습니다. 한글 프로그램에서 인쇄 배치를 직접 확인한 것은 아닙니다.\n'
(output / '계획서_대조_결과.md').write_text(report, encoding='utf-8')
print(f'활동지 {len(entries)}개 / {len(covered)}차시 / 표 {all_tables}개 보존. 누락 차시: {sorted(set(range(1,31))-covered)}')
