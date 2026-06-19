import json, os
src = r'c:\Users\25459\Desktop\小工具\张杨小程序\zykitchen\kawaii-shop\scripts\recipes.json'
dst = r'c:\Users\25459\Desktop\小工具\张杨小程序\zykitchen\kawaii-shop\data\recipes.js'
data = json.load(open(src, 'r', encoding='utf-8'))
with open(dst, 'w', encoding='utf-8') as f:
    f.write('module.exports = ')
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print(f'JS module size: {os.path.getsize(dst)/1024:.1f} KB')
