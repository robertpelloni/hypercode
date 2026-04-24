import sys
import json
import asyncio
import os

# Try importing browser_use
try:
    from browser_use import Agent
    from langchain_openai import ChatOpenAI
except ImportError as e:
    # Fail gracefully if dependencies are missing (will be reported to Node.js)
    pass

async def handle_task(task, headless=True):
    try:
        # Initialize the model
        # Using GPT-4o by default as recommended for browser-use
        llm = ChatOpenAI(model="gpt-4o", temperature=0.0)
        
        # Initialize agent
        agent = Agent(
            task=task,
            llm=llm,
        )
        
        # Run
        result = await agent.run()
        return {"result": str(result), "status": "success"}
        
    except Exception as e:
        return {"error": str(e), "status": "error"}

async def main():
    # Check if imports failed
    if 'Agent' not in globals():
        print(json.dumps({"error": "browser-use or langchain-openai not installed", "status": "error"}))
        sys.stdout.flush()
        # Consume stdin to prevent broken pipes if caller sends more
        sys.stdin.read() 
        return

    # NDJSON loop
    for line in sys.stdin:
        if not line.strip():
            continue
            
        try:
            request = json.loads(line)
            task = request.get("task")
            headless = request.get("headless", True)
            
            if not task:
                print(json.dumps({"error": "No task provided", "status": "error"}))
                sys.stdout.flush()
                continue
                
            response = await handle_task(task, headless)
            print(json.dumps(response))
            sys.stdout.flush()
            
        except Exception as e:
            print(json.dumps({"error": str(e), "status": "error"}))
            sys.stdout.flush()

if __name__ == "__main__":
    asyncio.run(main())
