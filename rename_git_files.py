import os
import re
import subprocess

def get_git_files():
    result = subprocess.run(['git', 'ls-files'], stdout=subprocess.PIPE, text=True)
    return [f for f in result.stdout.split('\n') if f]

def replace_in_file(filepath):
    if not os.path.isfile(filepath):
        return
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return # Skip binary or non-utf8 files
        
    new_content = re.sub(r'\bborg\b', 'hypercode', content)
    new_content = re.sub(r'\bBorg\b', 'HyperCode', new_content)
    new_content = re.sub(r'\bBORG\b', 'HYPERCODE', new_content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

if __name__ == '__main__':
    files = get_git_files()
    for file in files:
        replace_in_file(file)
