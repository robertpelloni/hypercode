'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Brain, Palette, Key, ShieldCheck, Database, Download, Upload, Loader2, Zap, Plus, Trash2 } from 'lucide-react';
import { SessionKeeperSettingsContent } from './session-keeper-settings-content';
import { ThemeCustomizer } from './theme-customizer';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { toast } from 'sonner';
import { FleetIntelligence } from './fleet-intelligence';
import { SubmoduleList } from './submodule-list';

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  isActive: boolean;
  createdAt: string;
}

export function SettingsDialog({ open: propOpen, onOpenChange: propOnOpenChange, trigger }: SettingsDialogProps) {
  const { config, saveConfig } = useSessionKeeperStore();
  const [internalOpen, setInternalOpen] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [julesKey, setJulesKey] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [_isKeysLoading, setIsKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const open = propOpen !== undefined ? propOpen : internalOpen;
  const onOpenChange = propOnOpenChange || setInternalOpen;

  const fetchApiKeys = useCallback(async () => {
    try {
      setIsKeysLoading(true);
      const res = await fetch('/api/keys');
      if (res.ok) setApiKeys(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsKeysLoading(false); }
  }, []);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      });
      if (res.ok) {
        toast.success('API Key generated');
        setNewKeyName('');
        void fetchApiKeys();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('API Key revoked');
        void fetchApiKeys();
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (open) {
      void fetchApiKeys();
      // Also trigger a load of the keeper config to sync with backend
      void useSessionKeeperStore.getState().loadConfig();
    }
  }, [open, fetchApiKeys]);

  // Initialize tokens from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGithubToken(localStorage.getItem('github_pat') || '');
      setOpenAIKey(localStorage.getItem('openai_api_key') || '');
      setJulesKey(localStorage.getItem('jules_api_key') || '');
    }
  }, [open]);

  const handleSaveIntegrations = () => {
    localStorage.setItem('github_pat', githubToken);
    localStorage.setItem('openai_api_key', openAIKey);
    
    const oldJulesKey = localStorage.getItem('jules_api_key');
    localStorage.setItem('jules_api_key', julesKey);
    
    if (oldJulesKey !== julesKey) {
      window.dispatchEvent(new Event('jules-api-key-updated'));
    }
    
    toast.success('Integration settings saved');
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export');
      if (!response.ok) throw new Error('Export failed');
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jules-autopilot-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Database backup downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export data');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Import failed');
      
      toast.success('Data imported successfully. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      toast.error('Failed to import data. Check file format.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl bg-zinc-950 border-white/10 text-white h-[80vh] flex flex-col p-0 shadow-2xl" aria-describedby="settings-dialog-description">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle>Core Configuration</DialogTitle>
          <div id="settings-dialog-description" className="sr-only">
            Configure integrations, fleet intelligence, submodules, supervisor settings, and more.
          </div>
        </DialogHeader>
        <Tabs defaultValue="integrations" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="bg-zinc-900 border border-white/10 flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="integrations" className="text-[10px] flex items-center gap-1.5 px-2 py-1">
                <Github className="h-3 w-3" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="supervisor" className="text-[10px] flex items-center gap-1.5 px-2 py-1 bg-purple-600/20 text-purple-300 border border-purple-500/30 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Brain className="h-3 w-3" />
                Supervisor
              </TabsTrigger>
              <TabsTrigger value="fleet" className="text-[10px] flex items-center gap-1.5 px-2 py-1">
                <Zap className="h-3 w-3 text-purple-400" />
                Fleet
              </TabsTrigger>
              <TabsTrigger value="submodules" className="text-[10px] flex items-center gap-1.5 px-2 py-1">
                <Github className="h-3 w-3 text-blue-400" />
                Submodules
              </TabsTrigger>
              <TabsTrigger value="appearance" className="text-[10px] flex items-center gap-1.5 px-2 py-1">
                <Palette className="h-3 w-3" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="keys" className="text-[10px] flex items-center gap-1.5 px-2 py-1">
                <Key className="h-3 w-3" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="system" className="text-[10px] flex items-center gap-1.5 px-2 py-1">
                <Database className="h-3 w-3" />
                System
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="integrations" className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6 max-w-md pb-8">
              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <h3 className="text-sm font-bold">Google Jules Portal</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 text-zinc-400 text-[10px] bg-black/30 p-2 rounded border border-white/5 mb-4 font-mono leading-relaxed">
                    <p className="text-purple-300 font-bold uppercase">Auth Protocol Verified:</p>
                    <p className="mt-1">Jules Portal principals (`AQ.A...`) are strictly incompatible with standard Bearer tokens. This orchestrator enforces the correct `x-goog-api-key` strategy automatically.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-3 w-3 text-white/40" />
                      <Label className="text-xs text-white/60 uppercase tracking-tight">Session Token (AQ.A)</Label>
                    </div>
                    <Input
                      type="password"
                      value={julesKey}
                      onChange={e => setJulesKey(e.target.value)}
                      placeholder="AQ.A..."
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-bold">Supervisor Access</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">OpenAI API Key</Label>
                  <Input
                    type="password"
                    value={openAIKey}
                    onChange={e => setOpenAIKey(e.target.value)}
                    placeholder="sk-..."
                    className="bg-black/50 border-white/10 text-xs font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 italic">Powering RAG indexing and Council Debates.</p>
                </div>
              </div>

              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Github className="h-5 w-5 text-white" />
                  <h3 className="text-sm font-bold">GitHub Integration</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">Personal Access Token</Label>
                  <Input
                    type="password"
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    placeholder="ghp_..."
                    className="bg-black/50 border-white/10 text-xs font-mono"
                  />
                  <p className="text-[10px] text-white/40">
                    Required for the Autopilot to monitor and fix repository issues.
                  </p>
                </div>
              </div>

              <Button onClick={handleSaveIntegrations} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest text-[10px] h-10">
                Synchronize Integrations
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="fleet" className="flex-1 p-6 overflow-y-auto">
            <FleetIntelligence />
          </TabsContent>

          <TabsContent value="submodules" className="flex-1 p-6 overflow-y-auto">
            <SubmoduleList />
          </TabsContent>

          <TabsContent value="supervisor" className="flex-1 overflow-y-auto min-h-0 focus-visible:outline-none data-[state=inactive]:hidden">
            <div className="p-6">
              <div className="mb-4 p-3 bg-purple-900/30 border border-purple-500/30 rounded text-[10px] text-purple-200 uppercase tracking-widest font-bold">
                Supervisor Configuration
              </div>
              <SessionKeeperSettingsContent
                config={config}
                onConfigChange={saveConfig}
              />
            </div>
          </TabsContent>

          <TabsContent value="keys" className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-5 w-5 text-purple-400" />
                  <h3 className="text-sm font-bold">Node Access Keys</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Generate scoped API keys to allow external tools and collective nodes to interact with this Autopilot instance.
                </p>
                
                <div className="flex gap-2">
                  <Input 
                    placeholder="Key Label (e.g. CI-Pipeline)" 
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    className="bg-black/50 border-white/10 text-xs font-mono h-9"
                  />
                  <Button onClick={handleCreateKey} size="sm" className="bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest text-[10px] h-9 shrink-0">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Generate
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 overflow-hidden">
                <table className="w-full text-left text-[10px] font-mono text-white">
                  <thead className="bg-white/5 text-zinc-500 uppercase tracking-widest border-b border-white/10">
                    <tr>
                      <th className="px-4 py-2 font-bold">Name</th>
                      <th className="px-4 py-2 font-bold">Key Preview</th>
                      <th className="px-4 py-2 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/20">
                    {apiKeys.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-zinc-600 uppercase italic">No access keys configured</td>
                      </tr>
                    ) : (
                      apiKeys.map(key => (
                        <tr key={key.id} className="group hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-zinc-300 font-bold">{key.name}</td>
                          <td className="px-4 py-3 text-zinc-500">
                            {key.keyPrefix}••••••••
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => void handleDeleteKey(key.id)}
                              className="h-7 w-7 text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="flex-1 p-6">
            <div className="max-w-md">
              <ThemeCustomizer />
            </div>
          </TabsContent>

          <TabsContent value="system" className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6 max-w-md">
              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-bold">Database Portability</h3>
                </div>
                
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Export or import your entire local configuration, including session templates, 
                  debate history, and API settings.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={handleExport} className="border-white/10 hover:bg-white/5 text-xs font-mono uppercase tracking-widest h-9">
                    <Download className="mr-2 h-3.5 w-3.5" /> Export
                  </Button>
                  
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".json"
                      onChange={e => void handleImport(e)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-xs font-mono uppercase tracking-widest h-9">
                      {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Upload className="mr-2 h-3.5 w-3.5" /> Import</>}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
