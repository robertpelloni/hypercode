import type React from 'react';
import { useMemo } from 'react';
import { useActivityStore } from '@src/stores';
import { Card, CardContent, CardHeader, CardTitle } from '@src/components/ui/card';
import { Typography, Icon } from '../ui';
import { cn } from '@src/lib/utils';

const APP_VERSION = '0.7.0';

const SHORTCUTS = [
  { keys: 'Alt + Shift + S', action: 'Toggle Sidebar' },
  { keys: 'Escape', action: 'Close Sidebar' },
  { keys: '/', action: 'Focus Search' },
  { keys: 'Ctrl + ←/→', action: 'Switch Tabs' },
] as const;

const Dashboard: React.FC = () => {
  const { logs } = useActivityStore();

  const stats = useMemo(() => {
    const totalExecutions = logs.filter(l => l.type === 'tool_execution').length;
    const errors = logs.filter(l => l.status === 'error').length;
    const successRate = totalExecutions > 0 ? Math.round(((totalExecutions - errors) / totalExecutions) * 100) : 100;

    // Most used tool
    const toolCounts: Record<string, number> = {};
    logs
      .filter(l => l.type === 'tool_execution')
      .forEach(l => {
        const name = l.title.replace('Executed: ', '');
        toolCounts[name] = (toolCounts[name] || 0) + 1;
      });

    const mostUsed = Object.entries(toolCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalExecutions,
      errors,
      successRate,
      mostUsedTool: mostUsed ? mostUsed[0] : 'None',
      mostUsedCount: mostUsed ? mostUsed[1] : 0,
    };
  }, [logs]);

  return (
    <div className="flex flex-col h-full space-y-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-1">
          <Typography variant="h4" className="font-semibold text-slate-800 dark:text-slate-100">
            Dashboard
          </Typography>
          <Typography variant="caption" className="text-slate-500 dark:text-slate-400">
            Overview of your activity and tool usage.
          </Typography>
        </div>
        <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-200 dark:border-indigo-800">
          <Typography variant="caption" className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            v{APP_VERSION}
          </Typography>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-2">
              <Icon name="play" size="md" className="text-blue-600 dark:text-blue-400" />
            </div>
            <Typography variant="h3" className="font-bold text-2xl text-slate-800 dark:text-slate-100">
              {stats.totalExecutions}
            </Typography>
            <Typography variant="caption" className="text-slate-500 dark:text-slate-400 mt-1">
              Total Runs
            </Typography>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div
              className={cn(
                'p-2 rounded-full mb-2',
                stats.successRate >= 90 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-orange-50 dark:bg-orange-900/30',
              )}>
              <Icon
                name="check"
                size="md"
                className={cn(
                  stats.successRate >= 90
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-orange-600 dark:text-orange-400',
                )}
              />
            </div>
            <Typography variant="h3" className="font-bold text-2xl text-slate-800 dark:text-slate-100">
              {stats.successRate}%
            </Typography>
            <Typography variant="caption" className="text-slate-500 dark:text-slate-400 mt-1">
              Success Rate
            </Typography>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Most Used Tool</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded">
                <Icon name="tool" size="sm" className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <Typography variant="subtitle" className="font-medium text-slate-800 dark:text-slate-200">
                  {stats.mostUsedTool}
                </Typography>
                <Typography variant="caption" className="text-slate-500 dark:text-slate-400">
                  {stats.mostUsedCount} executions
                </Typography>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts Reference */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keyboard Shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="space-y-2">
            {SHORTCUTS.map(s => (
              <div key={s.keys} className="flex items-center justify-between">
                <Typography variant="caption" className="text-slate-600 dark:text-slate-400">
                  {s.action}
                </Typography>
                <kbd className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-2">
          <Icon name="info" size="sm" className="text-slate-400 mt-0.5" />
          <Typography variant="body" className="text-xs text-slate-600 dark:text-slate-400">
            Stats are calculated based on your local activity log history (last 50 events). Clearing logs will reset
            these metrics.
          </Typography>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
