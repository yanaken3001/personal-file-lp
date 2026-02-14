"""
デバッグ用スクリプト - message_generatorの動作確認
"""

import sys
import traceback

try:
    print("=" * 60)
    print("1. モジュールのインポート")
    print("=" * 60)
    from message_generator import MessageGenerator
    print("✅ MessageGeneratorのインポート成功")
    
    print("\n" + "=" * 60)
    print("2. MessageGeneratorの初期化")
    print("=" * 60)
    generator = MessageGenerator(data_dir="data")
    print("✅ MessageGeneratorの初期化成功")
    
    print("\n" + "=" * 60)
    print("3. データファイルの読み込み確認")
    print("=" * 60)
    print(f"personality_data keys: {len(generator.personality_data.keys())}")
    print(f"templates keys: {list(generator.templates.keys())}")
    print("✅ データファイルの読み込み成功")
    
    print("\n" + "=" * 60)
    print("4. サンプルデータでメッセージ生成")
    print("=" * 60)
    
    test_input = {
        "name": "山田",
        "personality_type": "AI",
        "behavior_type": "平和型",
        "employment_status": "離職中",
        "job_timing": "1. できるだけ早く",
        "location": "東京都",
        "education": "大卒",
        "current_dissatisfaction_flag": True,
        "future_anxiety_flag": True,
        "skill_desire_flag": True,
        "conversation_count": 2
    }
    
    result = generator.generate_message(test_input, "phase1_initial")
    print("✅ メッセージ生成成功")
    print("\n生成されたメッセージ:")
    print("-" * 60)
    print(result["message"])
    print("-" * 60)
    
    print("\n" + "=" * 60)
    print("🎉 すべてのテストが成功しました!")
    print("=" * 60)
    
except Exception as e:
    print("\n" + "=" * 60)
    print("❌ エラーが発生しました")
    print("=" * 60)
    print(f"\nエラータイプ: {type(e).__name__}")
    print(f"エラーメッセージ: {str(e)}")
    print("\nトレースバック:")
    traceback.print_exc()
    sys.exit(1)
