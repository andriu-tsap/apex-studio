"""Create a portable source + static-preview archive, excluding dependencies and secrets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse
import hashlib
ROOT = Path(__file__).resolve().parents[1]
EXCLUDE = {'node_modules','.next','out','dist','.git','.turbo','.angular','__pycache__','.pytest_cache','playwright-report','test-results','release','.venv'}
parser = argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=ROOT/'release'/'apex-studio-complete.zip')
args = parser.parse_args()
args.output.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(args.output,'w',ZIP_DEFLATED,compresslevel=9) as archive:
    for file in sorted(ROOT.rglob('*')):
        rel = file.relative_to(ROOT)
        if any(part in EXCLUDE for part in rel.parts): continue
        if file.name.startswith('.env') and file.name != '.env.example': continue
        if file.name.endswith(('.tsbuildinfo','.zip')): continue
        if file.is_file(): archive.write(file,Path('apex-studio')/rel)
with ZipFile(args.output) as archive:
    assert archive.testzip() is None
print(args.output)
print('SHA256:',hashlib.sha256(args.output.read_bytes()).hexdigest())
print('Bytes:',args.output.stat().st_size)
