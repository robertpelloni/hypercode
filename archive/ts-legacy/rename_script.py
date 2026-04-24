import os
import re

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return
        
<<<<<<< HEAD:archive/ts-legacy/rename_script.py
    new_content = re.sub(r'\bhypercode\b', 'hypercode', content)
    new_content = re.sub(r'\bHypercode\b', 'HyperCode', new_content)
    new_content = re.sub(r'\bHYPERCODE\b', 'HYPERCODE', new_content)
=======
    new_content = re.sub(r'\bborg\b', 'borg', content)
    new_content = re.sub(r'\bBorg\b', 'borg', new_content)
    new_content = re.sub(r'\bBORG\b', 'borg', new_content)
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:rename_script.py
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('.', topdown=False):
    if '.git' in root or 'node_modules' in root or '.turbo' in root or 'dist' in root or 'build' in root:
        continue
    for file in files:
        replace_in_file(os.path.join(root, file))
