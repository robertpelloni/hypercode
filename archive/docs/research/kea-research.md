
# Kea Research Analysis

**Source**: `external/research/kea-research`
**Type**: Mixture of Agents (MoA) / Consensus Engine
**Language**: Python (FastAPI)

## Core Mechanism (Pipeline)
The backend implements a 4-step pipeline to improve answer quality through multi-model collaboration:

1.  **Initial Responses**: Queries multiple providers (Claude, Gemini, OpenAI, etc.) in parallel.
2.  **MoA Refinement**: Each provider sees all Step 1 responses and creates an improved answer.
3.  **Peer Evaluation**: Providers rank and evaluate each other's Step 2 responses.
4.  **Synthesis**: The best-ranked provider synthesizes the final answer.

## Relevance to Hypercode
-   **Council Logic**: This architecture is perfect for the "Council" or "Director" to make high-stakes decisions by querying multiple models.
-   **Not Web Research**: Unlike "Deep Research" (which implies web crawling), Kea focuses on *reasoning* and *consensus* among models.
-   **Integration**: We can adapt `PipelineOrchestrator` to running within `packages/core` using a similar multi-model strategy, potentially utilizing our `ModelSelector`.

## Structure
-   `app/services/pipeline.py`: Main orchestrator logic.
-   `app/providers/`: implementations for different LLM APIs.
-   `app/models/`: Pydantic models for responses and state.
