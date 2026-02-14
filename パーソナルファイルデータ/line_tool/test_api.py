"""
LINE返信案生成ツール - テストスクリプト
APIエンドポイントを直接テストします
"""

import requests
import json

# APIエンドポイント
BASE_URL = "http://127.0.0.1:5000"

def test_generate_message():
    """メッセージ生成APIのテスト"""
    print("=" * 60)
    print("LINE返信案生成APIテスト")
    print("=" * 60)
    
    # テストデータ
    test_data = {
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
        "conversation_count": 2,
        "phase": "phase1_initial"
    }
    
    print("\n📝 入力データ:")
    print(json.dumps(test_data, ensure_ascii=False, indent=2))
    
    try:
        # APIリクエスト
        response = requests.post(
            f"{BASE_URL}/api/generate-message",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\n📡 ステータスコード: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get("success"):
                data = result["data"]
                
                print("\n" + "=" * 60)
                print("✅ テスト成功!")
                print("=" * 60)
                
                print("\n💬 生成されたLINE返信案:")
                print("-" * 60)
                print(data["message"])
                print("-" * 60)
                
                print("\n📊 ReadinessScore分析:")
                score = data["readiness_score"]
                print(f"  総合スコア: {score['total_score']}点")
                print(f"  推奨Phase: {score['phase_recommendation']}")
                print("\n  スコア内訳:")
                for key, value in score["breakdown"].items():
                    print(f"    - {key}: {value}点")
                
                print("\n🚩 フラグ分析:")
                flag_analysis = data["flag_analysis"]
                print(f"  緊急度: {flag_analysis['urgency_level']}")
                print(f"  アクティブフラグ数: {flag_analysis['flag_count']}")
                if flag_analysis["active_flags"]:
                    for flag in flag_analysis["active_flags"]:
                        print(f"    - {flag}")
                
                print("\n💡 戦略的アドバイス:")
                print("-" * 60)
                print(data["strategic_advice"])
                print("-" * 60)
                
                return True
            else:
                print(f"\n❌ エラー: {result.get('error')}")
                return False
        else:
            print(f"\n❌ HTTPエラー: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ 例外発生: {str(e)}")
        return False

def test_personality_types():
    """性格類型一覧取得APIのテスト"""
    print("\n" + "=" * 60)
    print("性格類型一覧取得APIテスト")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/api/personality-types")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                data = result["data"]
                print(f"\n✅ 性格類型数: {len(data['personality_types'])}")
                print(f"✅ 行動類型数: {len(data['behavior_types'])}")
                return True
        
        print(f"❌ テスト失敗: {response.text}")
        return False
        
    except Exception as e:
        print(f"❌ 例外発生: {str(e)}")
        return False

if __name__ == "__main__":
    print("\n🚀 LINE返信案生成ツール - 統合テスト開始\n")
    
    # テスト実行
    test1 = test_personality_types()
    test2 = test_generate_message()
    
    # 結果サマリー
    print("\n" + "=" * 60)
    print("テスト結果サマリー")
    print("=" * 60)
    print(f"性格類型一覧取得API: {'✅ 成功' if test1 else '❌ 失敗'}")
    print(f"メッセージ生成API: {'✅ 成功' if test2 else '❌ 失敗'}")
    
    if test1 and test2:
        print("\n🎉 すべてのテストが成功しました!")
    else:
        print("\n⚠️ 一部のテストが失敗しました")
