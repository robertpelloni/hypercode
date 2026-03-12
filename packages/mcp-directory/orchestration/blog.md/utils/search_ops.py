import os
import re
from typing import List, Dict, Any, Tuple, Optional

def grep_search(
    query: str,
    case_sensitive: bool = True,
    include_pattern: Optional[str] = None,
    exclude_pattern: Optional[str] = None,
    working_dir: str = ""
) -> Tuple[List[Dict[str, Any]], bool]:
    """
    Search through files for specific patterns using regex.
    
    Args:
        query: Regex pattern to find
        case_sensitive: Whether the search is case sensitive
        include_pattern: Glob pattern for files to include (e.g., "*.py")
        exclude_pattern: Glob pattern for files to exclude
        working_dir: Directory to search in (defaults to current directory if empty)
        
    Returns:
        Tuple of (list of matches, success status)
        Each match contains:
        {
            "file": file path,
            "line_number": line number (1-indexed),
            "content": matched line content
        }
    """
    results = []
    search_dir = working_dir if working_dir else "."
    
    try:
        # Compile the regex pattern
        try:
            pattern = re.compile(query, 0 if case_sensitive else re.IGNORECASE)
        except re.error as e:
            print(f"Invalid regex pattern: {str(e)}")
            return [], False
        
        # Convert glob patterns to regex for file matching
        include_regexes = _glob_to_regex(include_pattern) if include_pattern else None
        exclude_regexes = _glob_to_regex(exclude_pattern) if exclude_pattern else None
        
        # Walk through the directory and search files
        for root, _, files in os.walk(search_dir):
            for filename in files:
                # Skip files that don't match inclusion pattern
                if include_regexes and not any(r.match(filename) for r in include_regexes):
                    continue
                
                # Skip files that match exclusion pattern
                if exclude_regexes and any(r.match(filename) for r in exclude_regexes):
                    continue
                
                file_path = os.path.join(root, filename)
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for i, line in enumerate(f, 1):
                            if pattern.search(line):
                                results.append({
                                    "file": file_path,
                                    "line_number": i,
                                    "content": line.rstrip()
                                })
                                
                                # Limit to 50 results
                                if len(results) >= 50:
                                    break
                except Exception:
                    # Skip files that can't be read
                    continue
                
                if len(results) >= 50:
                    break
            
            if len(results) >= 50:
                break
        
        return results, True
    
    except Exception as e:
        print(f"Search error: {str(e)}")
        return [], False

def _glob_to_regex(pattern_str: str) -> List[re.Pattern]:
    """Convert comma-separated glob patterns to regex patterns."""
    patterns = []
    
    for glob in pattern_str.split(','):
        glob = glob.strip()
        if not glob:
            continue
        
        # Convert glob syntax to regex
        regex = (glob
                .replace('.', r'\.')  # Escape dots
                .replace('*', r'.*')  # * becomes .*
                .replace('?', r'.'))  # ? becomes .
        
        try:
            patterns.append(re.compile(f"^{regex}$"))
        except re.error:
            # Skip invalid patterns
            continue
    
    return patterns

if __name__ == "__main__":
    # Test the grep search function
    print("Testing basic search for 'def' in Python files:")
    results, success = grep_search("def", include_pattern="*.py")
    print(f"Search success: {success}")
    print(f"Found {len(results)} matches")
    for result in results[:5]:  # Print first 5 results
        print(f"{result['file']}:{result['line_number']}: {result['content'][:50]}...")
        
    # Test case for searching CSS color patterns with regex
    print("\nTesting CSS color search with regex:")
    css_query = r"background-color|background:|backgroundColor|light blue|#add8e6|rgb\(173, 216, 230\)"
    css_results, css_success = grep_search(
        query=css_query,
        case_sensitive=False,
        include_pattern="*.css,*.html,*.js,*.jsx,*.ts,*.tsx"
    )
    print(f"Search success: {css_success}")
    print(f"Found {len(css_results)} matches")
    for result in css_results[:5]:
        print(f"{result['file']}:{result['line_number']}: {result['content'][:50]}...") 