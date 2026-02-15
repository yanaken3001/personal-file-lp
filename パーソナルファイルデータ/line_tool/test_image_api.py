import requests
import io

def test_analyze_image():
    url = "http://localhost:5000/api/analyze-image"
    
    # Create a dummy image file in memory
    dummy_image = io.BytesIO(b"fake image data")
    dummy_image.name = "test.jpg"
    
    files = {'image': dummy_image}
    
    try:
        # Note: server must be running for this to work.
        # Since I can't guarantee server is running in this environment context easily without blocking,
        # I will simulated the verify by running app.test_client().
        
        from app import app
        client = app.test_client()
        
        response = client.post('/api/analyze-image', data={'image': dummy_image}, content_type='multipart/form-data')
        
        print("Status Code:", response.status_code)
        print("Response JSON:", response.get_json())
        
        if response.status_code == 200 and response.get_json().get('success'):
            print("✅ Image Analysis API Test Passed")
        else:
            print("❌ Image Analysis API Test Failed")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_analyze_image()
