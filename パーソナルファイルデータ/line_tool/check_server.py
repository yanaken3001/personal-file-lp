"""
サーバーの動作確認スクリプト
"""

import requests

try:
    # ルートパスにアクセス
    print("=" * 60)
    print("サーバー動作確認")
    print("=" * 60)
    
    response = requests.get("http://127.0.0.1:5000/")
    print(f"\nステータスコード: {response.status_code}")
    print(f"Content-Type: {response.headers.get('Content-Type')}")
    print(f"レスポンスサイズ: {len(response.text)} bytes")
    
    if response.status_code == 200:
        print("\n✅ サーバーは正常に動作しています")
        
        # HTMLが返されているか確認
        if "<!doctype html>" in response.text.lower() or "<!DOCTYPE html>" in response.text:
            print("✅ HTMLが正しく返されています")
        else:
            print("❌ HTMLが返されていません")
            print(f"レスポンス内容(最初の500文字):\n{response.text[:500]}")
    else:
        print(f"\n❌ エラー: ステータスコード {response.status_code}")
        print(f"レスポンス: {response.text[:500]}")
        
except requests.exceptions.ConnectionError:
    print("\n❌ サーバーに接続できません")
    print("サーバーが起動しているか確認してください")
except Exception as e:
    print(f"\n❌ エラー: {str(e)}")
