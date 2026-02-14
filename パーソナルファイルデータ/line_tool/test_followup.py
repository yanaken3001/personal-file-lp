"""
phase1_followupのテスト
"""
import requests
import json

test_data = {
    "name": "柳沢",
    "personality_type": "PP", 
    "behavior_type": "達成型",
    "employment_status": "在職中",
    "job_timing": "4. 相談したい",
    "location": "東京都",
    "education": "大卒",
    "current_dissatisfaction_flag": True,
    "future_anxiety_flag": True,
    "skill_desire_flag": False,
    "conversation_count": 1,
    "phase": "phase1_followup"  # フォローアップフェーズを指定
}

print("=" * 60)
print("APIテスト: Phase 1 Followup")
print("=" * 60)

try:
    response = requests.post(
        "http://127.0.0.1:5000/api/generate-message",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            print("\n💬 生成されたメッセージ:")
            print("-" * 60)
            print(result['data']['message'])
            print("-" * 60)
        else:
            print(f"\n❌ エラー: {result.get('error')}")
    else:
        print(f"\n❌ HTTPエラー: {response.text}")
        
except Exception as e:
    print(f"\n❌ 例外発生: {str(e)}")
