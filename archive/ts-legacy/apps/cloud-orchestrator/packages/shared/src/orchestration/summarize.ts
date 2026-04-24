export async function summarizeSession(history: { role: string; content: string }[], provider: string, apiKey: string, model: string): Promise<string> {
  const { generateText } = await import('./providers/index');
  
  const systemPrompt = `You are an expert Technical Project Manager and Archivist. 
  Your goal is to create a structured "Handoff Document" from a conversation history. 
  This document must enable a new agent instance to pick up exactly where the previous one left off without losing context.
  
  Output Format (Markdown):
  ## Executive Summary
  (1-2 sentences on what this session was about)
  
  ## Key Decisions
  - (List technical or product decisions made)
  
  ## Completed Tasks
  - (List items that were successfully finished)
  
  ## Pending Tasks & Next Steps
  - (CRITICAL: List exactly what needs to be done next. Be specific.)
  
  ## Technical Context
  - (List important file paths, variable names, API endpoints, or constraints discovered during the session)
  `;
  
  // Truncate history if it's too long (naive simple check, better would be token counting)
  const MAX_CHARS = 100000;
  let conversationText = history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');
  
  if (conversationText.length > MAX_CHARS) {
      conversationText = "...(older history truncated)...\n" + conversationText.slice(-MAX_CHARS);
  }

  const prompt = `Please generate the Handoff Document for the following session history:\n\n${conversationText}`;

  return generateText({
    provider,
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
  });
}
