"""
PPタイプのデータ取得テスト
"""

import json
import os

# データファイルを読み込み
with open('data/personality_data.json', 'r', encoding='utf-8') as f:
    personality_data = json.load(f)

print("=" * 60)
print("PPタイプのデータ確認")
print("=" * 60)

print(f"\n全シート数: {len(personality_data.keys())}")
print("\nシート一覧:")
for i, key in enumerate(personality_data.keys(), 1):
    print(f"  {i}. {key}")

# PPを含むキーを探す
print("\n" + "=" * 60)
print("PPを含むシートを検索")
print("=" * 60)

pp_keys = [key for key in personality_data.keys() if 'PP' in key]
print(f"\n見つかったシート数: {len(pp_keys)}")
for key in pp_keys:
    print(f"  - {key}")

# 最初のPPシートのデータ構造を確認
if pp_keys:
    first_pp_key = pp_keys[0]
    print(f"\n" + "=" * 60)
    print(f"シート '{first_pp_key}' のデータ構造")
    print("=" * 60)
    
    data = personality_data[first_pp_key]
    print(f"\nレコード数: {len(data)}")
    
    if data:
        print("\n最初のレコードのキー:")
        for key in data[0].keys():
            print(f"  - {key}")
        
        # 達成型のカラムを探す
        print("\n'達成型'を含むカラム:")
        for key in data[0].keys():
            if '達成型' in str(key):
                print(f"  - {key}")
