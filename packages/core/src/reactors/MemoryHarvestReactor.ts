import { EventBus, SystemEvent } from '../services/EventBus.js';
import { LLMService } from '@borg/ai';
import AgentMemoryService from '../services/AgentMemoryService.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * MemoryHarvestReactor
 * 
 * Automatically "harvests" context from file system changes.
 * When a file is created or modified, it semantically analyzes the new content
 * and updates Borg's long-term memory graph.
 */
export class MemoryHarvestReactor {
    private eventBus: EventBus;
    private llmService: LLMService;
    private memoryService: AgentMemoryService;
    private isRunning = false;

    constructor(eventBus: EventBus, llmService: LLMService, memoryService: AgentMemoryService) {
        this.eventBus = eventBus;
        this.llmService = llmService;
        this.memoryService = memoryService;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;

        this.eventBus.onEvent('file:change', (event) => this.handleFileEvent(event));
        this.eventBus.onEvent('file:create', (event) => this.handleFileEvent(event));
        console.log("[MemoryHarvestReactor] 🧠 Sensory harvesting active.");
    }

    private async handleFileEvent(event: SystemEvent) {
        const filePath = event.payload.absolutePath;
        const relativePath = event.payload.path;

        // Skip non-source files or huge files
        if (!relativePath.match(/\.(ts|tsx|js|jsx|md|py|go|rs)$/)) return;

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            if (content.length > 50000) return; // Skip massive files for harvesting

            const prompt = `
            You are a Borg Knowledge Harvester.
            A file in the repository has been updated: ${relativePath}
            
            Analyze the content and extract the most important architectural rules, 
            exported symbols, or persistent facts that an agent should remember about this file.
            
            Return JSON ONLY:
            {
                "important": boolean,
                "fact": "A concise summary of the file's purpose or a specific rule found within.",
                "tags": ["component", "utility", "rule", etc.]
            }
            `;

            // Use the 'cheapest' strategy for background harvesting
            const response = await this.llmService.generateText(
                'openai', 
                'gpt-4o-mini', 
                'You extract technical knowledge.', 
                prompt,
                { routingStrategy: 'cheapest' }
            );

            // Basic JSON extraction
            const textContent = response.content[0].text;
            const start = textContent.indexOf('{');
            const end = textContent.lastIndexOf('}');
            
            if (start !== -1 && end !== -1) {
                const result = JSON.parse(textContent.slice(start, end + 1));
                if (result.important && result.fact) {
                    await this.memoryService.add(result.fact, 'working', 'project', {
                        source: 'file_sensor_harvest',
                        file: relativePath,
                        tags: result.tags || []
                    });
                    
                    this.eventBus.emitEvent('memory:harvested', 'MemoryHarvestReactor', {
                        file: relativePath,
                        fact: result.fact
                    });
                }
            }
        } catch (e) {
            // Silent fail for background harvesting
        }
    }
}
