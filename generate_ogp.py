import os
from PIL import Image, ImageDraw, ImageFont

colors = {
    'P': ('#FF2D55', '#D91A40', '🌟'),
    'I': ('#FFBE0B', '#E5A800', '🤝'),
    'A': ('#4361EE', '#3A0CA3', '🔍'),
    'D': ('#06D6A0', '#05A67D', '⚡')
}

labels = {
    'P': 'ポジティブ・直感タイプ',
    'I': '協調・平和志向タイプ',
    'A': '慎重・論理重視タイプ',
    'D': '即断即決・合理タイプ'
}

names = {
    'P': '行動者',
    'I': '調和者',
    'A': '分析者',
    'D': '決断者'
}

catchcopies = {
    'P': '考えるより先に動く。ノリと勢いで場を動かすムードメーカー。',
    'I': '人の気持ちに敏感で、チームの空気を整える調整力の持ち主。',
    'A': '情報を集め、筋道を立て、最善策を見つけ出す知性派。',
    'D': '迷わない。決めたら即行動。結果で自分を証明する実力主義者。'
}

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

W, H = 1200, 630

# Try to find a Japanese font
font_path = "C:\\Windows\\Fonts\\meiryo.ttc"
if not os.path.exists(font_path):
    font_path = "C:\\Windows\\Fonts\\msgothic.ttc"

try:
    font_large_icon = ImageFont.truetype(font_path, 100)
    font_title = ImageFont.truetype(font_path, 80)
    font_label = ImageFont.truetype(font_path, 36)
    font_catch = ImageFont.truetype(font_path, 28)
except:
    font_large_icon = ImageFont.load_default()
    font_title = ImageFont.load_default()
    font_label = ImageFont.load_default()
    font_catch = ImageFont.load_default()

for t in ['P', 'I', 'A', 'D']:
    img = Image.new('RGB', (W, H), hex_to_rgb('#0A0A12'))
    d = ImageDraw.Draw(img)
    
    col1, col2, emoji = colors[t]
    c1, c2 = hex_to_rgb(col1), hex_to_rgb(col2)
    
    # Draw icon box
    box_w, box_h = 200, 200
    box_x, box_y = (W - box_w) // 2, 80
    d.rounded_rectangle([box_x, box_y, box_x+box_w, box_y+box_h], radius=40, fill=c1)
    
    txt = t
    bbox = d.textbbox((0, 0), txt, font=font_large_icon)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    text_color = (255, 255, 255) if t != 'I' else (26, 26, 42)
    d.text((box_x + (box_w - tw)/2, box_y + (box_h - th)/2 - 20), txt, font=font_large_icon, fill=text_color)
    
    # Title
    txt_title = names[t]
    bbox = d.textbbox((0, 0), txt_title, font=font_title)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((W - tw)/2, box_y + box_h + 40), txt_title, font=font_title, fill=c1)
    
    # Label
    txt_label = labels[t]
    bbox = d.textbbox((0, 0), txt_label, font=font_label)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((W - tw)/2, box_y + box_h + 150), txt_label, font=font_label, fill=c1)
    
    # Catchcopy
    txt_catch = catchcopies[t]
    bbox = d.textbbox((0, 0), txt_catch, font=font_catch)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((W - tw)/2, box_y + box_h + 230), txt_catch, font=font_catch, fill=(200, 200, 200))
    
    img.save(f"share_ogp_{t}.png")
    print(f"Generated share_ogp_{t}.png")
