import os
import sys

def replace_in_content(content):
    content = content.replace("3006", "4000")
    content = content.replace("3847", "4000")
    return content

def process_dir(root_dir):
    for root, dirs, files in os.walk(root_dir, topdown=False):
        if '.git' in root or 'node_modules' in root or 'dist' in root:
            continue
            
        for name in files:
            file_path = os.path.join(root, name)
            try:
                with open(file_path, 'rb') as f:
                    raw = f.read()
                if b'\x00' not in raw:
                    try:
                        content = raw.decode('utf-8')
                        new_content = replace_in_content(content)
                        if new_content != content:
                            with open(file_path, 'w', encoding='utf-8', newline='') as f:
                                f.write(new_content)
                            print(f"Updated content: {file_path}")
                    except UnicodeDecodeError:
                        pass
            except Exception as e:
                print(f"Error processing content of {file_path}: {e}")

if __name__ == "__main__":
    process_dir("apps/hypercode-extension")
