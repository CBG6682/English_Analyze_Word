import google.generativeai as genai
import json
import re
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def analyze_word(word_list):
    prompt = f"""
    Analyze the following English words: {word_list}
    Return the result strictly in JSON format (a list of objects) with this structure:
    {{
        "word": "string",
        "phonetic": "string",
        "analysis": {{
            "prefix": {{"val": "string or null", "mean": "string or null"}},
            "root": {{"val": "string or null", "mean": "string or null"}},
            "suffix": {{"val": "string or null", "mean": "string or null"}}
        }},
        "meaning": "string",
        "synonyms": ["string1", "string2"],
        "example": "string"
    }}
    Important: 
    1. Return ONLY the JSON array. No markdown formatting, no backticks.
    2. For 'synonyms', provide 1 or 2 similar words.
    3. Ensure all explanations (meanings) are in Vietnamese for better learning.
    4. If there is no prefix, root, or suffix, set the "val" to null.
    """
    response = model.generate_content(prompt)

    clean_json = re.sub(r'```json|```', '', response.text).strip()
    return clean_json

try:
    with open('vocab.txt', 'r', encoding='utf-8') as f:
        words_list = [line.strip() for line in f if line.strip()]

    print(words_list)
    # print("Đang phân tích từ vựng... vui lòng chờ...")
    # json_output = analyze_word(words_list)

    # analyzed_data = json.loads(json_output)
    
    # with open('analyzed_vocab.json', 'w', encoding='utf-8') as f:
    #     json.dump(analyzed_data, f, ensure_ascii=False, indent=4)
    
    # print("Thành công! Dữ liệu đã được lưu vào 'analyzed_vocab.json'")

except Exception as e:
    print(f"Có lỗi xảy ra: {e}")