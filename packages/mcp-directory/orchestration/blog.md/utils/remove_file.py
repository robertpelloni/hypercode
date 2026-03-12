import os
from typing import Tuple

def remove_file(target_file: str, start_line: int = None, end_line: int = None) -> Tuple[str, bool]:
    """
    Remove content from a file based on line numbers.
    At least one of start_line or end_line must be specified.
    
    Args:
        target_file: Path to the file to modify
        start_line: Starting line number to remove (1-indexed)
        end_line: Ending line number to remove (1-indexed, inclusive)
                  If None, removes to the end of the file
    
    Returns:
        Tuple of (result message, success status)
    """
    try:
        # Check if file exists
        if not os.path.exists(target_file):
            return f"Error: File {target_file} does not exist", False
        
        # Require at least one of start_line or end_line to be specified
        if start_line is None and end_line is None:
            return "Error: At least one of start_line or end_line must be specified", False
        
        # Read the file content
        with open(target_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Validate line numbers
        if start_line is not None and start_line < 1:
            return "Error: start_line must be at least 1", False
        
        if end_line is not None and end_line < 1:
            return "Error: end_line must be at least 1", False
        
        if start_line is not None and end_line is not None and start_line > end_line:
            return "Error: start_line must be less than or equal to end_line", False
        
        # Adjust for 1-indexed to 0-indexed
        start_idx = start_line - 1 if start_line is not None else 0
        end_idx = end_line - 1 if end_line is not None else len(lines) - 1
        
        # Don't report error if start_line is beyond file length
        # Just return success with a message indicating no lines were removed
        if start_idx >= len(lines):
            return f"No lines removed: start_line ({start_line}) exceeds file length ({len(lines)})", True
        
        # If end_line goes beyond file length, just remove to the end of the file
        end_idx = min(end_idx, len(lines) - 1)
        
        # Remove the specified lines
        del lines[start_idx:end_idx + 1]
        
        # Write the updated content back to the file
        with open(target_file, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        
        # Prepare message based on what was removed
        if start_line is None:
            message = f"Successfully removed lines 1 to {end_line} from {target_file}"
        elif end_line is None:
            message = f"Successfully removed lines {start_line} to end from {target_file}"
        else:
            message = f"Successfully removed lines {start_line} to {end_line} from {target_file}"
        
        return message, True
        
    except Exception as e:
        return f"Error removing content: {str(e)}", False


if __name__ == "__main__":
    # Test remove_file with a temporary file
    temp_file = "temp_remove_test.txt"
    
    # Create a test file with numbered lines
    try:
        with open(temp_file, 'w') as f:
            for i in range(1, 11):
                f.write(f"This is line {i} of the test file.\n")
        print(f"Created test file with 10 lines: {temp_file}")
    except Exception as e:
        print(f"Error creating test file: {str(e)}")
        exit(1)
    
    # Show the initial content
    with open(temp_file, 'r') as f:
        content = f.read()
    print(f"Initial file content:\n{content}")
    
    # Test removing specific lines (3-5)
    remove_result, remove_success = remove_file(temp_file, 3, 5)
    print(f"\nRemove lines 3-5 result: {remove_result}, success: {remove_success}")
    
    # Show the updated content
    with open(temp_file, 'r') as f:
        content = f.read()
    print(f"Updated file content:\n{content}")
    
    # Test removing lines from the start to a specific line
    remove_result, remove_success = remove_file(temp_file, None, 2)
    print(f"\nRemove lines 1-2 result: {remove_result}, success: {remove_success}")
    
    # Show the updated content
    with open(temp_file, 'r') as f:
        content = f.read()
    print(f"Updated file content:\n{content}")
    
    # Test removing lines from a specific line to the end
    remove_result, remove_success = remove_file(temp_file, 3, None)
    print(f"\nRemove lines 3 to end result: {remove_result}, success: {remove_success}")
    
    # Show the updated content
    with open(temp_file, 'r') as f:
        content = f.read()
    print(f"Updated file content:\n{content}")
    
    # Test attempting to delete the entire file (should fail now)
    remove_result, remove_success = remove_file(temp_file)
    print(f"\nAttempt to delete entire file result: {remove_result}, success: {remove_success}")
    
    # Clean up - manually delete the test file
    try:
        os.remove(temp_file)
        print(f"\nManually deleted {temp_file} for cleanup")
    except Exception as e:
        print(f"Error deleting file: {str(e)}") 