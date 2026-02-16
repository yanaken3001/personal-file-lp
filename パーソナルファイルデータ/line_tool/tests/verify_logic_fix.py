
import sys
import os
import json

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from message_generator import MessageGenerator

def test_logic_variation():
    print("Initializing MessageGenerator...")
    generator = MessageGenerator(data_dir="data")
    
    # Define two different inputs
    input_a = {
        "name": "田中",
        "personality_type": "PP",
        "behavior_type": "達成型",
        "employment_status": "在職中",
        "job_timing": "1. できるだけ早く",
        "location": "東京都",
        "education": "大卒",
        "current_dissatisfaction_flag": False,
        "future_anxiety_flag": False,
        "skill_desire_flag": False,
        "conversation_count": 2
    }
    
    input_b = {
        "name": "佐藤",
        "personality_type": "AI",
        "behavior_type": "効率型",
        "employment_status": "離職中",
        "job_timing": "4. 相談したい",
        "location": "大阪府",
        "education": "大卒",
        "current_dissatisfaction_flag": True,
        "future_anxiety_flag": True,
        "skill_desire_flag": True,
        "conversation_count": 5
    }
    
    print("\nGenerating messages for Input A (達成型PP)...")
    result_a = generator.generate_message(input_a, phase="phase2_rapport")
    msg_a = result_a["message"]
    print(f"Message A snippet: {msg_a[:50]}...")
    
    print("\nGenerating messages for Input B (効率型AI)...")
    result_b = generator.generate_message(input_b, phase="phase2_rapport")
    msg_b = result_b["message"]
    print(f"Message B snippet: {msg_b[:50]}...")
    
    # Check if messages are different
    if msg_a == msg_b:
        print("\n[FAIL] Messages are identical! Logic fix failed.")
        sys.exit(1)
    else:
        print("\n[PASS] Messages are different.")
        
    # Check common_struggle variation
    # We can infer this by checking if the messages contain specific phrases related to weakness
    # But checking equality is the strongest signal for now.
    
    print("\n[SUCCESS] Message variation verification passed.")

if __name__ == "__main__":
    test_logic_variation()
