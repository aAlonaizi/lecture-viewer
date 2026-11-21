# Copied unchanged from aAlonaizi/vendnations-platform@c7d8106 receipt_worker/convert.py
# Renders HEIC/PDF/images to bounded PNG pages so they can be read.
"""Bounded local document rendering. Invocation contains only local generated paths."""
import sys
from pathlib import Path


def convert_command(paths, directory):
    return [sys.executable, str(Path(__file__).resolve()), str(directory), *map(str, paths)]


def convert(paths, directory):
    import warnings
    from PIL import Image, ImageOps
    Image.MAX_IMAGE_PIXELS = 40_000_000
    warnings.simplefilter('error', Image.DecompressionBombWarning)
    page = 0

    def save(image):
        nonlocal page
        page += 1
        if page > 10:
            raise ValueError('Too many pages')
        image.thumbnail((2400, 3200))
        image.convert('RGB').save(directory / f'page-{page:02}.png')

    for path in paths:
        if path.suffix == '.pdf':
            import pypdfium2
            with pypdfium2.PdfDocument(path) as pdf:
                if len(pdf) + page > 10:
                    raise ValueError('Too many pages')
                for source in pdf:
                    width, height = source.get_size()
                    scale = min(2.5, 2400 / max(width, 1), 3200 / max(height, 1))
                    bitmap = source.render(scale=scale)
                    save(bitmap.to_pil())
                    bitmap.close()
                    source.close()
        else:
            if path.suffix in ('.heic', '.heif'):
                from pillow_heif import register_heif_opener
                register_heif_opener()
            with Image.open(path) as image:
                if getattr(image, 'n_frames', 1) != 1:
                    raise ValueError('Use single-frame images')
                save(ImageOps.exif_transpose(image))


if __name__ == '__main__':
    import os
    import resource
    os.umask(0o077)
    resource.setrlimit(resource.RLIMIT_CPU, (60, 60))
    resource.setrlimit(resource.RLIMIT_FSIZE, (30 * 1024 * 1024, 30 * 1024 * 1024))
    # macOS does not reliably enforce RLIMIT_AS; page/pixel/file and wall-time limits remain.
    if sys.platform != 'darwin':
        resource.setrlimit(resource.RLIMIT_AS, (1024 ** 3, 1024 ** 3))
    convert([Path(p) for p in sys.argv[2:]], Path(sys.argv[1]))
