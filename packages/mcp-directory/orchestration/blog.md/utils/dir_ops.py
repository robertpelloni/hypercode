import os
from typing import List, Dict, Any, Tuple

def _build_tree_str(items: List[Dict[str, Any]], prefix: str = "", is_last: bool = True, show_all: bool = True) -> str:
    """
    Helper function to build a tree-style string representation of the directory structure.
    Only shows one level of directories and limits files shown per directory.
    """
    tree_str = ""
    # Split items into directories and files
    dirs = [item for item in items if item["type"] == "directory"]
    files = [item for item in items if item["type"] == "file"]
    
    # Process directories first
    for i, item in enumerate(dirs):
        is_last_item = i == len(dirs) == 0 and len(files) == 0
        connector = "└──" if is_last_item else "├──"
        tree_str += f"{prefix}{connector} {item['name']}/\n"
        
        # For directories, just show count of contents
        if "children" in item:
            child_dirs = sum(1 for c in item["children"] if c["type"] == "directory")
            child_files = sum(1 for c in item["children"] if c["type"] == "file")
            next_prefix = prefix + ("    " if is_last_item else "│   ")
            if child_dirs > 0 or child_files > 0:
                summary = []
                if child_dirs > 0:
                    summary.append(f"{child_dirs} director{'y' if child_dirs == 1 else 'ies'}")
                if child_files > 0:
                    summary.append(f"{child_files} file{'s' if child_files != 1 else ''}")
                tree_str += f"{next_prefix}└── [{', '.join(summary)}]\n"
    
    # Then process files
    if files:
        for i, item in enumerate(files[:10]):
            is_last_item = i == len(files) - 1 if (len(files) <= 10 or i == 9) else False
            connector = "└──" if is_last_item else "├──"
            size_str = f" ({item['size'] / 1024:.1f} KB)" if item.get("size", 0) > 0 else ""
            tree_str += f"{prefix}{connector} {item['name']}{size_str}\n"
            
        # If there are more than 10 files, show ellipsis
        if len(files) > 10:
            tree_str += f"{prefix}└── ... ({len(files) - 10} more files)\n"
    
    return tree_str

def list_dir(relative_workspace_path: str) -> Tuple[bool, str]:
    """
    List contents of a directory (one level only).
    
    Args:
        relative_workspace_path: Path to list contents of, relative to the workspace root
        
    Returns:
        Tuple of (success status, tree visualization string)
    """
    def _list_dir_recursive(path: str, depth: int = 0) -> List[Dict[str, Any]]:
        items = []
        try:
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                is_dir = os.path.isdir(item_path)
                
                item_info = {
                    "name": item,
                    "path": item_path,
                    "type": "directory" if is_dir else "file"
                }
                
                if not is_dir:
                    try:
                        item_info["size"] = os.path.getsize(item_path)
                    except:
                        item_info["size"] = 0
                elif depth < 1:  # Only recurse one level
                    # Recursively list directory contents
                    item_info["children"] = _list_dir_recursive(item_path, depth + 1)
                    
                items.append(item_info)
                
            # Sort: directories first, then files (alphabetically within each group)
            items.sort(key=lambda x: (0 if x["type"] == "directory" else 1, x["name"]))
            
        except Exception as e:
            pass
        return items

    try:
        path = os.path.normpath(relative_workspace_path)
        
        if not os.path.exists(path):
            return False, ""
            
        if not os.path.isdir(path):
            return False, ""
            
        items = _list_dir_recursive(path)
        tree_str = _build_tree_str(items)
        
        return True, tree_str
        
    except Exception as e:
        return False, ""

if __name__ == "__main__":
    # Test the list_dir function
    success, tree_str = list_dir("..")
    print(f"Directory listing success: {success}")
    
    # Print tree visualization
    print("\nDirectory Tree:")
    print(tree_str) 