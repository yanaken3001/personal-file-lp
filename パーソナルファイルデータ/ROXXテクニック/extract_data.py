import pandas as pd
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# ファイルパス
base_path = r'c:\Users\kogik\Desktop\personalfile\パーソナルファイルデータ'
output_path = os.path.join(base_path, 'extracted_data')
os.makedirs(output_path, exist_ok=True)

# 1. 80タイプ性格診断結果.xlsxの読み込み
print("=" * 50)
print("80タイプ性格診断結果.xlsx を分析中...")
print("=" * 50)

excel_file = os.path.join(base_path, '80タイプ性格診断結果.xlsx')
xl = pd.ExcelFile(excel_file)

print(f"\nシート数: {len(xl.sheet_names)}")
print("\nシート一覧:")
for i, sheet_name in enumerate(xl.sheet_names, 1):
    print(f"  {i}. {sheet_name}")

# 各シートの構造を確認
personality_types = {}
for sheet_name in xl.sheet_names:  # 全シートを処理
    df = pd.read_excel(excel_file, sheet_name=sheet_name)
    print(f"\n--- シート: {sheet_name} ---")
    print(f"行数: {len(df)}, 列数: {len(df.columns)}")
    print(f"カラム: {df.columns.tolist()[:5]}...")  # 最初の5カラムのみ
    
    # データをJSONに保存
    personality_types[sheet_name] = df.to_dict('records')

# JSONとして保存
with open(os.path.join(output_path, '80type_data.json'), 'w', encoding='utf-8') as f:
    json.dump(personality_types, f, ensure_ascii=False, indent=2)

print(f"\n✓ 80タイプデータを保存: {os.path.join(output_path, '80type_data.json')}")

# 2. 適性診断_仕様・データ構造まとめ.xlsxの読み込み
print("\n" + "=" * 50)
print("適性診断_仕様・データ構造まとめ.xlsx を分析中...")
print("=" * 50)

spec_file = os.path.join(base_path, '適性診断_仕様・データ構造まとめ.xlsx')
xl_spec = pd.ExcelFile(spec_file)

print(f"\nシート数: {len(xl_spec.sheet_names)}")
print("\nシート一覧:")
for i, sheet_name in enumerate(xl_spec.sheet_names, 1):
    print(f"  {i}. {sheet_name}")

# 各シートの構造を確認
spec_data = {}
for sheet_name in xl_spec.sheet_names:
    df = pd.read_excel(spec_file, sheet_name=sheet_name)
    print(f"\n--- シート: {sheet_name} ---")
    print(f"行数: {len(df)}, 列数: {len(df.columns)}")
    if len(df.columns) <= 10:
        print(f"カラム: {df.columns.tolist()}")
    else:
        print(f"カラム(最初の10個): {df.columns.tolist()[:10]}...")
    
    # 最初の3行を表示
    print("\n最初の3行:")
    print(df.head(3).to_string())
    
    spec_data[sheet_name] = df.to_dict('records')

# JSONとして保存
with open(os.path.join(output_path, 'spec_data.json'), 'w', encoding='utf-8') as f:
    json.dump(spec_data, f, ensure_ascii=False, indent=2)

print(f"\n✓ 仕様データを保存: {os.path.join(output_path, 'spec_data.json')}")

print("\n" + "=" * 50)
print("データ抽出完了!")
print("=" * 50)
