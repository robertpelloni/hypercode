import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ReviewResult, ReviewIssue } from "@jules/shared";

interface ReviewScorecardProps {
    result: ReviewResult;
}

export function ReviewScorecard({ result }: ReviewScorecardProps) {
    const { score, summary, issues } = result;

    const getScoreColor = (score: number) => {
        if (score >= 90) return "bg-green-500";
        if (score >= 70) return "bg-yellow-500";
        return "bg-red-500";
    };

    const getSeverityIcon = (severity: ReviewIssue['severity']) => {
        switch (severity) {
            case 'high': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
            case 'low': return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-zinc-950 border-white/10">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold text-white">Code Review Score</CardTitle>
                        <Badge variant="outline" className={`text-lg font-mono px-3 py-1 ${getScoreColor(score)} text-black border-none`}>
                            {score}/100
                        </Badge>
                    </div>
                    <CardDescription className="text-white/60">
                        Automated analysis based on security, performance, and best practices.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Progress value={score} className="h-2 mb-4" indicatorClassName={getScoreColor(score)} />
                    <p className="text-sm text-white/80 italic">{summary}</p>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-zinc-950 border-white/10 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-purple-400" />
                            Detected Issues ({issues.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px] pr-4">
                            {issues.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-white/40">
                                    <CheckCircle className="h-8 w-8 mb-2 text-green-500/50" />
                                    <p>No issues detected.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {issues.map((issue, idx) => (
                                        <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-2">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getSeverityIcon(issue.severity)}
                                                    <span className="font-semibold text-white/90 text-sm">{issue.description}</span>
                                                </div>
                                                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                                    {issue.category}
                                                </Badge>
                                            </div>
                                            
                                            <div className="pl-6 text-xs text-white/60 space-y-1">
                                                {issue.file && (
                                                    <div className="font-mono text-white/40">
                                                        {issue.file}:{issue.line || '?'}
                                                    </div>
                                                )}
                                                <div className="p-2 bg-black/20 rounded text-green-400/80 font-mono">
                                                    Suggestion: {issue.suggestion}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
