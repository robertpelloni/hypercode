import os
import subprocess

def get_git_files():
    result = subprocess.run(['git', 'ls-files'], stdout=subprocess.PIPE, text=True)
    return [f for f in result.stdout.split('\n') if f]

def rename_paths():
    files = get_git_files()
    
    # Identify unique directories
    dirs = set()
    for f in files:
        d = os.path.dirname(f)
        while d:
            dirs.add(d)
            d = os.path.dirname(d)
            
    # Sort directories by depth descending so we rename deepest first
    dirs = sorted(list(dirs), key=lambda x: x.count('/'), reverse=True)
    
    # Rename directories
    for d in dirs:
        basename = os.path.basename(d)
        new_basename = basename.replace('borg', 'hypercode').replace('Borg', 'HyperCode').replace('BORG', 'HYPERCODE')
        if new_basename != basename:
            new_dir = os.path.join(os.path.dirname(d), new_basename).replace('\\', '/')
            print(f"Renaming dir: {d} -> {new_dir}")
            subprocess.run(['git', 'mv', d, new_dir])
            
    # Re-fetch files because paths might have changed
    result = subprocess.run(['git', 'ls-files'], stdout=subprocess.PIPE, text=True)
    files = [f for f in result.stdout.split('\n') if f]
    
    # Rename files
    for f in files:
        basename = os.path.basename(f)
        new_basename = basename.replace('borg', 'hypercode').replace('Borg', 'HyperCode').replace('BORG', 'HYPERCODE')
        if new_basename != basename:
            new_file = os.path.join(os.path.dirname(f), new_basename).replace('\\', '/')
            print(f"Renaming file: {f} -> {new_file}")
            subprocess.run(['git', 'mv', f, new_file])

if __name__ == '__main__':
    rename_paths()
