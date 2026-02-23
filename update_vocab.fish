#!/usr/bin/env fish

source venv_tu_dien/bin/activate.fish
python Generate_json.py

git add .
git commit -m "update vocab"
git push origin main

echo "✅ Đã tự động cập nhật và đẩy lên GitHub thành công!"