"""Render the exported 26/27 worksheet PDFs and refresh their reviewed entries."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / '추가자료/2026_인구교육_26~30차시_개정본/차시별 활동지'
WORK = ROOT / 'artifacts/policy-worksheet-refinement'
manifest_path = ROOT / '추가자료/수업자료등록목록.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
deliverables = ROOT / 'output/pdf'
deliverables.mkdir(parents=True, exist_ok=True)
for number, label in [(26, '웹앱_정책탐구'), (27, 'Gems_근거점검')]:
    pdf = next(FOLDER.glob(f'* - {number}차시.pdf'))
    assert len(PdfReader(pdf).pages) == 1
    prefix = WORK / f'worksheet-{number}'
    subprocess.run(['pdftoppm', '-scale-to', '1800', '-png', '-singlefile', str(pdf), str(prefix)],
                   check=True, capture_output=True)
    preview = FOLDER / f'미리보기/{number}-1.webp'
    with Image.open(prefix.with_suffix('.png')) as image:
        image.convert('RGB').save(preview, 'WEBP', quality=94)
    rows = [r for r in manifest['files'] if r['type'] == '활동지' and r['lessonIds'] == [str(number)]]
    assert len(rows) == 1
    rows[0].update(previewVersion=hashlib.sha256(pdf.read_bytes()).hexdigest()[:12],
                   description='웹앱에서 정책 탐구·자료명·연도·PDF 쪽수 기록' if number == 26
                   else '기존 전체 활동 유지 · Gems로 이유와 근거의 타당성 점검')
    shutil.copy2(pdf, deliverables / f'{number}차시_{label}_활동지.pdf')
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Refreshed 26/27 worksheet images, versioned previews, and review PDFs.')
