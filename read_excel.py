import pandas as pd
import json

file_path = r"c:\Users\kogik\Desktop\personalfile\パーソナルファイルデータ\80タイプ性格診断結果.xlsx"
df = pd.read_excel(file_path)

# Determine if there are multiple sheets
xl = pd.ExcelFile(file_path)
print(f"DEBUG: Sheets found: {xl.sheet_names}")

# Determine if there are multiple sheets
xl = pd.ExcelFile(file_path)
print(f"DEBUG: Sheets found: {xl.sheet_names}")

types_data = []

for sheet_name in xl.sheet_names:
    print(f"Processing sheet: {sheet_name}")
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=0)
        
        # Get type names (excluding the first column)
        # Assuming the structure is consistent across sheets
        if df.shape[1] < 2:
             print(f"Skipping sheet {sheet_name} due to insufficient columns")
             continue
             
        type_names = df.columns[1:]
        
        for type_name in type_names:
            # Basic validation to skip empty columns or non-type columns if any
            if "Unnamed" in str(type_name): continue

            type_info = {"name": type_name}
            
            # Extract attributes for this type
            # Using try-except to handle potential missing rows or structure variations
            try:
                summary_row = df[df['Unnamed: 0'] == '類型の要約']
                if not summary_row.empty:
                    summary = summary_row[type_name].values[0]
                    type_info["summary"] = str(summary).replace('\n', '')
                else:
                    type_info["summary"] = ""
            except Exception as e:
                print(f"Error extracting summary for {type_name}: {e}")
                type_info["summary"] = ""
            
            types_data.append(type_info)
            
    except Exception as e:
        print(f"Error reading sheet {sheet_name}: {e}")

print(f"DEBUG: Total types found: {len(types_data)}")

with open(r"c:\Users\kogik\Desktop\personalfile\types_data.json", "w", encoding="utf-8") as f:
    json.dump(types_data, f, ensure_ascii=False, indent=2)




