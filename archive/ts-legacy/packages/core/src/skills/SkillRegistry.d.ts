export interface Skill {
    id: string;
    name: string;
    description: string;
    content: string;
    path: string;
}
export declare class SkillRegistry {
    private skills;
    private searchPaths;
    constructor(searchPaths: string[]);
    loadSkills(): Promise<void>;
    private parseSkill;
    getSkillTools(): ({
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                skillName?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                skillName: {
                    type: string;
                };
            };
            required: string[];
        };
    })[];
    listSkills(): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    readSkill(skillName: string): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
}
//# sourceMappingURL=SkillRegistry.d.ts.map