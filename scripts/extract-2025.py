import pdfplumber
from pathlib import Path
p=Path('수업 웹앱 프로젝트')
with pdfplumber.open(p/'2025-양산시-인구정책-시행계획.pdf') as d:
 (p/'source/policy-2025.txt').write_text('\n'.join(f'\n=== PDF {i+1}쪽 ===\n'+(x.extract_text() or '') for i,x in enumerate(d.pages)),encoding='utf8')
 print('2025 pages:',len(d.pages))
