#!/usr/bin/env python3
"""Làm mới dữ liệu Gốc từ vault Obsidian.

Cách dùng:
    python3 scripts/build_goc.py ~/Documents/Brain/"10 Lẽ Thật"

Đọc mọi ghi chú .md trong thư mục, lấy các phần đã chuẩn hoá:
  ## Tóm tắt (gạch đầu dòng), **Vì sao quan trọng:**, **Hình dung:**, ## Tự kiểm tra (callout [!question]-).
Rồi cập nhật data/goc/lessons.json và data/goc/rootlets.json.

Giữ nguyên những gì viết tay: rễ phụ thuộc bài EA nào (lessons[*].roots), câu thí luyện
(data/goc/questions.json) và câu Kinh Thánh (data/bible/keyverses.json).
Ghi chú mới chưa được gắn vào bài EA nào sẽ được liệt kê để bạn tự gắn.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GOC = ROOT / "data" / "goc"
# Notion đánh số lệch một bậc ở một bài: "EA 31" là bài 4.1.
ALIASES = {"31": "4.1"}


def clean(s):
    s = re.sub(r"\*\*|__", "", s)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


def section(text, name):
    m = re.search(rf"^## {re.escape(name)}\s*\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1) if m else ""


def field(text, label):
    m = re.search(rf"\*\*{re.escape(label)}:\*\*\s*(.+)", text)
    return clean(m.group(1)) if m else ""


def parse(path):
    t = path.read_text(encoding="utf-8")
    tom = section(t, "Tóm tắt")
    y = [clean(re.sub(r"^\s*[-*]\s+", "", l)) for l in tom.splitlines() if re.match(r"^\s*[-*]\s+", l)]
    qa, cur = [], None
    for line in section(t, "Tự kiểm tra").splitlines():
        m = re.match(r"^>\s*\[!question\]-?\s*(.+)", line)
        if m:
            cur = [m.group(1).strip(), ""]; qa.append(cur)
        elif cur is not None and line.startswith(">"):
            cur[1] = (cur[1] + " " + line.lstrip("> ").strip()).strip()
        elif not line.strip():
            cur = None
    qa = [[clean(a), clean(b)] for a, b in qa]
    return {"y": y, "why": field(tom, "Vì sao quan trọng"), "img": field(tom, "Hình dung"), "qa": qa}


def ea_id(stem):
    m = re.match(r"^EA\s+(\d+(?:\.\d+)?)\s+(.*)$", stem)
    if not m:
        return None, None
    n = ALIASES.get(m.group(1), m.group(1))
    return (n, m.group(2).strip()) if "." in n else (None, None)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    vault = Path(sys.argv[1]).expanduser()
    lessons = json.loads((GOC / "lessons.json").read_text(encoding="utf-8"))
    rootlets = json.loads((GOC / "rootlets.json").read_text(encoding="utf-8"))
    owner = {t: lid for lid, l in lessons.items() for t in l["roots"]}
    seen, new_notes = set(), []

    for p in sorted(vault.rglob("*.md")):
        lid, title = ea_id(p.stem)
        data = parse(p)
        if lid:
            l = lessons.setdefault(lid, {"id": lid, "roots": []})
            l.update(data, title=title, file=p.stem)
            seen.add(p.stem)
        elif p.stem in owner:
            rootlets[p.stem] = {**data, "lesson": owner[p.stem]}
            seen.add(p.stem)
        else:
            new_notes.append(p.stem)

    order = lambda k: tuple(int(x) for x in k.split("."))
    lessons = {k: lessons[k] for k in sorted(lessons, key=order)}
    (GOC / "lessons.json").write_text(json.dumps(lessons, ensure_ascii=False, indent=1), encoding="utf-8")
    (GOC / "rootlets.json").write_text(json.dumps(rootlets, ensure_ascii=False, indent=1), encoding="utf-8")

    q = json.loads((GOC / "questions.json").read_text(encoding="utf-8"))
    missing_q = [k for k in lessons if k not in q]
    print(f"Bài EA: {len(lessons)} · Rễ phụ: {len(rootlets)} · Đã đọc: {len(seen)} ghi chú")
    if missing_q:
        print("Bài EA chưa có câu thí luyện trong questions.json:", ", ".join(missing_q))
    if new_notes:
        print("Ghi chú chưa gắn vào bài EA nào (thêm tên vào lessons.json → roots):")
        for n in new_notes:
            print("  -", n)


if __name__ == "__main__":
    main()
