"""data/questions.xlsx を src/data/questions.json に変換する。

使い方: python3 scripts/xlsx_to_json.py
Excel の列: 段階 / 項目番号 / 問題番号 / 問題 / 回答 / 解説
"""
import json
import re
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "questions.xlsx"
DST = ROOT / "src" / "data" / "questions.json"

# 項目番号ごとの見出し（教習項目の内容から命名）
TITLES = {
    "1-1": "運転者の心得",
    "1-2": "信号に従うこと",
    "1-3": "標識・標示に従うこと",
    "1-4": "車が通るところ",
    "1-5": "緊急自動車・路線バスの優先",
    "1-6": "交差点の通行",
    "1-7": "速度と停止距離",
    "1-8": "歩行者の保護",
    "1-9": "安全確認と合図",
    "1-10": "進路変更・横断・転回",
    "1-11": "追い越し",
    "1-12": "行き違い",
    "1-13": "運転免許制度",
    "1-14": "オートマチック車の運転",
    "2-4": "危険予測と他の交通への配慮",
    "2-5": "運転者の性格と安全運転",
    "2-6": "人の能力と運転",
    "2-7": "車の特性と自然の力",
    "2-8": "夜間・悪条件下の運転",
    "2-9": "交通事故の実態",
    "2-10": "点検と整備",
    "2-11": "駐車と停車",
    "2-12": "乗車と積載",
    "2-13": "故障車のけん引",
    "2-14": "交通事故のとき",
    "2-15": "車の保守管理",
    "2-16": "経路の設計",
    "2-17": "高速道路での運転",
    "kari-A": "仮免テスト A",
    "kari-B": "仮免テスト B",
    "hon": "本免テスト",
}

# 図・標識の画像が前提になっている問題（画像は Excel に含まれない）
FIGURE = re.compile(
    r"図|この(?:標識|標示|信号|手信号|補助標識|灯火)|このような(?:手信号|標識|標示|信号|路側帯)|左の標識|右の標識"
)


def category_key(stage, item):
    if stage == "仮免":
        return "kari-A" if "A" in str(item) else "kari-B"
    if stage == "本免":
        return "hon"
    return f"{int(stage)}-{int(item)}"


def main():
    ws = openpyxl.load_workbook(SRC).active
    categories = {}
    questions = []
    for stage, item, num, text, answer, note in ws.iter_rows(min_row=2, values_only=True):
        if not text:
            continue
        cat = category_key(stage, item)
        group = {"仮免": "kari", "本免": "hon"}.get(stage, f"s{stage}")
        if cat not in categories:
            categories[cat] = {
                "id": cat,
                "group": group,
                "no": None if group in ("kari", "hon") else int(item),
                "title": TITLES.get(cat, str(item)),
                "count": 0,
            }
        categories[cat]["count"] += 1
        n = int(re.sub(r"\D", "", str(num)))
        text = str(text).strip()
        q = {
            "id": f"{cat}-{n}",
            "cat": cat,
            "n": n,
            "q": text,
            "a": answer.strip() != "×",
        }
        if note and str(note).strip():
            q["e"] = str(note).strip()
        if FIGURE.search(text):
            q["fig"] = True
        questions.append(q)

    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_text(
        json.dumps({"categories": list(categories.values()), "questions": questions}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"{len(questions)} questions / {len(categories)} categories -> {DST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
