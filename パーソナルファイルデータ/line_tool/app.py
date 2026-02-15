"""
LINE返信案生成ツール - Flask APIサーバー
"""

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from message_generator import MessageGenerator
import os

app = Flask(__name__, 
            static_folder='static',
            template_folder='static')
CORS(app)

# メッセージジェネレーターの初期化
generator = MessageGenerator(data_dir="data")

@app.route('/')
def index():
    """メインページ"""
    return render_template('index.html')

@app.route('/api/generate-message', methods=['POST'])
def generate_message():
    """
    LINE返信案を生成するAPI
    
    Request Body:
        {
            "name": "山田",
            "personality_type": "AI",
            "behavior_type": "平和型",
            "employment_status": "在職中",
            "job_timing": "1. できるだけ早く",
            "location": "東京都",
            "education": "大卒",
            "current_dissatisfaction_flag": true,
            "future_anxiety_flag": false,
            "skill_desire_flag": true,
            "conversation_count": 2,
            "phase": "phase1_initial"
        }
    
    Response:
        {
            "success": true,
            "data": {
                "message": "生成されたLINE返信案",
                "readiness_score": {...},
                "flag_analysis": {...},
                "strategic_advice": "...",
                "personality_info": {...}
            }
        }
    """
    try:
        data = request.json
        
        # 必須フィールドのチェック
        required_fields = ["name", "personality_type", "behavior_type"]
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "success": False,
                    "error": f"必須フィールド '{field}' が不足しています"
                }), 400
        
        # デフォルト値の設定
        user_input = {
            "name": data.get("name"),
            "personality_type": data.get("personality_type"),
            "behavior_type": data.get("behavior_type"),
            "employment_status": data.get("employment_status", "在職中"),
            "job_timing": data.get("job_timing", "4. 相談したい"),
            "location": data.get("location", "東京都"),
            "education": data.get("education", "大卒"),
            "current_dissatisfaction_flag": data.get("current_dissatisfaction_flag", False),
            "future_anxiety_flag": data.get("future_anxiety_flag", False),
            "skill_desire_flag": data.get("skill_desire_flag", False),
            "conversation_count": data.get("conversation_count", 0)
        }
        
        phase = data.get("phase", "phase1_initial")
        
        # メッセージ生成
        result = generator.generate_message(user_input, phase)
        
        return jsonify({
            "success": True,
            "data": result
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/analyze-image', methods=['POST'])
def analyze_image():
    """
    画像を分析してフォーム値を推定するAPI (Mock)
    """
    if 'image' not in request.files:
        return jsonify({"success": False, "error": "No image file provided"}), 400
        
    # file = request.files['image']
    # ここで本来はGemini/OpenAI APIを呼ぶ
    # 現在はモックとして、「不安を感じているユーザー」のパターンを返す
    
    mock_result = {
        "success": True,
        "data": {
            "conversation_count": 5,
            "phase": "phase2_rapport",
            "current_dissatisfaction_flag": True,
            "future_anxiety_flag": True,
            "skill_desire_flag": False,
            "analysis_comment": "【画像分析結果】\nユーザーは現状の職場環境に強い不満を抱いており、転職を急いでいる様子が見受けられます。共感を示しつつ、具体的な解決策を提示するフェーズに移行すべきです。"
        }
    }
    
    return jsonify(mock_result)

@app.route('/api/personality-types', methods=['GET'])
def get_personality_types():
    """
    利用可能な性格類型一覧を取得
    """
    personality_types = [
        {"code": "PP", "name": "エンターテイナー(鼓舞者)"},
        {"code": "PA", "name": "アルチザン(芸術家)"},
        {"code": "PI", "name": "コラボレーター(協調者)"},
        {"code": "PD", "name": "アントレプレナー(起業家)"},
        {"code": "AP", "name": "プラクティショナー(実務家)"},
        {"code": "AA", "name": "リサーチャー(情報家)"},
        {"code": "AI", "name": "ディリジェンサー(努力家)"},
        {"code": "AD", "name": "アナリスト(分析官)"},
        {"code": "IP", "name": "コントリビューター(貢献者)"},
        {"code": "IA", "name": "サポーター(支援者)"},
        {"code": "II", "name": "ハーモナー(共感者)"},
        {"code": "ID", "name": "シンカー(思考家)"},
        {"code": "DI", "name": "プロモーター(推進者)"},
        {"code": "DP", "name": "リーダー(指揮官)"},
        {"code": "DA", "name": "ファシリテーター(先導者)"},
        {"code": "DD", "name": "イノベーター(変革者)"}
    ]
    
    behavior_types = ["達成型", "効率型", "外見型", "情報型", "平和型"]
    
    return jsonify({
        "success": True,
        "data": {
            "personality_types": personality_types,
            "behavior_types": behavior_types
        }
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
