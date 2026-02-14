"""
データの内容を確認するスクリプト
"""
import json

with open('data/personality_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# PP型のデータを探す
pp_key = [k for k in data.keys() if 'PP' in k][0]
pp_data = data[pp_key]

# 達成型PPのデータを探す
target_col = None
for col in pp_data[0].keys():
    if '達成型' in str(col):
        target_col = col
        break

print(f"Target Column: {target_col}")

info = {}
for row in pp_data:
    row_type = row.get("Unnamed: 0", "")
    if row_type in ["強み", "弱み", "相性の良い社風\n説明"]:
        info[row_type] = row.get(target_col, "")

print("-" * 50)
print("【強み】")
print(info.get("強み", ""))
print("-" * 50)
print("【弱み】")
print(info.get("弱み", ""))
print("-" * 50)
print("【相性の良い社風】")
print(info.get("相性の良い社風\n説明", ""))
print("-" * 50)
