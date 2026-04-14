'use client';

import { trpc } from '@/utils/trpc';

export default function CouncilVisualizer() {
    const { data: sessions, error } = trpc.council.sessions.list.useQuery(undefined, {
        refetchInterval: 5000,
    });
    const sessionsUnavailable = Boolean(error) || (sessions !== undefined && !Array.isArray(sessions));
    const safeSessions = !sessionsUnavailable ? (sessions ?? []) : [];

    const session = [...safeSessions]
        .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0];

    if (sessionsUnavailable) {
        return (
            <div className="p-6 bg-red-950/20 rounded-xl border border-red-900/40 text-center">
                <h3 className="text-xl font-bold text-red-200 mb-2">🏛️ Council unavailable</h3>
                <p className="text-red-300/80">{error?.message ?? 'Council sessions returned an invalid payload.'}</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800 text-center">
                <h3 className="text-xl font-bold text-slate-300 mb-2">🏛️ The Council is Adjourned</h3>
                <p className="text-slate-500">Waiting for a Consensus Session to convene...</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-slate-950 rounded-xl border border-indigo-900/50 overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-4 border-b border-indigo-800/50 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>🏛️</span> Council Chamber
                    </h2>
                    <p className="text-xs text-indigo-300 ml-7">
                        Session {session.id} • {session.status.toUpperCase()}
                    </p>
                </div>
            </div>

            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
                {session.logs.length === 0 ? (
                    <div className="text-center text-slate-500 text-sm">
                        No council transcript is available for this session yet.
                    </div>
                ) : (
                    session.logs.map((entry, i) => {
                        const speaker = entry.source ?? 'system';
                        const color = speaker.includes('stderr')
                            ? 'text-rose-400 border-rose-500/20 bg-rose-950/30'
                            : speaker.includes('stdout')
                                ? 'text-sky-400 border-sky-500/20 bg-sky-950/30'
                                : 'text-amber-400 border-amber-500/20 bg-amber-950/30';

                        return (
                            <div key={`${entry.timestamp}-${i}`} className="flex flex-col gap-1 items-start">
                                <span className="text-xs font-bold uppercase tracking-wider opacity-70 ml-1 mb-1 text-slate-400">
                                    {speaker}
                                </span>
                                <div className={`p-4 rounded-xl border ${color} max-w-[90%]`}>
                                    {entry.message}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="bg-slate-900/50 p-3 text-center border-t border-slate-800">
                <span className="text-xs text-slate-500">
                    Session Status: {session.status === 'completed' ? '✅ COMPLETED' : `⏳ ${session.status.toUpperCase()}`}
                </span>
            </div>
        </div>
    );
}
