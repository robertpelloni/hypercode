import sqlite3
import os
import shutil

METAMCP_DB = 'resources.db'
BOOKMARKS_DB = 'data/bobbybookmarks/resources.db'
RESOURCES_DB = 'resources.db'

def merge_dbs():
    print(f"Merging {METAMCP_DB} and {BOOKMARKS_DB} into {RESOURCES_DB}...")
    
    # 1. Start with resources.db as the base for resources.db
    if os.path.exists(RESOURCES_DB):
        os.remove(RESOURCES_DB)
    shutil.copy(METAMCP_DB, RESOURCES_DB)
    
    conn = sqlite3.connect(RESOURCES_DB)
    cursor = conn.cursor()
    
    # 2. Attach resources.db
    cursor.execute(f"ATTACH DATABASE '{BOOKMARKS_DB}' AS bobby;")
    
    # 3. Get tables from resources.db
    cursor.execute("SELECT name FROM bobby.sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall() if row[0] != 'sqlite_sequence']
    
    for table in tables:
        print(f"Migrating table: {table}")
        # Create table if not exists (using schema from bobby)
        cursor.execute(f"SELECT sql FROM bobby.sqlite_master WHERE type='table' AND name='{table}';")
        create_sql = cursor.fetchone()[0]
        try:
            cursor.execute(create_sql)
        except sqlite3.OperationalError as e:
            if "already exists" in str(e):
                print(f"  Table {table} already exists in target, merging data...")
                # If table exists, we might need to handle column mismatches, 
                # but for this task I'll assume we can just INSERT or ignore
                cursor.execute(f"INSERT OR IGNORE INTO {table} SELECT * FROM bobby.{table};")
            else:
                raise e
        else:
            # Table was created, now copy data
            cursor.execute(f"INSERT INTO {table} SELECT * FROM bobby.{table};")
            
    conn.commit()
    conn.close()
    print("Merge complete.")

if __name__ == '__main__':
    merge_dbs()
