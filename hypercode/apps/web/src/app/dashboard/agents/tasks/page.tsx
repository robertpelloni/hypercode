"use client";

import { trpc } from '@/utils/trpc';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@hypercode/ui';
import { ListTodo, RefreshCw, Clock, User, Zap, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export default function TaskQueuePage() {
    const { data: tasks, isLoading, refetch } = trpc.agent.getQueuedTasks.useQuery(undefined, {
        refetchInterval: 5000
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
            case 'in_progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'failed': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="h-3 w-3" />;
            case 'in_progress': return <RefreshCw className="h-3 w-3 animate-spin" />;
            case 'completed': return <CheckCircle2 className="h-3 w-3" />;
            case 'failed': return <AlertCircle className="h-3 w-3" />;
            default: return <Clock className="h-3 w-3" />;
        }
    };

    return (
        <div className="p-8 space-y-8">
            <PageHeader 
                title="Collective Task Queue" 
                description="Monitor shared background tasks being processed by the autonomous agent pool."
            />

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-zinc-200 flex items-center gap-2">
                        <ListTodo className="h-5 w-5 text-indigo-500" />
                        Queue Management
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Queue
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-zinc-800 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-zinc-950">
                                <TableRow>
                                    <TableHead className="w-[100px]">Priority</TableHead>
                                    <TableHead>Task Description</TableHead>
                                    <TableHead className="w-[150px]">Status</TableHead>
                                    <TableHead className="w-[150px]">Assigned To</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks && tasks.length > 0 ? (
                                    tasks.map((task: any) => (
                                        <TableRow key={task.id} className="hover:bg-white/5">
                                            <TableCell>
                                                <Badge variant="outline" className={`font-bold ${
                                                    task.priority >= 4 ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' : 
                                                    task.priority >= 3 ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' : 
                                                    'text-zinc-500 border-zinc-700'
                                                }`}>
                                                    P{task.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-zinc-200 font-medium">{task.description}</span>
                                                    <span className="text-[10px] text-zinc-500 font-mono mt-1">{task.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`gap-1.5 py-0.5 px-2 text-[10px] uppercase font-bold tracking-tight ${getStatusColor(task.status)}`}>
                                                    {getStatusIcon(task.status)}
                                                    {task.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {task.assignedTo ? (
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-3 w-3 text-indigo-400" />
                                                        <span className="text-xs text-zinc-300 font-medium">{task.assignedTo}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-600 italic text-xs">Unassigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="h-8 text-xs text-zinc-400 hover:text-white">
                                                    Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-40 text-center text-zinc-600 italic">
                                            {isLoading ? "Fetching task queue..." : "Task queue is currently empty."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
