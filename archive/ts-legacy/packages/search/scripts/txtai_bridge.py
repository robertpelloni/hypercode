import sys
import json
import asyncio
import os

# Try importing txtai
try:
    from txtai.embeddings import Embeddings
except ImportError:
    pass

class TxtAIBridge:
    def __init__(self):
        self.embeddings = None
        # Basic in-memory index for demo/verification
        self.data = []

    def load(self):
        if 'Embeddings' not in globals():
            return {"error": "txtai not installed"}
        try:
            self.embeddings = Embeddings({"path": "sentence-transformers/all-MiniLM-L6-v2"})
            return {"status": "loaded"}
        except Exception as e:
            return {"error": str(e)}

    def index(self, documents):
        if not self.embeddings:
            return {"error": "Index not loaded"}
        try:
            # documents is list of (id, text, metadata)
            self.embeddings.index(documents)
            self.data.extend(documents)
            return {"status": "indexed", "count": len(documents)}
        except Exception as e:
            return {"error": str(e)}

    def search(self, query, limit=5):
        if not self.embeddings:
            return {"error": "Index not loaded"}
        try:
            results = self.embeddings.search(query, limit)
            # txtai returns list of (id, score)
            # We want to return metadata too if possible, or just IDs
            return {"results": results}
        except Exception as e:
            return {"error": str(e)}

async def main():
    bridge = TxtAIBridge()
    
    # NDJSON loop
    for line in sys.stdin:
        if not line.strip():
            continue
            
        try:
            request = json.loads(line)
            command = request.get("command")
            payload = request.get("payload", {})
            
            response = {}
            
            if command == "load":
                response = bridge.load()
            elif command == "index":
                documents = payload.get("documents", []) # [(id, text, metadata)]
                response = bridge.index(documents)
            elif command == "search":
                query = payload.get("query")
                limit = payload.get("limit", 5)
                response = bridge.search(query, limit)
            else:
                response = {"error": f"Unknown command: {command}"}
                
            print(json.dumps(response))
            sys.stdout.flush()
            
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.stdout.flush()

if __name__ == "__main__":
    asyncio.run(main())
