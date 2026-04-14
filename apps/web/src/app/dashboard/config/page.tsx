'use client';

import DirectorConfig from "@/components/DirectorConfig";
import { ModelProvidersList } from "@/components/config/ModelProvidersList";
import { SystemLimitsPanel } from "@/components/config/SystemLimitsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypercode/ui";

export default function ConfigPage() {
    return (
        <div className="p-8 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">System Configuration</h1>
                    <p className="text-gray-400 mt-1">Manage core Director behavior, LLM providers, and system limits.</p>
                </div>
            </div>

            <Tabs defaultValue="director" className="flex-1 flex flex-col min-h-0">
                <TabsList className="mb-6 bg-gray-900 border border-gray-800">
                    <TabsTrigger value="director">Director Autopilot</TabsTrigger>
                    <TabsTrigger value="providers">Model Providers</TabsTrigger>
                    <TabsTrigger value="limits">System Policies</TabsTrigger>
                </TabsList>

                <TabsContent value="director" className="flex-1 overflow-y-auto pr-2 mt-0">
                    <div className="max-w-5xl">
                        <DirectorConfig />
                    </div>
                </TabsContent>

                <TabsContent value="providers" className="flex-1 overflow-y-auto pr-2 mt-0">
                    <div className="max-w-6xl">
                        <ModelProvidersList />
                    </div>
                </TabsContent>

                <TabsContent value="limits" className="flex-1 overflow-y-auto pr-2 mt-0">
                    <div className="max-w-4xl">
                        <SystemLimitsPanel />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
