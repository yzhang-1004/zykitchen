import json, os
src = r'c:\Users\25459\Desktop\小工具\张杨小程序\zykitchen\kawaii-shop\scripts\recipes.json'
dst = r'c:\Users\25459\Desktop\小工具\张杨小程序\zykitchen\kawaii-shop\data\recipes.json'
data = json.load(open(src, 'r', encoding='utf-8'))
json.dump(data, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'Minified size: {os.path.getsize(dst)/1024:.1f} KB')
