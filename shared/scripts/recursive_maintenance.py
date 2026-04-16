
import os
import subprocess
import sys

def run_command(command, cwd):
    """Run a shell command and return stdout, stderr, and return code."""
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            errors='replace' # Handle potential encoding issues
        )
        return result.stdout.strip(), result.stderr.strip(), result.returncode
    except Exception as e:
        return "", str(e), 1

def get_git_repos(root_dir):
    """Find all git repositories (directories containing .git) recursively."""
    repos = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # specific check for .git file (submodule) or dir (root)
        if '.git' in dirnames or '.git' in filenames:
            repos.append(dirpath)
            
            # Don't traverse into .git directories
            if '.git' in dirnames:
                dirnames.remove('.git')
    
    # Sort by depth descending (deepest first) to ensure children are processed before parents
    repos.sort(key=lambda p: p.count(os.sep), reverse=True)
    return repos

def get_default_branch(repo_path):
    """Try to determine the default branch (main or master)."""
    # Try fetching remote info
    out, _, _ = run_command("git remote show origin", repo_path)
    if "HEAD branch" in out:
        for line in out.split('\n'):
            if "HEAD branch" in line:
                return line.split(":")[1].strip()
    
    # Fallback: check local branches
    out, _, _ = run_command("git branch", repo_path)
    if "main" in out:
        return "main"
    if "master" in out:
        return "master"
    return "main" # Default guess

def process_repo(repo_path):
    print(f"\nProcessing: {repo_path}")
    
    # 1. Fetch all
    run_command("git fetch --all", repo_path)

    # 2. Check status and commit dirty changes
    status, _, _ = run_command("git status --porcelain", repo_path)
    if status:
        print("  - Changes detected. Committing...")
        run_command("git add .", repo_path)
        run_command('git commit -m "chore: save local progress before sync"', repo_path)
    
    # 3. Identify Branches
    current_branch, _, _ = run_command("git branch --show-current", repo_path)
    current_hash, _, _ = run_command("git rev-parse HEAD", repo_path)
    
    default_branch = get_default_branch(repo_path)
    print(f"  - Current: {current_branch or current_hash} | Default: {default_branch}")

    # 4. Merge Logic
    target_branch = default_branch
    
    # Check if we need to switch/merge
    if current_branch and current_branch != target_branch:
        print(f"  - Merging {current_branch} into {target_branch}...")
        
        # Checkout target
        out, err, code = run_command(f"git checkout {target_branch}", repo_path)
        if code != 0:
            print(f"  ! Failed to checkout {target_branch}. Creating it?")
            # If default branch doesn't exist locally but exists on remote, checkout track
            run_command(f"git checkout -b {target_branch} origin/{target_branch}", repo_path)

        # Pull target
        run_command(f"git pull origin {target_branch}", repo_path)
        
        # Merge current into target
        # Using --no-edit to avoid hanging on editor
        out, err, code = run_command(f"git merge {current_branch} --no-edit", repo_path)
        
        if code != 0:
            print("  ! Merge Conflict Detected.")
            # Strategy: Try to resolve using 'theirs' (incoming changes wins? or ours?)
            # Prompt asked "without losing any progress". 
            # Usually local changes (current_branch) are the progress.
            # So if we are on main, merging feature: feature is 'theirs'.
            # run_command("git merge --abort", repo_path)
            # run_command(f"git merge -X theirs {current_branch} --no-edit", repo_path)
            print("  ! Aborting merge to be safe. Pushing feature branch instead.")
            run_command("git merge --abort", repo_path)
            run_command(f"git checkout {current_branch}", repo_path)
            run_command(f"git push origin {current_branch}", repo_path)
            return # Stop here for this repo
        else:
            print("  - Merge successful.")
            # Push target
            run_command(f"git push origin {target_branch}", repo_path)
            
    elif not current_branch:
        # Detached HEAD
        print("  - Detached HEAD detected. Checking if we can merge into default.")
        # Checkout target
        run_command(f"git checkout {target_branch}", repo_path)
        run_command(f"git pull origin {target_branch}", repo_path)
        # Merge the specific hash
        out, err, code = run_command(f"git merge {current_hash} --no-edit", repo_path)
        if code == 0:
             print("  - Merge commit successful.")
             run_command(f"git push origin {target_branch}", repo_path)
        else:
             print("  ! Conflict merging commit. Aborting.")
             run_command("git merge --abort", repo_path)
             # Leave it detached? Or checkout back?
             run_command(f"git checkout {current_hash}", repo_path)

    else:
        # Already on target branch
        print(f"  - Already on {target_branch}. Syncing...")
        run_command(f"git pull origin {target_branch}", repo_path)
        run_command(f"git push origin {target_branch}", repo_path)

if __name__ == "__main__":
    root = os.getcwd()
    if len(sys.argv) > 1:
        root = sys.argv[1]
    
    print(f"Scanning repos in {root}...")
    repos = get_git_repos(root)
    print(f"Found {len(repos)} git repositories.")
    
    for repo in repos:
        process_repo(repo)
