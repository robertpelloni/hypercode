import os
from typing import Tuple
from utils.remove_file import remove_file
from utils. insert_file import insert_file

def replace_file(target_file: str, start_line: int, end_line: int, content: str) -> Tuple[str, bool]:
    """
    Replace content in a file between specified line numbers.
    
    Args:
        target_file: Path to the file to modify
        start_line: Starting line number to replace (1-indexed)
        end_line: Ending line number to replace (1-indexed, inclusive)
        content: The new content to replace the specified lines with
    
    Returns:
        Tuple of (result message, success status)
    """

    try:
        # Check if file exists
        if not os.path.exists(target_file):
            return f"Error: File {target_file} does not exist", False
        
        # Validate line numbers
        if start_line < 1:
            return "Error: start_line must be at least 1", False
        
        if end_line < 1:
            return "Error: end_line must be at least 1", False
        
        if start_line > end_line:
            return "Error: start_line must be less than or equal to end_line", False
        
        # First, remove the specified lines
        remove_result, remove_success = remove_file(target_file, start_line, end_line)
        
        if not remove_success:
            return f"Error during remove step: {remove_result}", False
        
        # Then, insert the new content at the start line
        insert_result, insert_success = insert_file(target_file, content, start_line)
        
        if not insert_success:
            return f"Error during insert step: {insert_result}", False
        
        return f"Successfully replaced lines {start_line} to {end_line} in {target_file}", True
        
    except Exception as e:
        return f"Error replacing content: {str(e)}", False

if __name__ == "__main__":
    # Test replace_file with a temporary file
    temp_file = "temp_replace_test.txt"
    
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
    
    # Test replacing specific lines (3-5)
    new_content = "This is the new line 3.\nThis is the new line 4.\nThis is the new line 5.\n"
    replace_result, replace_success = replace_file(temp_file, 3, 5, new_content)
    print(f"\nReplace lines 3-5 result: {replace_result}, success: {replace_success}")
    
    # Show the updated content
    with open(temp_file, 'r') as f:
        content = f.read()
    print(f"Updated file content:\n{content}")
    
    # Test replacing with a different number of lines
    new_content = "This is the replacement text.\nIt has only two lines instead of three.\n"
    replace_result, replace_success = replace_file(temp_file, 7, 9, new_content)
    print(f"\nReplace lines 7-9 with 2 lines result: {replace_result}, success: {replace_success}")
    
    # Show the updated content
    with open(temp_file, 'r') as f:
        content = f.read()
    print(f"Updated file content:\n{content}")
    
    # Clean up - delete the test file
    try:
        os.remove(temp_file)
        print(f"\nSuccessfully deleted {temp_file} for cleanup")
    except Exception as e:
        print(f"Error deleting file: {str(e)}")
    
    # Example of how to append content using remove_file + insert_file
    print("\n=== APPEND EXAMPLE ===")
    
    # Create a new test file
    append_file_path = "append_test.txt"
    try:
        with open(append_file_path, 'w') as f:
            for i in range(1, 4):
                f.write(f"Original line {i}.\n")
        print(f"Created test file with 3 lines: {append_file_path}")
    except Exception as e:
        print(f"Error creating test file: {str(e)}")
        exit(1)
        
    # Show initial content
    with open(append_file_path, 'r') as f:
        content = f.read()
    print(f"Initial file content:\n{content}")
    
    # Count lines in the file to determine where to append
    with open(append_file_path, 'r') as f:
        line_count = len(f.readlines())
    
    # Append by using remove_file + insert_file
    # Step 1: Remove non-existent line at position just after file end
    # This won't delete anything but prepares for insertion
    remove_result, remove_success = remove_file(append_file_path, line_count + 1, line_count + 1)
    print(f"\nRemove step result: {remove_result}, success: {remove_success}")
    
    # Step 2: Insert new content at the position just after file end
    append_content = "This is appended line 1.\nThis is appended line 2.\n"
    insert_result, insert_success = insert_file(append_file_path, append_content, line_count + 1)
    print(f"Insert step result: {insert_result}, success: {insert_success}")
    
    # Show the updated content
    with open(append_file_path, 'r') as f:
        content = f.read()
    print(f"Updated file content after append:\n{content}")
    
    # Test appending again
    # First, get the new line count
    with open(append_file_path, 'r') as f:
        line_count = len(f.readlines())
    
    # Append one more line using the same technique
    remove_result, remove_success = remove_file(append_file_path, line_count + 1, line_count + 1)
    append_content = "This is another appended line.\n"
    insert_result, insert_success = insert_file(append_file_path, append_content, line_count + 1)
    
    # Show the final content
    with open(append_file_path, 'r') as f:
        content = f.read()
    print(f"\nFinal file content after second append:\n{content}")
    
    # Let's test appending at a specific position rather than at the end
    # For example, let's append at position line_count + 2 (skipping a line)
    with open(append_file_path, 'r') as f:
        line_count = len(f.readlines())
    
    # Remove the specific line we want to replace (even if it doesn't exist)
    remove_result, remove_success = remove_file(append_file_path, line_count + 2, line_count + 2)
    print(f"\nRemove at position {line_count + 2} result: {remove_result}, success: {remove_success}")
    
    # Insert the content at that specific position
    # This will automatically add a blank line between the current end of file and our new content
    append_content = "This line was inserted at line_count + 2, creating a blank line before it.\n"
    insert_result, insert_success = insert_file(append_file_path, append_content, line_count + 2)
    print(f"Insert at position {line_count + 2} result: {insert_result}, success: {insert_success}")
    
    # Show the final content
    with open(append_file_path, 'r') as f:
        content = f.read()
    print(f"\nFinal file content after inserting at line_count + 2:\n{content}")
    
    # Clean up - delete the test file
    try:
        os.remove(append_file_path)
        print(f"\nSuccessfully deleted {append_file_path} for cleanup")
    except Exception as e:
        print(f"Error deleting file: {str(e)}")