
import requests
import os

def test_image_upload():
    url = "http://localhost:5000/api/analyze-image"
    
    # Create a dummy image file
    with open("test_image.png", "wb") as f:
        f.write(b"fake image content")
        
    files = {'image': open('test_image.png', 'rb')}
    
    try:
        print(f"Uploading image to {url}...")
        response = requests.post(url, files=files)
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.json()}")
        
        if response.status_code == 200 and response.json().get("success"):
            print("[PASS] Image upload successful.")
        else:
            print("[FAIL] Image upload failed.")
            
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")
    finally:
        files['image'].close()
        # Clean up
        if os.path.exists("test_image.png"):
            os.remove("test_image.png")

if __name__ == "__main__":
    test_image_upload()
