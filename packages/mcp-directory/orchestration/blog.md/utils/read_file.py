import os
from typing import Tuple, Optional

def read_file(
    target_file: str, 
    start_line_one_indexed: Optional[int] = None, 
    end_line_one_indexed_inclusive: Optional[int] = None, 
    should_read_entire_file: bool = False
) -> Tuple[str, bool]:
    """
    Read content from a file with support for line ranges.
    Prepends 1-based line numbers to each line in the output.
    
    Args:
        target_file: Path to the file (relative or absolute)
        start_line_one_indexed: Starting line number (1-based). If None, defaults to reading entire file.
        end_line_one_indexed_inclusive: Ending line number (1-based). If None, defaults to reading entire file.
        should_read_entire_file: If True, ignore line parameters and read entire file
    
    Returns:
        Tuple of (file content with line numbers, success status)
    """
    try:
        if not os.path.exists(target_file):
            return f"Error: File {target_file} does not exist", False
        
        # If only target_file is provided or any line parameter is None, read the entire file
        if start_line_one_indexed is None or end_line_one_indexed_inclusive is None:
            should_read_entire_file = True
        
        with open(target_file, 'r', encoding='utf-8') as f:
            if should_read_entire_file:
                lines = f.readlines()
                # Add line numbers to each line
                numbered_lines = [f"{i+1}: {line}" for i, line in enumerate(lines)]
                return ''.join(numbered_lines), True
            
            # Validate line range parameters
            if start_line_one_indexed < 1:
                return "Error: start_line_one_indexed must be at least 1", False
            
            if end_line_one_indexed_inclusive < start_line_one_indexed:
                return "Error: end_line_one_indexed_inclusive must be >= start_line_one_indexed", False
            
            # Check if requested range exceeds 250 lines limit
            if end_line_one_indexed_inclusive - start_line_one_indexed + 1 > 250:
                return "Error: Cannot read more than 250 lines at once", False
            
            # Read the specified lines
            lines = f.readlines()
            
            # Adjust for one-indexed to zero-indexed
            start_idx = start_line_one_indexed - 1
            end_idx = end_line_one_indexed_inclusive - 1
            
            # Check if the requested range is out of bounds
            if start_idx >= len(lines):
                return f"Error: start_line_one_indexed ({start_line_one_indexed}) exceeds file length ({len(lines)})", False
            
            end_idx = min(end_idx, len(lines) - 1)
            
            # Add line numbers to the selected lines
            numbered_lines = [f"{i+1}: {lines[i]}" for i in range(start_idx, end_idx + 1)]
            
            return ''.join(numbered_lines), True
            
    except Exception as e:
        return f"Error reading file: {str(e)}", False

if __name__ == "__main__":
    # Create a path to the dummy text file
    dummy_file = "dummy_text.txt"
    
    # Test if dummy file exists
    if not os.path.exists(dummy_file):
        print(f"Dummy file {dummy_file} not found. Please create it first.")
        exit(1)
    
    # Test reading entire file with just the target file
    content, success = read_file(dummy_file)
    print(f"Read entire file with default parameters: success={success}")
    print(f"Content preview: {content[:150]}..." if len(content) > 150 else f"Content: {content}")
    
    # Test reading entire file explicitly
    content, success = read_file(dummy_file, should_read_entire_file=True)
    print(f"\nRead entire file explicitly: success={success}")
    print(f"Content preview: {content[:150]}..." if len(content) > 150 else f"Content: {content}")
    
    # Test reading specific lines
    content, success = read_file(dummy_file, 2, 4)
    print(f"\nRead lines 2-4: success={success}")
    print(f"Content:\n{content}")
    
    # Test reading with invalid parameters
    content, success = read_file(dummy_file, 0, 5)
    print(f"\nRead with invalid start line: success={success}")
    print(f"Message: {content}")
    
    # Test reading non-existent file
    content, success = read_file("non_existent_file.txt")
    print(f"\nRead non-existent file: success={success}")
    print(f"Message: {content}") 