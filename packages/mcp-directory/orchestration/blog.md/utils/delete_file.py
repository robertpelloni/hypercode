import os
from typing import Tuple

def delete_file(target_file: str) -> Tuple[str, bool]:
    """
    Remove a file from the file system.
    
    Args:
        target_file: Path to the file to delete
    
    Returns:
        Tuple of (result message, success status)
    """
    try:
        if not os.path.exists(target_file):
            return f"File {target_file} does not exist", False
        
        os.remove(target_file)
        return f"Successfully deleted {target_file}", True
            
    except Exception as e:
        return f"Error deleting file: {str(e)}", False


if __name__ == "__main__":
    # Test delete_file with a temporary file
    temp_file = "temp_delete_test.txt"
    
    # First create a test file
    try:
        with open(temp_file, 'w') as f:
            f.write("This is a test file for deletion testing.")
        print(f"Created test file: {temp_file}")
    except Exception as e:
        print(f"Error creating test file: {str(e)}")
        exit(1)
    
    # Test if file exists
    if os.path.exists(temp_file):
        print(f"Test file exists: {temp_file}")
    else:
        print(f"Error: Test file does not exist")
        exit(1)
    
    # Test deleting the file
    delete_result, delete_success = delete_file(temp_file)
    print(f"Delete result: {delete_result}, success: {delete_success}")
    
    # Verify the file was deleted
    if not os.path.exists(temp_file):
        print("File was successfully deleted")
    else:
        print("Error: File was not deleted")
    
    # Test deleting a non-existent file
    delete_result, delete_success = delete_file("non_existent_file.txt")
    print(f"\nDelete non-existent file result: {delete_result}, success: {delete_success}") 