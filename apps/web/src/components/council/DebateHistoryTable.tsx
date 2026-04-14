'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hypercode/ui";
import { Badge } from "@hypercode/ui";
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, AlertTriangle, Users, BarChart } from 'lucide-react';

interface DebateRecord {
  id: string;
  timestamp: number;
  task: {
    description: string;
  };
  decision: {
    approved: boolean;
    consensus: number;
    votes: any[];
  };
  metadata: {
    participatingSupervisors: string[];
    taskType: string;
  };
}

interface DebateHistoryTableProps {
  records: DebateRecord[];
  onSelect?: (id: string) => void;
}

export function DebateHistoryTable({ records, onSelect }: DebateHistoryTableProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] border border-dashed rounded-xl bg-card/10 text-muted-foreground">
        <p className="text-sm">No debate history available</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/50 overflow-hidden">
      <Table>
        <TableHeader className="bg-accent/30">
          <TableRow>
            <TableHead className="w-[180px]">Time</TableHead>
            <TableHead>Decision / Task</TableHead>
            <TableHead className="text-right">Consensus</TableHead>
            <TableHead className="text-right">Supervisors</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow 
              key={record.id} 
              className="cursor-pointer hover:bg-accent/20 transition-colors"
              onClick={() => onSelect?.(record.id)}
            >
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(record.timestamp, { addSuffix: true })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {record.decision.approved ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium line-clamp-1">{record.task.description}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {record.metadata.taskType}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <BarChart className="h-3 w-3 text-muted-foreground" />
                    <span className={`text-sm font-bold ${
                      record.decision.consensus >= 0.8 ? 'text-green-400' :
                      record.decision.consensus >= 0.6 ? 'text-blue-400' :
                      'text-yellow-400'
                    }`}>
                      {Math.round(record.decision.consensus * 100)}%
                    </span>
                  </div>
                  <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${record.decision.consensus * 100}%` }} 
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end -space-x-2">
                  {record.metadata.participatingSupervisors.slice(0, 3).map((name, i) => (
                    <div 
                      key={name} 
                      className="h-6 w-6 rounded-full border-2 border-background bg-purple-900 flex items-center justify-center text-[8px] font-bold text-white uppercase"
                      title={name}
                    >
                      {name.charAt(0)}
                    </div>
                  ))}
                  {record.metadata.participatingSupervisors.length > 3 && (
                    <div className="h-6 w-6 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                      +{record.metadata.participatingSupervisors.length - 3}
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
