import os
import shutil

src_root = '../hypercode-push'
dest_root = '.'
exclude_dirs = {'.git', 'node_modules', 'archive', '.next', 'dist', 'release'}

def sync_ws():
    for root, dirs, files in os.walk(src_root):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        rel_path = os.path.relpath(root, src_root)
        dest_dir = os.path.join(dest_root, rel_path) if rel_path != '.' else dest_root
        
        os.makedirs(dest_dir, exist_ok=True)
        
        for file in files:
            src_file = os.path.join(root, file)
            dest_file = os.path.join(dest_dir, file)
            
            shutil.copy2(src_file, dest_file)
            print(f"Copied {src_file} to {dest_file}")

if __name__ == "__main__":
    sync_ws()
