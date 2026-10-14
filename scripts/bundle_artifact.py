#!/usr/bin/env python3
"""Gộp app thành một file HTML duy nhất để xem trước trong Claude (artifact).

Cách dùng:
    python3 scripts/bundle_artifact.py dist/chan-kinh-lo-goc.html

Bản gộp nhúng sẵn CSS, JS và dữ liệu (window.CKL_DATA), bỏ Supabase.
Điểm trong bản xem trước được lưu vào cơ sở dữ liệu của artifact.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "dist" / "chan-kinh-lo-goc.html")

read = lambda p: (ROOT / p).read_text(encoding="utf-8")
load = lambda p: json.loads(read(p))
data = {
    "tiers": load("data/goc/tiers.json"),
    "lessons": load("data/goc/lessons.json"),
    "rootlets": load("data/goc/rootlets.json"),
    "questions": load("data/goc/questions.json"),
    "verses": load("data/bible/keyverses.json"),
    "topics": load("data/goc/topics.json"),
    "realms": load("data/realms.json"),
}
safe = lambda s: s.replace("</script", "<\\/script")

html = read("index.html")
html = html.replace('<link rel="stylesheet" href="src/styles.css">', "<style>\n" + read("src/styles.css") + "\n</style>")
html = re.sub(r'<script src="src/config.js"></script>\s*', "", html)
html = re.sub(r'<script src="https://cdn.jsdelivr.net/npm/@supabase[^"]*"></script>\s*', "", html)
data_js = "window.CKL_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";"
import os
if os.environ.get("CKL_MUSIC_URL"):  # the preview's private music asset
    data_js += "window.CKL_MUSIC_URL=" + json.dumps(os.environ["CKL_MUSIC_URL"]) + ";"
html = html.replace('<script src="src/sound.js"></script>', "<script>" + safe(data_js) + "</script>\n<script src=\"src/sound.js\"></script>")
html = html.replace('<script src="src/fx.js"></script>', "<script>" + safe(read("src/fx.js")) + "</script>")
for f in ("sound", "exp", "mountain", "store", "ai", "app"):
    html = html.replace(f'<script src="src/{f}.js"></script>', "<script>" + safe(read(f"src/{f}.js")) + "</script>")

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"{out} · {len(html.encode()) // 1024} KB")
