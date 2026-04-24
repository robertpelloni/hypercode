import os
import re
import sys

def replace_in_content(content):
    content = content.replace("hypercode", "hypercode")
    content = content.replace("Hypercode", "Hypercode")
    content = content.replace("HYPERCODE", "HYPERCODE")
    return content

def rename_item(path):
    dirname, filename = os.path.split(path)
    new_filename = filename.replace("hypercode", "hypercode")
    new_filename = new_filename.replace("Hypercode", "Hypercode")
    new_filename = new_filename.replace("HYPERCODE", "HYPERCODE")
    
    if new_filename != filename:
        new_path = os.path.join(dirname, new_filename)
        # Handle cases where the target already exists (e.g. from a previous partial run)
        if os.path.exists(new_path):
             if os.path.isdir(path):
                 return path # Can't easily merge dirs here
        
        try:
            os.rename(path, new_path)
            print(f"Renamed: {path} -> {new_path}")
            return new_path
        except Exception as e:
            print(f"Error renaming {path}: {e}")
    return path

def process_dir(root_dir):
    # Walk bottom-up to rename files before their parent directories
    for root, dirs, files in os.walk(root_dir, topdown=False):
        if '.git' in root:
            continue
            
        for name in files:
            file_path = os.path.join(root, name)
            
            # 1. Replace in content
            try:
                # Read with binary to avoid decoding issues, but we only want to replace in text-like files
                with open(file_path, 'rb') as f:
                    raw = f.read()
                
                # Simple check for binary - if it has null bytes it's likely binary
                if b'\x00' not in raw:
                    try:
                        content = raw.decode('utf-8')
                        new_content = replace_in_content(content)
                        if new_content != content:
                            with open(file_path, 'w', encoding='utf-8', newline='') as f:
                                f.write(new_content)
                            print(f"Updated content: {file_path}")
                    except UnicodeDecodeError:
                        pass # Skip non-utf8
            except Exception as e:
                print(f"Error processing content of {file_path}: {e}")
            
            # 2. Rename the file
            rename_item(file_path)
            
        for name in dirs:
            if name == '.git': continue
            dir_path = os.path.join(root, name)
            rename_item(dir_path)

if __name__ == "__main__":
    target = "."
    if len(sys.argv) > 1:
        target = sys.argv[1]
    process_dir(target)
