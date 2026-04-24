
import fs from 'fs/promises';
import path from 'path';

export interface PromptTemplate {
    id: string;
    version: number;
    description: string;
    template: string;
    variables: string[];
    updatedAt: string;
}

export class PromptRegistry {
    private storageDir: string;
    private cache: Map<string, PromptTemplate> = new Map();

    constructor(storageDir?: string) {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/prompts/PromptRegistry.ts
        this.storageDir = storageDir || path.join(process.cwd(), '.hypercode', 'prompts');
=======
        this.storageDir = storageDir || path.join(process.cwd(), '.borg', 'prompts');
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/prompts/PromptRegistry.ts
    }

    async initialize() {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
        } catch { }
        await this.loadAll();
    }

    async loadAll() {
        try {
            const files = await fs.readdir(this.storageDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(path.join(this.storageDir, file), 'utf-8');
                    try {
                        const prompt = JSON.parse(content);
                        this.cache.set(prompt.id, prompt);
                    } catch (e) {
                        console.error(`[PromptRegistry] Failed to parse ${file}`, e);
                    }
                }
            }
        } catch (e) {
            console.error("[PromptRegistry] Failed to load prompts", e);
        }
    }

    get(id: string): PromptTemplate | undefined {
        return this.cache.get(id);
    }

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/prompts/PromptRegistry.ts
=======
    list(): PromptTemplate[] {
        return Array.from(this.cache.values());
    }

>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/prompts/PromptRegistry.ts
    async save(prompt: PromptTemplate) {
        prompt.updatedAt = new Date().toISOString();
        this.cache.set(prompt.id, prompt);
        await fs.writeFile(
            path.join(this.storageDir, `${prompt.id}.json`),
            JSON.stringify(prompt, null, 2)
        );
    }

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/prompts/PromptRegistry.ts
=======
    async delete(id: string) {
        this.cache.delete(id);
        try {
            await fs.unlink(path.join(this.storageDir, `${id}.json`));
        } catch { }
    }

>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/prompts/PromptRegistry.ts
    render(id: string, variables: Record<string, string>): string {
        const prompt = this.get(id);
        if (!prompt) throw new Error(`Prompt ${id} not found`);

        let text = prompt.template;
        for (const [key, value] of Object.entries(variables)) {
            text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return text;
    }
}
