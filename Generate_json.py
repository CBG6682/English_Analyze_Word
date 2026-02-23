import google.generativeai as genai
import json
import re
import os
import time
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '.env')
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("❌ Không tìm thấy API Key!")
    exit()
available_models = [m.name for m in genai.list_models() 
                    if 'generateContent' in m.supported_generation_methods]


flash_models = [m for m in available_models if 'flash' in m]
model_name = flash_models[0] if flash_models else available_models[0]

print(f"🚀 Hệ thống tự động chọn model: {model_name}")
model = genai.GenerativeModel(model_name)
genai.configure(api_key=API_KEY)


BATCH_SIZE = 20 

def analyze_batch(word_batch):
    prompt = f"""
        Analyze the following English words thoroughly: {word_batch}
        Identify if a word has multiple distinct meanings. Return the result strictly in JSON format (a list of objects) with this structure:
        [
            {{
                "word": "string",
                "phonetic": "string",
                "definitions": [
                    {{
                        "meaning": "string (in Vietnamese)",
                        "analysis": {{
                            "prefix": {{"val": "string or null", "mean": "string or null"}},
                            "root": {{"val": "string or null", "mean": "string or null"}},
                            "suffix": {{"val": "string or null", "mean": "string or null"}}
                        }},
                        "synonyms": ["string1", "string2"],
                        "example": "string (English sentence matching this specific meaning)"
                    }}
                    // Add more objects in this 'definitions' array ONLY IF the word has completely different, distinct meanings.
                ]
            }}
        ]
        Important constraints: 
        1. Return ONLY the JSON array. No markdown formatting, no backticks.
        2. Ensure all 'meaning' fields are in Vietnamese.
        3. If there is no prefix, root, or suffix for a specific meaning, set the "val" to null.
        """
    try:
        response = model.generate_content(prompt)
        clean_json = re.sub(r'^```json\s*|\s*```$', '', response.text.strip(), flags=re.MULTILINE)
        return json.loads(clean_json)
    except Exception as e:
        print(f"Lỗi ở lô từ vựng này: {e}")
        return []

def main():
    txt_file = 'vocab.txt'
    json_file = 'analyzed_vocab.json'

    if not os.path.exists(txt_file):
        print("❌ Chưa có file vocab.txt")
        return
    with open(txt_file, 'r', encoding='utf-8') as f:
        all_words = [line.strip().lower() for line in f if line.strip()]

    existing_data = []
    processed_words = set()
    if os.path.exists(json_file):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                processed_words = {item['word'].lower() for item in existing_data}
        except json.JSONDecodeError:
            print("⚠️ File JSON cũ bị lỗi định dạng, sẽ tạo lại từ đầu.")

    new_words = [w for w in all_words if w not in processed_words]

    if not new_words:
        print("✅ Mọi từ trong vocab.txt đều đã được phân tích. Không cần chạy lại!")
        return

    print(f"🔍 Tìm thấy {len(new_words)} từ mới cần phân tích...")
    
    for i in range(0, len(new_words), BATCH_SIZE):
        batch = new_words[i : i + BATCH_SIZE]
        print(f"⏳ Đang xử lý lô {i//BATCH_SIZE + 1} ({len(batch)} từ)...")
        
        batch_result = analyze_batch(batch)
        
        if batch_result:
            existing_data.extend(batch_result)
            
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(existing_data, f, ensure_ascii=False, indent=4)
        
        time.sleep(3) 

    print("🎉 Hoàn tất! Dữ liệu đã được lưu an toàn.")

if __name__ == "__main__":
    main()