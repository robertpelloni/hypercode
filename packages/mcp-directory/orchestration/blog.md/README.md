<h1 align="center">Build Cursor with Cursor</h1>

Cursor is cool! But what if we use it to build an open-source, customizable AI coding agent? We’ll develop a “Cursor Agent” that writes, reviews, and refactors code—right within Cursor itself. It’s meta, it’s moddable, and it’s powered by the power of Cursor. Let’s build Cursor…with Cursor.

<p align="center">
  <a href="https://youtu.be/HH7TZFgoqEQ" target="_blank">
    <img 
      src="./assets/banner.png" width="600"
    />
  </a>
</p>

- To install: 
  ```bash
  pip install -r requirements.txt
  ```

- To run the Agent
  ```bash
  python main.py --query "For Trusted by industry leaders, add two more boxes." --working-dir ./project
  ```

- **How does it work?** The best starting point to learn is the [design doc](docs/design.md) and the [flow code](flow.py).

- **Note**: This project hasn't been pressure-tested or optimized. We intentionally keep it simple for learning.

## I built this Cursor Agent using Cursor itself! 

- I built using [**Agentic Coding**](https://the-pocket.github.io/PocketFlow/guide.html), the fastest development paradigm, where humans simply [design](docs/design.md) and agents [code](flow.py).

- The secret weapon is [Pocket Flow](https://github.com/The-Pocket/PocketFlow), a 100-line LLM framework that lets Agents (e.g., Cursor AI) build for you
  
- Step-by-step YouTube development tutorial:

  <br>
  <div align="center">
    <a href="https://youtu.be/HH7TZFgoqEQ" target="_blank">
      <img src="./assets/tutorial.png" width="500" alt="IMAGE ALT TEXT" style="cursor: pointer;">
    </a>
  </div>
  <br>

## Examples

We provide an example `project` of SaaS product homepage for the code agent to edit.

To run the page:

```
cd project
npm install
npm run dev
```

Here are some example queries you can try:
```bash
python main.py --query "For Trusted by industry leaders, add two more boxes." --working-dir ./project
```
