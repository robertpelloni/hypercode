
'use client';

import React from 'react';
import { KnowledgeGraph } from '@borg/ui';

export default function BrainPage() {
    return (
        <div className="h-full w-full p-6 flex flex-col">
            <header className="mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    The Borg Brain
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                    Visualizing the collective knowledge graph.
                </p>
            </header>

            <div className="flex-1 min-h-0 bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-inner relative">
                <div className="absolute inset-0">
                    <KnowledgeGraph />
                </div>
            </div>
        </div>
    );
}
