#!/usr/bin/env python3
"""
G8-R1-C+L · E/F/G — Sistema visual canónico Alux IA.

Generación MECÁNICA (sin IA, sin redibujo) de las derivadas autorizadas a
partir de las dos maestras transparentes. Determinista e idempotente:

  original (fuente gráfica Founder, inmutable)
    -> alux-ia-full-master-transparent.png     (limpieza de fondo)
    -> alux-ia-avatar-master-transparent.png   (limpieza de fondo)
        -> derivadas PNG / WebP / AVIF por tamaño

Prohibido: nuevas poses, recoloraciones, monocromos, contornos, fondos.
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / "public" / "brand" / "alux"
SRC_DIR = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-uploads")

SOURCES = {
    "original": "3a53f1cb-1510-4781-a42b-00554ba85468.jpeg",
    "full": "IMG_0550.png",
    "avatar": "IMG_0549.png",
}

FULL_SIZES = [96, 128, 192, 256, 384, 512]
AVATAR_SIZES = [32, 40, 44, 48, 64, 80, 96, 128, 192]
FORMATS = ("png", "webp", "avif")


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def to_transparent(path: pathlib.Path) -> Image.Image:
    """Elimina mecánicamente el fondo blanco conservando trazo y color."""
    img = Image.open(path).convert("RGBA")
    px = img.load()
    w, h = img.size
    # Flood fill desde los bordes: sólo el fondo continuo se vuelve
    # transparente. Los blancos interiores (ojo, dientes) se preservan.
    stack = [(x, y) for x in range(w) for y in (0, h - 1)]
    stack += [(x, y) for y in range(h) for x in (0, w - 1)]
    seen = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        if r < 235 or g < 235 or b < 235:
            continue
        px[x, y] = (r, g, b, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return img.crop(img.getbbox())


def square(img: Image.Image, size: int) -> Image.Image:
    """Escala preservando proporción y centra en lienzo cuadrado transparente."""
    c = img.copy()
    c.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(c, ((size - c.width) // 2, (size - c.height) // 2), c)
    return canvas


def emit(img: Image.Image, stem: str, size: int, records: list[dict]) -> None:
    frame = square(img, size)
    for fmt in FORMATS:
        target = OUT / fmt / f"{stem}-{size}.{fmt}"
        target.parent.mkdir(parents=True, exist_ok=True)
        if fmt == "png":
            frame.save(target, "PNG", optimize=True)
        elif fmt == "webp":
            frame.save(target, "WEBP", quality=92, method=6)
        else:
            frame.save(target, "AVIF", quality=70)
        records.append(
            {
                "role": "derivative",
                "family": stem,
                "size": size,
                "format": fmt,
                "path": f"/brand/alux/{fmt}/{target.name}",
                "bytes": target.stat().st_size,
                "sha256": sha256(target),
            }
        )


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []

    original_src = SRC_DIR / SOURCES["original"]
    original_dst = OUT / "source" / "alux-ia-source-original.jpeg"
    original_dst.parent.mkdir(parents=True, exist_ok=True)
    if not original_dst.exists():
        original_dst.write_bytes(original_src.read_bytes())
    records.append(
        {
            "role": "original",
            "path": "/brand/alux/source/alux-ia-source-original.jpeg",
            "provenance": "Fuente gráfica Founder — inmutable, nunca sobrescrita.",
            "bytes": original_dst.stat().st_size,
            "sha256": sha256(original_dst),
        }
    )

    masters = {
        "alux-ia-full": ("full", "alux-ia-full-master-transparent.png", FULL_SIZES),
        "alux-ia-avatar": ("avatar", "alux-ia-avatar-master-transparent.png", AVATAR_SIZES),
    }

    for stem, (key, master_name, sizes) in masters.items():
        img = to_transparent(SRC_DIR / SOURCES[key])
        master_path = OUT / "master" / master_name
        master_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(master_path, "PNG", optimize=True)
        records.append(
            {
                "role": "master",
                "family": stem,
                "path": f"/brand/alux/master/{master_name}",
                "provenance": (
                    "Limpieza/derivación mecánica de la fuente gráfica Founder. "
                    "Sin redibujo, sin IA, sin nuevas poses."
                ),
                "width": img.width,
                "height": img.height,
                "bytes": master_path.stat().st_size,
                "sha256": sha256(master_path),
            }
        )
        for size in sizes:
            emit(img, stem, size, records)

    manifest = {
        "id": "alux-ia-visual-system",
        "version": "1.0.0",
        "authorization": "G8-R1-C+L · Addendum Founder (secciones E–H)",
        "canonicalRoot": "/brand/alux/",
        "rules": [
            "Original inmutable; nunca se sobrescribe.",
            "Derivadas producidas mecánicamente desde las maestras.",
            "Prohibidas nuevas poses, monocromos, recoloraciones o fondos.",
            "No son fotografías turísticas ni medios documentales.",
            "Copia única: prohibido duplicar activos dentro de plantillas.",
        ],
        "assets": records,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"OK · {len(records)} activos registrados en {OUT / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
