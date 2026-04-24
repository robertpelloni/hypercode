import { useState, useEffect } from "react";
import { PluginCard } from "./plugin-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, RefreshCw, Box } from "lucide-react";

// Types
export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  status: 'installed' | 'enabled' | 'disabled' | 'error';
  sourceUrl: string;
  capabilities: string;
}

export function PluginMarketplace() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plugins");
      if (res.ok) {
        const data = await res.json();
        setPlugins(data);
      }
    } catch (e) {
      console.error("Failed to fetch plugins", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const handleInstall = async (url: string) => {
    try {
      const res = await fetch("/api/plugins/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: url,
          name: url.split('/').pop() || 'Unknown Plugin',
          version: 'latest'
        })
      });
      if (res.ok) fetchPlugins();
    } catch (e) {
      console.error("Failed to install plugin", e);
    }
  };

  const handleToggle = async (plugin: Plugin) => {
    const action = plugin.status === 'enabled' ? 'disable' : 'enable';
    try {
      const res = await fetch(`/api/plugins/${plugin.id}/${action}`, {
        method: "POST"
      });
      if (res.ok) fetchPlugins();
    } catch (e) {
      console.error(`Failed to ${action} plugin`, e);
    }
  };

  const handleUninstall = async (plugin: Plugin) => {
    try {
      const res = await fetch(`/api/plugins/${plugin.id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchPlugins();
    } catch (e) {
      console.error("Failed to uninstall plugin", e);
    }
  };

  const filteredPlugins = plugins.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-400" />
            Plugin Marketplace
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Install and manage Wasm plugins for extending capabilities.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPlugins} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleInstall("https://example.com/plugin.wasm")}>
            <Plus className="w-4 h-4 mr-2" />
            Install from URL
          </Button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800 text-sm h-9"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'enabled', 'disabled', 'installed'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'secondary' : 'ghost'}
                size="sm"
                className={`text-xs h-8 ${statusFilter === status ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : filteredPlugins.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
            <Box className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No plugins found</h3>
            <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
              You haven't installed any plugins yet, or none match your search criteria.
            </p>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" /> Install your first plugin
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlugins.map(plugin => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                onToggle={() => handleToggle(plugin)}
                onUninstall={() => handleUninstall(plugin)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
