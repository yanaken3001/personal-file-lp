"""
実際のフォームデータでAPIをテスト
スクリーンショットのデータを使用
"""

import requests
import json

# スクリーンショットのデータ
test_data = {
    "name": "山田",
    "personality_type": "PP",  # PP - エンターテイナー(鼓舞者)
    "behavior_type": "達成型",
    "employment_status": "在職中",
    "job_timing": "4. 相談したい",
    "location": "東京都",
    "education": "大卒",
    "current_dissatisfaction_flag": True,
    "future_anxiety_flag": True,
    "skill_desire_flag": False,
    "conversation_count": 1,
    "phase": "phase1_initial"
}

print("=" * 60)
print("実際のフォームデータでAPIテスト")
print("=" * 60)

print("\n📝 送信データ:")
print(json.dumps(test_data, ensure_ascii=False, indent=2))

try:
    response = requests.post(
        "http://127.0.0.1:5000/api/generate-message",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"\n📡 ステータスコード: {response.status_code}")
    print(f"Content-Type: {response.headers.get('Content-Type')}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n✅ レスポンス受信成功")
        print(f"Success: {result.get('success')}")
        
        if result.get('success'):
            print("\n💬 生成されたメッセージ:")
            print("-" * 60)
            print(result['data']['message'])
            print("-" * 60)
        else:
            print(f"\n❌ エラー: {result.get('error')}")
    else:
        print(f"\n❌ HTTPエラー")
        print(f"レスポンス: {response.text}")
        
except Exception as e:
    print(f"\n❌ 例外発生: {str(e)}")
    import traceback
    traceback.print_exc()
