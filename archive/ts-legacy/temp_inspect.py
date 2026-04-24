import sqlite3
import os

db_path = 'data/bobbybookmarks/resources.db'
if not os.path.exists(db_path):
    print(f"File not found: {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='bookmarks'")
row = cursor.fetchone()
if row:
    print(row[0])
else:
    print("Table 'bookmarks' not found.")
conn.close()
