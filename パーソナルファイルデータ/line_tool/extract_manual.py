import json
import re
import os
from pdfminer.high_level import extract_text

# Path to PDF
pdf_path = r"..\【極秘】【マニュアル】_v2.pdf"
output_path = "data/manual_data.json"

def extract_and_parse():
    print(f"Extracting text from {pdf_path}...")
    try:
        text = extract_text(pdf_path)
    except Exception as e:
        print(f"Error extracting text: {e}")
        return

    print("Text extracted. Parsing...")
    
    # Structure to hold data: { "PP": { "overview": "...", "types": { "達成型": "...", ... } }, ... }
    manual_data = {}
    
    # Regex to find Type sections (e.g., "PP 型の注意点説明")
    type_sections = re.split(r'([A-Z]{2})\s*型の注意点説明', text)
    
    # First part is intro, skip. Then we get pairs of (Type Code, Content)
    for i in range(1, len(type_sections), 2):
        type_code = type_sections[i]
        content = type_sections[i+1]
        
        manual_data[type_code] = {
            "overview": "",
            "types": {}
        }
        
        # Extract Overview (類型の概要)
        overview_match = re.search(r'類型の概要\s+(.*?)(?=\n\s*(達成型|効率型|外見型|情報型|平和型)|$)', content, re.DOTALL)
        if overview_match:
            manual_data[type_code]["overview"] = overview_match.group(1).strip()
            
        # Extract Behavior Types
        behavior_types = ["達成型", "効率型", "外見型", "情報型", "平和型"]
        
        for b_type in behavior_types:
            # Regex to find specific behavior type section
            # Look for the behavior type keyword, capture until the next keyword or end of section
            other_types = "|".join([t for t in behavior_types if t != b_type] + ["DA 型", "DP 型", "DD 型", "2023"]) # "2023" for footer protection?
            
            pattern = f"{b_type}\s+(.*?)(?=\n\s*({'|'.join(behavior_types)})|\Z)"
            # Note: The text might have header/footer "2023..." or page numbers. We might need multiline.
            
            # Simple approach: Split content by behavior type headings
            pass 

        # Alternative parsing approach for behavior types
        # Split content by lines and look for starting keywords
        lines = content.split('\n')
        current_section = None
        buffer = []
        
        for line in lines:
            line = line.strip()
            if not line: continue
            if "2023 年" in line or "瀧田桜司" in line or line.isdigit(): continue # Skip headers/footers
            
            # Check if line starts with a behavior type
            found_type = None
            for b_type in behavior_types:
                if line.startswith(b_type):
                    found_type = b_type
                    break
            
            if found_type:
                # Save previous
                if current_section == "overview":
                     manual_data[type_code]["overview"] += "\n" + "\n".join(buffer)
                elif current_section:
                    manual_data[type_code]["types"][current_section] = "\n".join(buffer).strip()
                
                # Start new
                current_section = found_type
                # Remove the type name from the line itself if it's just a header? 
                # Usually it is "達成型 達成型PPは..."
                content_part = line[len(found_type):].strip()
                buffer = [content_part] if content_part else []
                
            elif "類型の概要" in line:
                if current_section: # Save previous
                     manual_data[type_code]["types"][current_section] = "\n".join(buffer).strip()
                current_section = "overview"
                content_part = line.replace("類型の概要", "").strip()
                buffer = [content_part] if content_part else []
                
            else:
                if current_section:
                    buffer.append(line)
        
        # Save last section
        if current_section == "overview":
             manual_data[type_code]["overview"] += "\n" + "\n".join(buffer)
        elif current_section:
            manual_data[type_code]["types"][current_section] = "\n".join(buffer).strip()

    # Post-processing to clean up text
    for t_code, t_data in manual_data.items():
        t_data["overview"] = t_data["overview"].replace("説明文", "").strip() # Table header artifact
        for b_code, b_text in t_data["types"].items():
             t_data["types"][b_code] = b_text.strip()

    # Save to JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(manual_data, f, ensure_ascii=False, indent=2)
        
    print(f"Saved extracted data to {output_path}")
    print(f"Extracted types: {list(manual_data.keys())}")

if __name__ == "__main__":
    extract_and_parse()
