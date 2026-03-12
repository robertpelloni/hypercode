import os
from typing import Tuple

def insert_file(target_file: str, content: str, line_number: int = None) -> Tuple[str, bool]:
    """
    Write or insert content to a target file.
    
    Args:
        target_file: Path to the file to modify
        content: The content to write or insert into the file
        line_number: Line number to insert at (1-indexed). If None, replace entire file.
    
    Returns:
        Tuple of (result message, success status)
    """
    try:
        # Create directories if they don't exist
        os.makedirs(os.path.dirname(os.path.abspath(target_file)), exist_ok=True)
        
        file_exists = os.path.exists(target_file)
        
        # Complete file replacement or new file creation
        if line_number is None:
            if file_exists:
                os.remove(target_file)
                operation = "replaced"
            else:
                operation = "created"
                
            # Create the file with new content
            with open(target_file, 'w', encoding='utf-8') as f:
                f.write(content)
                
            return f"Successfully {operation} {target_file}", True
        
        # Insert at specific line
        else:
            if not file_exists:
                # If file doesn't exist but line_number is specified, create it with empty lines
                lines = [''] * max(0, line_number - 1)
                operation = "created and inserted into"
            else:
                # Read existing content
                with open(target_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                operation = "inserted into"
                
            # Ensure line_number is valid
            if line_number < 1:
                return "Error: Line number must be at least 1", False
                
            # Calculate insert position with 1-indexed to 0-indexed conversion
            position = line_number - 1
            
            # If position is beyond the end, pad with newlines
            while len(lines) < position:
                lines.append('\n')
                
            # Insert content at specified position
            if position == len(lines):
                # Add at the end (may need newline if last line doesn't end with one)
                if lines and not lines[-1].endswith('\n'):
                    lines[-1] += '\n'
                lines.append(content)
            else:
                # Split the line at the insertion point if it exists
                lines.insert(position, content)
                
            # Write the updated content
            with open(target_file, 'w', encoding='utf-8') as f:
                f.writelines(lines)
                
            return f"Successfully {operation} {target_file} at line {line_number}", True
            
    except Exception as e:
        return f"Error inserting file: {str(e)}", False


if __name__ == "__main__":
    # Test insert_file with a temporary file
    temp_file = "temp_insert_test.txt"
    
    # Test creating a new file (complete replacement)
    new_content = "This is a test file.\nCreated for testing purposes."
    insert_result, insert_success = insert_file(temp_file, new_content)
    print(f"Create file result: {insert_result}, success: {insert_success}")
    
    # Verify the file was created
    if os.path.exists(temp_file):
        with open(temp_file, 'r') as f:
            content = f.read()
        print(f"File content:\n{content}")
    else:
        print("Error: File was not created")
    
    # Test inserting at a specific line
    insert_content = "This line was inserted at position 2.\n"
    insert_result, insert_success = insert_file(temp_file, insert_content, line_number=2)
    print(f"\nInsert at line 2 result: {insert_result}, success: {insert_success}")
    
    # Verify the insertion
    if os.path.exists(temp_file):
        with open(temp_file, 'r') as f:
            content = f.read()
        print(f"Updated file content:\n{content}")
    else:
        print("Error: File does not exist")
    
    # Test inserting at the end (beyond current length)
    insert_content = "This line was inserted at the end.\n"
    insert_result, insert_success = insert_file(temp_file, insert_content, line_number=10)
    print(f"\nInsert at line 10 result: {insert_result}, success: {insert_success}")
    
    # Verify the insertion
    if os.path.exists(temp_file):
        with open(temp_file, 'r') as f:
            content = f.read()
        print(f"Updated file content:\n{content}")
    else:
        print("Error: File does not exist")
    
    # Clean up - delete the temporary file
    try:
        os.remove(temp_file)
        print(f"\nSuccessfully deleted {temp_file}")
    except Exception as e:
        print(f"Error deleting file: {str(e)}") 