#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析 howtocook 仓库的 Markdown 菜谱文件，生成结构化 JSON
用法: python parse_recipes.py
输出: recipes.json（在同目录下）
"""

import os
import re
import json

# howtocook 仓库路径（硬编码）
REPO_DIR = r'c:\Users\25459\Desktop\小工具\张杨小程序\howtocook-data'
DATA_DIR = os.path.join(REPO_DIR, 'data', 'dishes')

# 分类映射：howtocook 目录 → 我们的分类
CATEGORY_MAP = {
    'meat_dish':      {'category': 'meat',      'categoryName': '肉菜'},
    'aquatic':        {'category': 'meat',      'categoryName': '肉菜'},
    'vegetable_dish': {'category': 'vegetable', 'categoryName': '素菜'},
    'soup':           {'category': 'vegetable', 'categoryName': '素菜'},
    'staple':         {'category': 'noodle',    'categoryName': '面食'},
    'breakfast':      {'category': 'noodle',    'categoryName': '面食'},
    'drink':          {'category': 'drink',     'categoryName': '饮品'},
    'dessert':        {'category': 'drink',     'categoryName': '饮品'},
    'condiment':      {'category': 'meat',      'categoryName': '肉菜'},
    'semi-finished':  {'category': 'meat',      'categoryName': '肉菜'},
}


def parse_difficulty(text):
    """从文本中提取难度星级（1-5）"""
    match = re.search(r'预估烹饪难度[：:]\s*(★+)', text)
    if match:
        stars = len(match.group(1))
        return min(stars, 5)  # 最多5星
    # 尝试从描述中找难度
    match = re.search(r'★+', text[:500])
    if match:
        return min(len(match.group(0)), 5)
    return 2  # 默认中等难度


def parse_ingredients(text):
    """从 '必备原料和工具' 部分提取食材列表"""
    ingredients = []

    # 找到 "## 必备原料和工具" 和下一个 "##" 之间的内容
    match = re.search(r'##\s*必备原料和工具\s*\n(.*?)(?=\n##|\Z)', text, re.DOTALL)
    if not match:
        return ingredients

    section = match.group(1)

    # 提取所有 "- xxx" 或 "* xxx" 或 "+ xxx" 列表项
    for line in section.split('\n'):
        line = line.strip()
        if line.startswith('- ') or line.startswith('* ') or line.startswith('+ '):
            item = line[2:].strip()
            # 去掉图片链接
            item = re.sub(r'!\[.*?\]\(.*?\)', '', item).strip()
            # 去掉多余空格
            item = re.sub(r'\s+', ' ', item).strip()
            if item and len(item) < 30:
                ingredients.append(item)

    return ingredients


def parse_recipe_steps(text):
    """从 '操作' 部分提取做法步骤"""
    steps = []

    # 找到 "## 操作" 和下一个 "##" 之间的内容
    match = re.search(r'##\s*操作\s*\n(.*?)(?=\n## |\Z)', text, re.DOTALL)
    if not match:
        return steps

    section = match.group(1)

    # 提取所有列表项（包括子列表），合并为步骤
    for line in section.split('\n'):
        line = line.strip()
        # 匹配 "- xxx" 或 "* xxx" 或 "+ xxx" 格式
        if re.match(r'^[-*+]\s+', line):
            step = re.sub(r'^[-*+]\s+', '', line).strip()
            # 去掉图片链接
            step = re.sub(r'!\[.*?\]\(.*?\)', '', step).strip()
            step = re.sub(r'\s+', ' ', step).strip()
            if step and len(step) > 2:
                steps.append(step)

    return steps


def find_recipe_files():
    """遍历所有菜谱 Markdown 文件"""
    recipes = []

    for folder_name in os.listdir(DATA_DIR):
        folder_path = os.path.join(DATA_DIR, folder_name)
        if not os.path.isdir(folder_path):
            continue

        # 检查是否在分类映射中
        if folder_name not in CATEGORY_MAP:
            continue

        cat_info = CATEGORY_MAP[folder_name]

        # 遍历文件夹中的 .md 文件
        for item in os.listdir(folder_path):
            item_path = os.path.join(folder_path, item)

            md_file = None
            if item.endswith('.md') and item != '.DS_Store':
                # 直接是 .md 文件
                md_file = item_path
                dish_name = item[:-3]  # 去掉 .md
            elif os.path.isdir(item_path):
                # 是子目录，找里面的 .md 文件
                for sub_item in os.listdir(item_path):
                    if sub_item.endswith('.md'):
                        md_file = os.path.join(item_path, sub_item)
                        dish_name = item  # 目录名即为菜名
                        break

            if md_file:
                recipes.append({
                    'file': md_file,
                    'name': dish_name,
                    'category': cat_info['category'],
                    'categoryName': cat_info['categoryName'],
                    'folder': folder_name
                })

    return recipes


def parse_recipe_file(file_path):
    """解析单个菜谱 Markdown 文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f'  读取失败: {e}')
        return None

    difficulty = parse_difficulty(content)
    ingredients = parse_ingredients(content)
    steps = parse_recipe_steps(content)

    # 将步骤编号后拼接为文本
    recipe_text = '\n'.join(f'{i+1}. {s}' for i, s in enumerate(steps))

    return {
        'difficulty': difficulty,
        'ingredients': ingredients,
        'recipe': recipe_text,
        'step_count': len(steps)
    }


def main():
    print(f'数据目录: {DATA_DIR}')

    if not os.path.isdir(DATA_DIR):
        print(f'错误: 找不到数据目录 {DATA_DIR}')
        print('请先克隆 howtocook 仓库到上级目录')
        return

    # 查找所有菜谱文件
    recipe_entries = find_recipe_files()
    print(f'找到 {len(recipe_entries)} 个菜谱文件')

    # 解析每个文件
    results = []
    errors = []

    for i, entry in enumerate(recipe_entries):
        print(f'[{i+1}/{len(recipe_entries)}] 解析: {entry["name"]} ({entry["folder"]})')

        parsed = parse_recipe_file(entry['file'])
        if parsed is None:
            errors.append(entry['name'])
            continue

        if len(parsed['ingredients']) == 0 and len(parsed['recipe']) == 0:
            errors.append(f'{entry["name"]} (空内容)')
            continue

        results.append({
            'name': entry['name'],
            'category': entry['category'],
            'categoryName': entry['categoryName'],
            'ingredients': parsed['ingredients'],
            'recipe': parsed['recipe'],
            'difficulty': parsed['difficulty'],
            'source': 'howtocook'
        })

    # 输出结果
    output_path = os.path.join(os.path.dirname(__file__), 'recipes.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print('\nDone!')
    print(f'成功解析: {len(results)} 道菜谱')
    print(f'解析失败: {len(errors)} 道')
    if errors:
        print(f'失败列表: {", ".join(errors[:10])}')
    print(f'输出文件: {output_path}')

    # 按分类统计
    stats = {}
    for r in results:
        cat = r['categoryName']
        stats[cat] = stats.get(cat, 0) + 1
    print(f'\n分类统计:')
    for cat, count in sorted(stats.items()):
        print(f'  {cat}: {count} 道')


if __name__ == '__main__':
    main()
