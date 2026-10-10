import json
from pathlib import Path
import pdfplumber

root = Path(__file__).resolve().parents[1]
pages = {}
for name in ['guide-2026', 'policy-2025']:
    with pdfplumber.open(root / 'public' / 'explore' / f'{name}.pdf') as pdf:
        pages[name] = {str(i + 1): page.extract_text() or '' for i, page in enumerate(pdf.pages)}
destination = root / 'artifacts' / 'policy-pages.json'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({name: len(rows) for name, rows in pages.items()}))
