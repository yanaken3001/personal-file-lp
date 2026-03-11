#!/usr/bin/env python3
"""
80タイプデータをWeb埋め込み用JavaScriptオブジェクトに変換するスクリプト
入力: パーソナルファイルデータ/extracted_data/80type_data.json
出力: 80type_web_data.js (HTMLに埋め込むためのJS定数)
"""
import json
import re
import os

INPUT_PATH = os.path.join(os.path.dirname(__file__), "パーソナルファイルデータ", "extracted_data", "80type_data.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "80type_web_data.js")

# シート名 → 性格類型コードのマッピング
SHEET_TO_CODE = {
    "AI型(ディリジェンサー)": "AI",
    "AA型（リサーチャー）": "AA",
    "AD型（アナリスト）": "AD",
    "AP型（プラクティショナー）": "AP",
    "DD型（イノベーター）": "DD",
    "DA型（ファシリテーター）": "DA",
    "DI型（プロモーター）": "DI",
    "DP型（リーダー）": "DP",
    "IA型（サポーター）": "IA",
    "ID型（シンカー）": "ID",
    "II型（ハーモナー）": "II",
    "IP型（コントリビューター）": "IP",
    "PA型（アルチザン）": "PA",
    "PD型（アントレプレナー）": "PD",
    "PI型（コラボレーター）": "PI",
    "PP型（エンターテイナー）": "PP",
}

# 性格類型コード → 名称
PERSONALITY_NAMES = {
    "PP": "エンターテイナー",
    "PA": "アルチザン",
    "PI": "コラボレーター",
    "PD": "アントレプレナー",
    "AP": "プラクティショナー",
    "AA": "リサーチャー",
    "AI": "ディリジェンサー",
    "AD": "アナリスト",
    "IP": "コントリビューター",
    "IA": "サポーター",
    "II": "ハーモナー",
    "ID": "シンカー",
    "DI": "プロモーター",
    "DP": "リーダー",
    "DA": "ファシリテーター",
    "DD": "イノベーター",
}

# 抽出するフィールドのマッピング (JSONのUnnamed:0の値 → JSのキー名)
FIELDS_MAP = {
    "類型の要約": "summary",
    "ユーザー側に\n表示する説明": "userDescription",
    "強み": "strengths",
    "弱み": "weaknesses",
    "特徴の箇条書き": "bulletPoints",
    "向いている作業\n見出し": "goodWorkTitle",
    "苦手な作業\n見出し": "badWorkTitle",
    "相性の良い社風\n見出し": "goodCultureTitle",
    "相性の悪い社風\n見出し": "badCultureTitle",
    "相性の良い上司\n見出し": "goodBossTitle",
    "相性の悪い上司\n見出し": "badBossTitle",
    "相性の良い部下\n見出し": "goodSubTitle",
    "相性の悪い部下\n見出し": "badSubTitle",
    "相性の良い働き方\n見出し": "goodWorkStyleTitle",
    "相性の悪い働き方\n見出し": "badWorkStyleTitle",
    "適した職種・職業": "suitableJobsTitle",
    "適した職種・職業\n説明": "suitableJobs",
    "未経験可の適職\n大カテゴリ": "entryJobCategories",
    "未経験可の適職": "entryJobs",
    "5つのキーワード": "keywords",
}

# 行動類型コードのマッピング
BEHAVIORAL_CODE = {
    "達成型": "K",
    "効率型": "E",
    "外見型": "G",
    "情報型": "J",
    "平和型": "H",
}

def parse_keywords(raw):
    """キーワード文字列をパースして配列にする"""
    if not raw or not isinstance(raw, str):
        return []
    keywords = []
    for line in raw.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        # "キーワード: 説明" or "キーワード：説明" の形式
        match = re.match(r'^(.+?)\s*[:：]\s*', line)
        if match:
            keywords.append(match.group(1).strip())
        else:
            keywords.append(line.strip())
    return keywords[:5]  # 最大5つ

def clean_text(text):
    """テキストの前後空白を除去"""
    if not text or not isinstance(text, str):
        return ""
    return text.strip()

def main():
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    types_80 = {}
    found_sheets = set()

    for sheet_name, rows in raw_data.items():
        # シート名からコードを特定
        code = None
        for pattern, c in SHEET_TO_CODE.items():
            if pattern in sheet_name or sheet_name in pattern:
                code = c
                found_sheets.add(c)
                break

        if not code:
            # 部分一致でもう一度試す
            for pattern, c in SHEET_TO_CODE.items():
                # コード部分だけで比較
                if c in sheet_name.upper().replace("型", "").replace("（", "").replace("）", "").replace("(", "").replace(")", ""):
                    code = c
                    found_sheets.add(c)
                    break

        if not code:
            print(f"WARNING: Unknown sheet name: {sheet_name}")
            continue

        personality_name = PERSONALITY_NAMES[code]

        # 行データをキーでインデックス化
        row_index = {}
        for row in rows:
            key = row.get("Unnamed: 0", "")
            if key in FIELDS_MAP:
                row_index[key] = row

        # 5つの行動類型それぞれについてデータを抽出
        behavioral_types = ["達成型", "効率型", "外見型", "情報型", "平和型"]

        for btype in behavioral_types:
            type_name = f"{btype}{personality_name}"
            col_key = f"{btype}{personality_name}"

            type_data = {
                "personalityCode": code,
                "personalityName": personality_name,
                "behavioralType": btype,
                "behavioralCode": BEHAVIORAL_CODE[btype],
            }

            for raw_key, js_key in FIELDS_MAP.items():
                row = row_index.get(raw_key)
                if row:
                    value = row.get(col_key, "")
                    if js_key == "keywords":
                        type_data[js_key] = parse_keywords(value)
                    else:
                        type_data[js_key] = clean_text(value)
                else:
                    if js_key == "keywords":
                        type_data[js_key] = []
                    else:
                        type_data[js_key] = ""

            # affiliateUrl はプレースホルダー
            type_data["affiliateUrl"] = ""

            types_80[type_name] = type_data

    # 検証
    print(f"Found {len(found_sheets)} personality type sheets: {sorted(found_sheets)}")
    print(f"Generated {len(types_80)} type entries")

    missing = set(PERSONALITY_NAMES.keys()) - found_sheets
    if missing:
        print(f"WARNING: Missing sheets for: {missing}")

    # データが空のタイプを報告
    empty_count = 0
    for name, data in types_80.items():
        if not data.get("summary"):
            print(f"  WARNING: Empty summary for {name}")
            empty_count += 1

    if empty_count:
        print(f"WARNING: {empty_count} types have empty summaries")

    # JS形式で出力
    js_output = "// Auto-generated from 80タイプ性格診断結果.xlsx\n"
    js_output += "// Generated by extract_80type_for_web.py\n"
    js_output += f"// Total types: {len(types_80)}\n\n"
    js_output += "const TYPES_80 = " + json.dumps(types_80, ensure_ascii=False, indent=2) + ";\n"

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(js_output)

    print(f"\nOutput written to: {OUTPUT_PATH}")
    print(f"File size: {os.path.getsize(OUTPUT_PATH) / 1024:.1f} KB")

if __name__ == "__main__":
    main()
