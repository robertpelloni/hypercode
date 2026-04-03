import sys
import json
import asyncio
import os

# Ensure the submoduled cognee is in path if needed, or assume installed in venv
# sys.path.append(os.path.join(os.path.dirname(__file__), "../../../external/memory/cognee"))

try:
    import cognee
    from cognee.api.v1.add import add
    from cognee.api.v1.cognify import cognify
    from cognee.api.v1.search import search
    from cognee.shared.data_models import DefaultContent
except ImportError:
    print(json.dumps({"error": "Cognee not installed or found in path"}))
    sys.exit(1)

async def handle_command(cmd, payload):
    if cmd == "add":
        # payload: { text: string, dataset: string }
        await add(payload["text"], payload.get("dataset", "hypercode_memory"))
        return {"status": "added"}
    
    elif cmd == "cognify":
        # payload: { dataset: string }
        await cognify(payload.get("dataset", "hypercode_memory"))
        return {"status": "cognified"}
    
    elif cmd == "search":
        # payload: { query: string, type: string }
        results = await search(payload["query"], payload.get("type", "INSIGHTS"))
        # Serialize results to simple list
        return {"results": [str(r) for r in results]}
        
    else:
        return {"error": f"Unknown command: {cmd}"}

async def main():
    # Read from stdin line by line (NDJSON style for python-shell)
    for line in sys.stdin:
        if not line.strip():
            continue
            
        try:
            request = json.loads(line)
            command = request.get("command")
            payload = request.get("payload", {})
            
            response = await handle_command(command, payload)
            print(json.dumps(response))
            sys.stdout.flush() # Ensure flush for realtime
        except Exception as e:
            # Send error as JSON
            print(json.dumps({"error": str(e)}))
            sys.stdout.flush()

if __name__ == "__main__":
    asyncio.run(main())
