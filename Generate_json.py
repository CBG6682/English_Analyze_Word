from google import genai
import json
import re
import os
import time
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    exit()

client = genai.Client(api_key=API_KEY)

def get_latest_flash_model():
    try:
        models = client.models.list()
        flash_models = [m.name for m in models if 'flash' in m.name.lower()]
        flash_models.sort(reverse=True)
        return flash_models[0] if flash_models else "gemini-1.5-flash"
    except:
        return "gemini-1.5-flash"

MODEL_ID = get_latest_flash_model()
print(f"🚀 Using model: {MODEL_ID}")

BATCH_SIZE = 20

def analyze_batch(word_batch):
    prompt = f"""
        Analyze these English words: {word_batch}
        Return strictly JSON format (list of objects):
        [
            {{
                "word": "string",
                "phonetic": "string",
                "definitions": [
                    {{
                        "meaning": "Vietnamese string",
                        "analysis": {{
                            "prefix": {{"val": "string or null", "mean": "string or null"}},
                            "root": {{"val": "string or null", "mean": "string or null"}},
                            "suffix": {{"val": "string or null", "mean": "string or null"}}
                        }},
                        "synonyms": ["string"],
                        "example": "English sentence"
                    }}
                ]
            }}
        ]
        Constraints: 1. Return ONLY JSON. 2. Meanings in Vietnamese. 3. No markdown.
        """
    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt
        )
        clean_json = re.sub(r'^```json\s*|\s*```$', '', response.text.strip(), flags=re.MULTILINE)
        return json.loads(clean_json)
    except Exception as e:
        print(f"Lỗi: {e}")
        return []

def main():
    txt_file = os.path.join(basedir, 'vocab.txt')
    json_file = os.path.join(basedir, 'analyzed_vocab.json')

    if not os.path.exists(txt_file):
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
        except:
            pass

    new_words = [w for w in all_words if w not in processed_words]
    if not new_words:
        print("✅ Không có từ mới.")
        return

    print(f"🔍 Đang phân tích {len(new_words)} từ...")
    
    for i in range(0, len(new_words), BATCH_SIZE):
        batch = new_words[i : i + BATCH_SIZE]
        print(f"⏳ Lô {i//BATCH_SIZE + 1}...")
        
        batch_result = analyze_batch(batch)
        if batch_result:
            existing_data.extend(batch_result)
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(existing_data, f, ensure_ascii=False, indent=4)
        
        time.sleep(3) 

    print("🎉 Xong!")

if __name__ == "__main__":
    main()