"""Reorder complete HWPX lesson tables while preserving all formatting and assets."""
from pathlib import Path
from lxml import etree as E
import zipfile, re, json, copy, shutil

source=next(Path('추가자료/보관/원본지도안').glob('*수정전.hwpx'))
output=Path('추가자료/보관/이전초안/프로젝트교환')/source.name.replace('_수정전','_순서수정')
output.parent.mkdir(parents=True,exist_ok=True)
plan_source=next(Path('추가자료/공통자료').glob('*논의*.hwpx'))
public=Path('public/materials'); public.mkdir(parents=True,exist_ok=True)
Path('src').mkdir(exist_ok=True)
hp='http://www.hancom.co.kr/hwpml/2011/paragraph'
def text(node): return ''.join(node.xpath('.//*[local-name()="t"]/text()')).strip()
def paras(node):
    result=[]
    for p in node.xpath('.//*[local-name()="p"]'):
        s=''.join(p.xpath('./*[local-name()="run"]/*[local-name()="t"]/text()')).strip()
        if s: result.append(s)
    return result

with zipfile.ZipFile(source) as z:
    raw=z.read('Contents/section0.xml')
    root=E.fromstring(raw)
    original=list(root)
    assert len(original)==54
    lessons=[]; order=[]; report=[]
    for ix in list(range(0,18,2))+list(range(34,54,2))+list(range(18,34,2)):
        title, block=original[ix:ix+2]
        table=block.xpath('.//*[local-name()="tbl"]')[0]
        rows=table.xpath('./*[local-name()="tr"]')
        old=text(rows[0][-1]); nums=[int(n) for n in re.findall(r'\d+',old.split('/')[0])]
        project=1 if nums[0]<=10 else 3 if nums[0]<=20 else 2
        delta=0 if project==1 else 10 if project==3 else -10
        mapped=[n+delta for n in nums]
        new='~'.join(map(str,mapped))+'/30'
        for t in rows[0][-1].xpath('.//*[local-name()="t"]'): t.text=new
        # Project numerals are images, not ordinary text. Swap their references too.
        for img in rows[0][1].xpath('.//*[local-name()="img"]'):
            if project>1: img.set('binaryItemIDRef','image9' if project==2 else 'image10')
        for t in rows[0][1].xpath('.//*[local-name()="t"]'):
            if re.fullmatch(r'프로젝트\s*\d*',t.text or ''): t.text='프로젝트 '
        project_title=text(rows[0][1]).replace('프로젝트','',1).strip()
        topic=text(rows[1][1]); content=text(rows[2][1]); objective=text(rows[3][1]); standard=text(rows[4][1])
        full=paras(table)
        lesson={ 'project':project, 'projectTitle':project_title,'topic':topic,'title':content,'objective':objective,'standard':standard,'group':'~'.join(map(str,mapped)), 'detail':full }
        for n in range(mapped[0],mapped[-1]+1): lessons.append(dict(lesson,id=str(n),number=n,localNumber=n-(project-1)*10))
        order.extend([title,block]); report.append(f'프로젝트 {project} | {old} → {new} | {content}')
    root[:]=order
    # Existing top-level page boundaries travel with the lesson, including original section setup.
    modified=E.tostring(root,encoding='UTF-8',xml_declaration=True)
    preview='\n'.join(s for p in root for s in paras(p))
    with zipfile.ZipFile(output,'w') as dest:
        for info in z.infolist():
            data=modified if info.filename=='Contents/section0.xml' else preview.encode('utf-8') if info.filename=='Preview/PrvText.txt' else z.read(info.filename)
            dest.writestr(info,data)
    assert len(lessons)==30 and [x['number'] for x in lessons]==list(range(1,31))
    # Structural verification: all 27 source tables and 30 periods are retained.
    with zipfile.ZipFile(output) as dest:
        dest.testzip(); check=E.fromstring(dest.read('Contents/section0.xml'))
        assert len(check)==54
        assert len(check.xpath('.//*[local-name()="tbl"]'))==len(root.xpath('.//*[local-name()="tbl"]'))
    # Original downloads are published to Storage separately; no Hosting copies.
    # Scheduler labels follow the newer project plan, not the older detailed guide.
    with zipfile.ZipFile(plan_source) as plan:
        planroot=E.fromstring(plan.read('Contents/section0.xml'))
        project=0
        carried={}; group=''
        from PIL import Image
        import io
        Path('public/images').mkdir(exist_ok=True)
        for asset in plan.namelist():
            if asset.startswith('BinData/'):
                Image.open(io.BytesIO(plan.read(asset))).save(Path('public/images')/('plan-'+Path(asset).stem+'.png'))
        for row in planroot.xpath('.//*[local-name()="tbl"]/*[local-name()="tr"]'):
            nodes={int(c.xpath('./*[local-name()="cellAddr"]/@colAddr')[0]):c for c in row}
            cells={k:text(c) for k,c in nodes.items()}
            if cells.get(0,'').startswith('프로젝트') and cells.get(0)!='프로젝트 주제': project+=1
            if project and 3 in cells and re.fullmatch(r'\d+(~\d+)?',cells.get(4,'')):
                nums=[int(n) for n in cells[4].split('~')]
                if 2 in cells: group=f'{project}-{nums[0]}'
                for k in [1,2,5,6,7]:
                    if k in cells: carried[k]={'text':'\n'.join(paras(nodes[k])),'images':nodes[k].xpath('.//*[local-name()="img"]/@binaryItemIDRef')}
                for n in range(nums[0],nums[-1]+1):
                    l=lessons[(project-1)*10+n-1]
                    l['sourceTitle']=l['title'];l['title']=re.sub(r'\(공개수업 후보\d\)','',cells[3]).strip()
                    l['publicClassCandidate']=1 if '후보1' in cells[3] else 2 if '후보2' in cells[3] else 0
                    l['planGroup']=group
                    l['planCells']={str(k):v for k,v in carried.items()}
    Path('src/curriculum.json').write_text(json.dumps(lessons,ensure_ascii=False,indent=2),encoding='utf-8')
    (output.parent/'차시_변경내역.txt').write_text('\n'.join(report),encoding='utf-8')
    print('Corrected HWPX verified: 27 lesson tables, 30 periods; original retained.')
