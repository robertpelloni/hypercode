
import os
import re
import subprocess
import sys

# Map headers in LINKS_TO_PROCESS.md to target directories
# Normalize headers to match partial strings
DIR_MAPPING = {
    "MCP Directories": "mcp-hubs",
    "Skills": "skills",
    "Multi Agent Orchestration": "multi-agent",
    "CLIs": "cli-harnesses", 
    "MCPs, misc": "mcp-servers",
    "Code indexing": "code-indexing",
    "Memory systems": "memory",
    "MCP reduce context": "mcp-servers/optimization", 
    "RAG": "RAG",
    "Database": "database",
    "Computer-use": "computer-use",
    "Code sandboxing": "code-sandbox",
    "Search": "search",
    "Routers, providers": "mcp-routers" 
}

SOURCE_FILE = "LINKS_TO_PROCESS.md"
LOG_FILE = "SUBMODULE_ADDITION_LOG.txt"

def get_target_dir(header):
    for key, path in DIR_MAPPING.items():
        if key.lower() in header.lower():
            return path
    return "misc"

def get_repo_name(url):
    # Extract owner and repo from https://github.com/owner/repo
    match = re.search(r"github\.com/([^/]+)/([^/]+)", url)
    if match:
        return match.group(1), match.group(2).replace(".git", "")
    return None, None

def add_submodule(url, target_dir):
    owner, repo = get_repo_name(url)
    if not repo:
        print(f"Skipping non-github URL: {url}")
        return

    # Create target directory if it doesn't exist
    if not os.path.exists(target_dir):
        os.makedirs(target_dir, exist_ok=True)

    # Construct submodule path
    # Try just repo name first
    submodule_path = os.path.join(target_dir, repo)
    
    # Check if submodule path already exists (directory not empty)
    if os.path.exists(submodule_path) and os.listdir(submodule_path):
        # Try appending owner
        submodule_path = os.path.join(target_dir, f"{repo}-{owner}")
        if os.path.exists(submodule_path) and os.listdir(submodule_path):
             print(f"Skipping {url}, submodule path {submodule_path} likely already exists.")
             return

    print(f"Adding submodule {url} to {submodule_path}...")
    
    try:
        cmd = ["git", "submodule", "add", url, submodule_path]
        # Run process
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
        
        with open(LOG_FILE, "a") as f:
            if result.returncode == 0:
                f.write(f"SUCCESS: {url} -> {submodule_path}\n")
                print(f"SUCCESS: {submodule_path}")
            else:
                if "already exists" in result.stderr:
                    f.write(f"EXISTS: {url} -> {submodule_path}\n")
                    print(f"EXISTS: {submodule_path}")
                else:
                    f.write(f"FAILED: {url} -> {submodule_path}\nError: {result.stderr}\n")
                    print(f"FAILED: {result.stderr}")

    except Exception as e:
        print(f"Exception adding {url}: {e}")
        with open(LOG_FILE, "a") as f:
            f.write(f"EXCEPTION: {url} -> {e}\n")

def process_file():
    # Only process if file exists at strict path, otherwise look in artifacts
    source = SOURCE_FILE
    if not os.path.exists(source):
        # Fallback to absolute path provided in previous turn if needed, or assume workspace root
        source = r"c:\Users\hyper\.gemini\antigravity\brain\09cc9be2-869c-4467-8e98-a4a2eb27e838\LINKS_TO_PROCESS.md"
        if not os.path.exists(source):
            print(f"Could not find {SOURCE_FILE}")
            return

    current_header = ""
    with open(source, "r") as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        if line.startswith("##"):
            current_header = line.replace("##", "").strip()
            print(f"\nProcessing section: {current_header}")
        elif line.startswith("- [ ]") or line.startswith("- [x]"):
            match = re.search(r"\((https?://[^\)]+)\)|(https?://\S+)", line)
            if match:
                url = match.group(1) or match.group(2)
                if "github.com" in url:
                    target_dir = get_target_dir(current_header)
                    add_submodule(url, target_dir)

if __name__ == "__main__":
    process_file()
