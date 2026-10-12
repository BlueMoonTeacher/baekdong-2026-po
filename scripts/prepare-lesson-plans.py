"""Split the supplied guide into lesson PDFs and render browser page previews.

Requires pypdf, Pillow and pdftoppm. The source PDF is never modified.
Shared lessons keep their original shared guide, including assessment pages.
"""
from pathlib import Path
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter, Transformation

sys.stdout.reconfigure(encoding="utf-8")
root = Path(__file__).resolve().parent.parent
source = root / "public/materials/lesson-plan.pdf"
destination = root / "public/materials/lesson-plans"
scratch = root / "tmp/pdfs/lesson-plans"
output = root / "output/pdf"
renderer = shutil.which("pdftoppm")
if not renderer:
    raise RuntimeError("pdftoppm (Poppler) is required to render the page images.")
reader = PdfReader(source)
texts = [page.extract_text() or "" for page in reader.pages]
header = "인구교육프로젝트교수·학습과정안(6학년)"
is_header = lambda text: "".join(text.split()) == header
lessons = json.loads((root / "src/curriculum.json").read_text(encoding="utf-8"))
groups = list(dict.fromkeys(lesson["group"] for lesson in lessons))
starts = []
for index, text in enumerate(texts):
    match = re.search(r"차시\s*(\d+(?:\s*~\s*\d+)?)\s*/\s*30", text[:300])
    if match:
        start = index - 1 if index and is_header(texts[index - 1]) else index
        starts.append((start, re.sub(r"\s+", "", match[1])))
assert [group for _, group in starts] == groups, "PDF periods do not match the curriculum."
assert starts[0][0] == 0
for directory in [destination, scratch, output]:
    directory.mkdir(parents=True, exist_ok=True)

manifest = {}
for position, (start, group) in enumerate(starts):
    end = starts[position + 1][0] if position + 1 < len(starts) else len(reader.pages)
    lesson = next(item for item in lessons if item["group"] == group)
    slug = "lesson-" + group.replace("~", "-").zfill(2)
    folder = destination / slug
    folder.mkdir(exist_ok=True)
    writer = PdfWriter()
    if is_header(texts[start]):
        # The supplied 28-29 guide has a heading-only orphan page. Place that
        # heading above the following table instead of opening on an empty sheet.
        first = deepcopy(reader.pages[start + 1])
        first.merge_transformed_page(reader.pages[start], Transformation().translate(ty=50))
        writer.add_page(first)
        body_start = start + 2
    else:
        body_start = start
    for index in range(body_start, end):
        writer.add_page(reader.pages[index])
    name = f"인구교육_프로젝트{lesson['project']}_{group}차시_지도안.pdf"
    pdf = folder / "guide.pdf"
    writer.add_metadata({"/Title": name.removesuffix(".pdf"), "/Subject": lesson["title"]})
    with pdf.open("wb") as stream:
        writer.write(stream)
    check = PdfReader(pdf)
    normalize = lambda text: Counter(character for character in text if not character.isspace())
    assert normalize("".join(page.extract_text() or "" for page in check.pages)) == normalize("".join(texts[start:end])), f"Lost source text: {group}"
    manifest[group] = {
        "id": slug, "type": "지도안", "project": lesson["project"],
        "lessonRange": group, "lessonIds": [str(item["number"]) for item in lessons if item["group"] == group],
        "name": name, "staticPath": f"/materials/lesson-plans/{slug}/guide.pdf",
        "pageCount": len(check.pages), "sourcePages": list(range(start + 1, end + 1)),
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "previewImages": [f"/materials/lesson-plans/{slug}/page-{number}.webp" for number in range(1, len(check.pages) + 1)],
    }

def render(entry):
    group, guide = entry
    folder = root / "public" / guide["staticPath"].lstrip("/")
    prefix = scratch / guide["id"]
    subprocess.run([renderer, "-r", "144", "-png", str(folder), str(prefix)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    pngs = sorted(scratch.glob(f"{guide['id']}-*.png"))
    assert len(pngs) == guide["pageCount"]
    for png, url in zip(pngs, guide["previewImages"]):
        with Image.open(png) as image:
            image.convert("RGB").save(root / "public" / url.lstrip("/"), "WEBP", quality=94)
    return [(png, group, index + 1) for index, png in enumerate(pngs)]

with ThreadPoolExecutor(max_workers=4) as workers:
    rendered = [page for pages in workers.map(render, manifest.items()) for page in pages]
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 18) if sys.platform == "win32" else ImageFont.load_default()
for start in range(0, len(rendered), 9):
    contact = Image.new("RGB", (960, 1455), "#dce5e8")
    draw = ImageDraw.Draw(contact)
    for slot, (png, group, number) in enumerate(rendered[start:start + 9]):
        x, y = slot % 3 * 320, slot // 3 * 485
        draw.text((x + 10, y + 5), f"Lesson {group}, page {number}", font=font, fill="#163d50")
        with Image.open(png) as image:
            image.thumbnail((300, 450))
            contact.paste(image, (x + 10, y + 28))
    contact.save(scratch / f"contact-{start // 9 + 1:02}.jpg", quality=94)

(root / "src/lesson-plan-previews.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
with zipfile.ZipFile(output / "차시별_지도안_PDF.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for guide in manifest.values():
        archive.write(root / "public" / guide["staticPath"].lstrip("/"), guide["name"])
assert len(manifest) == 27 and sum(len(guide["lessonIds"]) for guide in manifest.values()) == 30
print(f"Verified {len(manifest)} lesson PDFs covering 30 periods; rendered {len(rendered)} page images.")
