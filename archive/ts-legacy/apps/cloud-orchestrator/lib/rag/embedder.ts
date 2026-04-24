// No imports needed, direct to fetch
/**
 * Generates an embedding for a given text chunk using the system's primary
 * embedding model (defaulting to OpenAI's text-embedding-ada-002 or text-embedding-3-small).
 * 
 * Note: getProvider in the Jules architecture abstracts the AI provider SDKs.
 * For true embeddings, we will interface directly, or assume the provider 
 * supports an `embed` method. Here we implement a direct OpenAI fetch as a 
 * resilient fallback since embeddings are usually tied to a specific vector dimension.
 */
export async function embedCodeChunk(text: string): Promise<number[] | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn('Cannot embed code chunk: OPENAI_API_KEY is missing.');
        return null;
    }

    try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text,
                model: 'text-embedding-3-small' // Returns 1536 dimensions
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenAI Embedding Error: ${response.status} - ${errorText}`);
            return null;
        }

        const data = await response.json();
        return data.data[0].embedding as number[];
    } catch (err) {
        console.error('Failed to communicate with OpenAI Embedding API:', err);
        return null;
    }
}
