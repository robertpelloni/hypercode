import os
import shutil
import subprocess

# Paths
primary_ws = '.'
push_ws = '../hypercode-push'

# Directories to exclude from sync
exclude_dirs = {'.git', 'node_modules', '.next', 'dist', 'release'}

def sync_ws():
    # 1. Get status from primary workspace
    result = subprocess.run(['git', 'status', '--short'], capture_output=True, text=True)
    lines = result.stdout.splitlines()
    
    for line in lines:
        status = line[:2].strip()
        file_path = line[3:].strip()
        
        # Skip excluded dirs
        if any(ex in file_path for ex in exclude_dirs):
            continue
            
        src = os.path.join(primary_ws, file_path)
        dest = os.path.join(push_ws, file_path)
        
        if status == 'M' or status == '??' or status == 'A':
            # Create parent dirs in dest
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            
            if os.path.isdir(src):
                if os.path.exists(dest):
                    shutil.rmtree(dest)
                shutil.copytree(src, dest, ignore=shutil.ignore_patterns('.git', 'node_modules'))
                print(f"Synced dir: {file_path}")
            else:
                shutil.copy2(src, dest)
                print(f"Synced file: {file_path}")
                
        elif status == 'D':
            if os.path.exists(dest):
                if os.path.isdir(dest):
                    shutil.rmtree(dest)
                else:
                    os.remove(dest)
                print(f"Removed from dest: {file_path}")

if __name__ == "__main__":
    sync_ws()
