import os
import re

def replace_in_file(filepath):
    if not os.path.isfile(filepath):
        return
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return # Skip binary or non-utf8 files
        
    new_content = content.replace('resources.db', 'resources.db')
    new_content = new_content.replace('resources.db', 'resources.db')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def main():
    for root, dirs, files in os.walk('.'):
        if '.git' in root or 'node_modules' in root or '.turbo' in root or 'dist' in root or 'build' in root:
            continue
        for file in files:
            replace_in_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
