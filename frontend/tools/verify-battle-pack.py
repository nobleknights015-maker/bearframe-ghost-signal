"""Independently verify exported PNG frame rectangles against source RGBA hashes."""
from PIL import Image
from pathlib import Path
from zipfile import ZipFile
import sys, json, hashlib, io
file = Path(sys.argv[1])
checked = pages = 0
with ZipFile(file) as archive:
    assert archive.testzip() is None
    for row in json.loads(archive.read('inventory.json')):
        role = row['role']
        metadata = json.loads(archive.read(role + '/metadata.json'))
        images = []
        for page in metadata['pages']:
            image = Image.open(io.BytesIO(archive.read(role + '/' + page['image']))).convert('RGBA')
            assert image.width <= 2048 and image.height <= 2048
            images.append(image)
            pages += 1
        assert len(metadata['frames']) == 480
        assert all(not clip['loop'] for name, clip in metadata['clipInfo'].items() if name != 'idle')
        for frame in metadata['frames']:
            x, y, w, h = (frame[k] for k in ('x', 'y', 'w', 'h'))
            crop = images[frame['page']].crop((x, y, x+w, y+h))
            assert hashlib.sha256(crop.tobytes()).hexdigest() == frame['pixelSha256']
            assert set(crop.getchannel('A').tobytes()) <= {0, 255}
            assert crop.getbbox()
            checked += 1
print(json.dumps(dict(status='PASS', framesRecomposed=checked, atlasPages=pages,
                     zipBytes=file.stat().st_size, zipSha256=hashlib.sha256(file.read_bytes()).hexdigest())))
