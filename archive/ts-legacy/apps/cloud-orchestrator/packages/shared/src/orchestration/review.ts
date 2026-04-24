import type { LLMProvider, Message, CompletionResult } from './types';

export interface ReviewPersona {
    role: string;
    prompt: string;
}

export interface ReviewRequest {
    codeContext: string;
    provider: string;
    model: string;
    apiKey: string;
    systemPrompt?: string;
    reviewType?: 'simple' | 'comprehensive';
    customPersonas?: ReviewPersona[];
    outputFormat?: 'markdown' | 'json';
    prUrl?: string;
    githubToken?: string;
}

export interface ReviewIssue {
    severity: 'high' | 'medium' | 'low';
    category: string;
    file?: string;
    line?: number;
    description: string;
    suggestion: string;
}

export interface ReviewResult {
    summary: string;
    score: number; // 0-100
    issues: ReviewIssue[];
    rawOutput?: string;
}

import { getProvider } from './providers/index';

export async function runCodeReview(request: ReviewRequest): Promise<string | ReviewResult> {
    const provider = getProvider(request.provider);

    if (!provider) {
        throw new Error(`Provider ${request.provider} not found`);
    }

    let result: string | ReviewResult;

    if (request.outputFormat === 'json') {
        result = await runStructuredReview(request, provider);
    } else if (request.reviewType === 'comprehensive') {
        result = await runComprehensiveReview(request, provider);
    } else {
        const systemPrompt = request.systemPrompt || `You are an expert code reviewer.
        Review the provided code context.
        - Identify potential bugs, security issues, and performance bottlenecks.
        - Suggest improvements for readability and maintainability.
        - Be concise and actionable.`;

        const completion = await provider.complete({
            messages: [{ role: 'user', content: request.codeContext }],
            model: request.model,
            apiKey: request.apiKey,
            systemPrompt
        });
        result = completion.content;
    }

    return result;
}

async function runStructuredReview(request: ReviewRequest, provider: any): Promise<ReviewResult> {
    const systemPrompt = `You are an expert code reviewer. Analyze the code and provide a structured JSON response.
    
    Response Format (JSON):
    {
        "summary": "Brief overall summary of the code quality and main issues",
        "score": 85, // 0-100 integer
        "issues": [
            {
                "severity": "high" | "medium" | "low",
                "category": "Security" | "Performance" | "Style" | "Logic",
                "description": "Description of the issue",
                "suggestion": "How to fix it",
                "line": 10 // Approximate line number if applicable
            }
        ]
    }
    
    Focus on:
    1. Correctness and logic bugs
    2. Security vulnerabilities
    3. Performance issues
    4. Code style and maintainability
    `;

    try {
        const result = await provider.complete({
            messages: [{ role: 'user', content: request.codeContext }],
            model: request.model,
            apiKey: request.apiKey,
            systemPrompt,
            jsonMode: true
        });

        const parsed = JSON.parse(result.content);
        return {
            summary: parsed.summary || "No summary provided.",
            score: typeof parsed.score === 'number' ? parsed.score : 0,
            issues: Array.isArray(parsed.issues) ? parsed.issues : [],
            rawOutput: result.content
        };
    } catch (error) {
        console.error("Structured review failed:", error);
        return {
            summary: "Failed to generate structured review.",
            score: 0,
            issues: [],
            rawOutput: error instanceof Error ? error.message : "Unknown error"
        };
    }
}

async function runComprehensiveReview(request: ReviewRequest, provider: any): Promise<string | ReviewResult> {
    const defaultPersonas = [
        {
            role: 'Security Expert',
            prompt: 'You are a Security Expert. Review this code strictly for security vulnerabilities, injection risks, and data handling issues. Be brief and list only high-severity concerns.'
        },
        {
            role: 'Performance Engineer',
            prompt: 'You are a Performance Engineer. Review this code for algorithmic inefficiencies, memory leaks, and scaling bottlenecks. Be brief.'
        },
        {
            role: 'Clean Code Advocate',
            prompt: 'You are a Senior Engineer focused on maintainability. Review naming, structure, and adherence to SOLID principles. Be brief.'
        }
    ];

    const personas = request.customPersonas || defaultPersonas;

    const results = await Promise.all(personas.map(async (persona) => {
        try {
            const res = await provider.complete({
                messages: [{ role: 'user', content: request.codeContext }],
                model: request.model,
                apiKey: request.apiKey,
                systemPrompt: persona.prompt
            });
            return `### ${persona.role} Review\n${res.content}`;
        } catch (e) {
            return `### ${persona.role} Review\n(Failed to generate review: ${e instanceof Error ? e.message : 'Unknown error'})`;
        }
    }));

    const compiledReview = `# Comprehensive Code Review\n\n${results.join('\n\n')}`;

    // If output format is JSON, synthesize the individual reviews into a structured scorecard
    if (request.outputFormat === 'json') {
        try {
            const synthesisPrompt = `You are a Lead Software Architect.
            Synthesize the following specific reviews from different experts into a final, structured Code Review Scorecard.

            Review Contents:
            ${compiledReview}

            Response Format (JSON):
            {
                "summary": "High-level executive summary of the code quality based on the experts' feedback.",
                "score": 85, // 0-100 integer based on overall quality
                "issues": [
                    {
                        "severity": "high" | "medium" | "low",
                        "category": "Security" | "Performance" | "Style" | "Logic",
                        "description": "Concise description of the issue",
                        "suggestion": "Actionable fix",
                        "line": 0 // Best guess if mentioned, else 0
                    }
                ]
            }`;

            const synthesis = await provider.complete({
                messages: [{ role: 'user', content: "Synthesize the reviews." }],
                model: request.model,
                apiKey: request.apiKey,
                systemPrompt: synthesisPrompt,
                jsonMode: true
            });

            const parsed = JSON.parse(synthesis.content);
            return {
                summary: parsed.summary || "No summary provided.",
                score: typeof parsed.score === 'number' ? parsed.score : 0,
                issues: Array.isArray(parsed.issues) ? parsed.issues : [],
                rawOutput: compiledReview
            };
        } catch (error) {
            console.error("Failed to synthesize comprehensive review:", error);
            // Fallback to unstructured text if synthesis fails
            return compiledReview;
        }
    }

    return compiledReview;
}
