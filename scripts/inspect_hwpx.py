from pathlib import Path
import zipfile, xml.etree.ElementTree as ET

out = Path('source-text'); out.mkdir(exist_ok=True)
for path in Path('.').glob('*.hwpx'):
    with zipfile.ZipFile(path) as z:
        lines=[]
        for name in z.namelist():
            if name.startswith('Contents/section') and name.endswith('.xml'):
                root=ET.fromstring(z.read(name))
                for p in root.iter():
                    if p.tag.endswith('}p'):
                        # Only text of this paragraph; table children have their own paragraphs.
                        text=''.join(t.text or '' for r in list(p) if r.tag.endswith('}run') for t in list(r) if t.tag.endswith('}t'))
                        if text.strip(): lines.append(text)
        dest=out/(path.stem+'.txt'); dest.write_text('\n'.join(lines), encoding='utf-8')
        print(dest, len(lines))
