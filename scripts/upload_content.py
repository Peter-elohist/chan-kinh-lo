#!/usr/bin/env python3
"""In ra SQL để cập nhật bảng public.content từ data/*.json.
Cách dùng:  python3 scripts/upload_content.py > /tmp/content.sql  rồi dán vào Supabase → SQL Editor → Run."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
FILES = {'tiers': 'data/goc/tiers.json', 'lessons': 'data/goc/lessons.json', 'rootlets': 'data/goc/rootlets.json',
         'questions': 'data/goc/questions.json', 'verses': 'data/bible/keyverses.json', 'topics': 'data/goc/topics.json', 'realms': 'data/realms.json'}
for k, p in FILES.items():
    s = json.dumps(json.load(open(ROOT / p, encoding='utf-8')), ensure_ascii=False, separators=(',', ':'))
    print(f"insert into public.content(key, body) values ('{k}', $cj${s}$cj$::jsonb) on conflict (key) do update set body = excluded.body, updated_at = now();")
