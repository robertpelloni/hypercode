'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from '@hypercode/ui';
import { Bot, CheckCircle2, Loader2, Play, Plus, Radio, RotateCw, Users } from 'lucide-react';
import { trpc } from '@/utils/trpc';

type RotationRole = 'planner' | 'implementer' | 'tester';
type RotationRoomMode = 'plan' | 'execute';
type RotationRoomStatus = 'draft' | 'active' | 'paused' | 'completed';

interface RotationParticipant {
  id: string;
  name: string;
  provider: string;
  model: string;
}

interface RotationMessage {
  id: string;
  participantName: string;
  role: RotationRole | 'system';
  kind: 'system' | 'discussion' | 'handoff' | 'artifact';
  content: string;
  timestamp: number;
}

interface RotationTurn {
  role: RotationRole;
  participantId: string;
  summary?: string;
}

interface RotationSupervisorEvaluation {
  verdict: 'continue' | 'complete';
  summary: string;
  confidence?: number;
  satisfiedCriteria: string[];
  remainingCriteria: string[];
  evaluatedAt: number;
}

interface RotationSupervisorConfig {
  name: string;
  provider: string;
  model: string;
  completionCriteria: string;
  evaluationMode: 'manual' | 'after_turn' | 'after_cycle';
  completionAction: 'pause' | 'complete';
  enabled: boolean;
  prompt?: string;
  temperature?: number;
  maxTranscriptMessages: number;
}

interface RotationRoom {
  id: string;
  title: string;
  objective: string;
  sharedContext: string;
  mode: RotationRoomMode;
  status: RotationRoomStatus;
  participants: RotationParticipant[];
  roleAssignments: Record<RotationRole, string>;
  turns: RotationTurn[];
  transcript: RotationMessage[];
  currentCycleNumber: number;
  supervisor: {
    status: 'inactive' | 'active' | 'satisfied';
    config?: RotationSupervisorConfig;
    evaluations: RotationSupervisorEvaluation[];
  };
  lastCheckpoint?: string;
}

const DEFAULT_PARTICIPANTS = [
  'claude|Claude|anthropic|claude-sonnet-4.6',
  'gpt|GPT|openai|gpt-5.4',
  'gemini|Gemini|google|gemini-2.5-pro',
].join('\n');

function parseParticipants(raw: string): { participants: RotationParticipant[]; error?: string } {
  const participants = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, name, provider, model] = line.split('|').map((part) => part?.trim() ?? '');
      return { id, name, provider, model };
    });

  if (participants.length < 2) {
    return { participants: [], error: 'Enter at least two participants using id|name|provider|model.' };
  }

  const invalid = participants.find((participant) => !participant.id || !participant.name || !participant.provider || !participant.model);
  if (invalid) {
    return { participants: [], error: 'Each participant row must use id|name|provider|model.' };
  }

  const uniqueIds = new Set(participants.map((participant) => participant.id));
  if (uniqueIds.size !== participants.length) {
    return { participants: [], error: 'Participant ids must be unique.' };
  }

  return { participants };
}

export function RotationRoomsPanel() {
  const rotationTrpc = (trpc.council as any).rotation;
  const [createTitle, setCreateTitle] = useState('Frontier rotation room');
  const [createObjective, setCreateObjective] = useState('Debate, implement, test, and keep going until the supervisor says the work is complete.');
  const [createContext, setCreateContext] = useState('');
  const [createMode, setCreateMode] = useState<RotationRoomMode>('plan');
  const [createParticipants, setCreateParticipants] = useState(DEFAULT_PARTICIPANTS);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [roomSummary, setRoomSummary] = useState('Completed current turn.');
  const [roomCheckpoint, setRoomCheckpoint] = useState('');
  const [participantId, setParticipantId] = useState('qwen');
  const [participantName, setParticipantName] = useState('Qwen');
  const [participantProvider, setParticipantProvider] = useState('local');
  const [participantModel, setParticipantModel] = useState('qwen2.5-coder');
  const [supervisorName, setSupervisorName] = useState('Local Qwen supervisor');
  const [supervisorProvider, setSupervisorProvider] = useState('local');
  const [supervisorModel, setSupervisorModel] = useState('qwen2.5-coder');
  const [completionCriteria, setCompletionCriteria] = useState('Stop only when the room has produced a complete, tested solution and the transcript clearly shows that the implementation is done.');
  const [evaluationMode, setEvaluationMode] = useState<'manual' | 'after_turn' | 'after_cycle'>('after_turn');
  const [completionAction, setCompletionAction] = useState<'pause' | 'complete'>('complete');
  const [supervisorPrompt, setSupervisorPrompt] = useState('Be conservative. Only say complete when the transcript shows the work is both implemented and verified.');
  const [supervisorTemperature, setSupervisorTemperature] = useState('0');
  const [supervisorTranscriptWindow, setSupervisorTranscriptWindow] = useState('18');
  const [localError, setLocalError] = useState<string | null>(null);

  const roomsQuery = rotationTrpc.list.useQuery(undefined, {
    refetchInterval: 3000,
  });
  const roomsUnavailable = roomsQuery.isError || (roomsQuery.data !== undefined && !Array.isArray(roomsQuery.data));
  const roomsErrorMessage = roomsQuery.error?.message ?? 'Rotation room inventory is unavailable.';

  const createRoomMutation = rotationTrpc.create.useMutation({
    onSuccess: (room) => {
      setSelectedRoomId(room.id);
      void roomsQuery.refetch();
    },
  });
  const addParticipantMutation = rotationTrpc.addParticipant.useMutation({
    onSuccess: () => void roomsQuery.refetch(),
  });
  const configureSupervisorMutation = rotationTrpc.configureSupervisor.useMutation({
    onSuccess: () => void roomsQuery.refetch(),
  });
  const advanceTurnMutation = rotationTrpc.advanceTurn.useMutation({
    onSuccess: () => void roomsQuery.refetch(),
  });
  const startExecutionMutation = rotationTrpc.startExecution.useMutation({
    onSuccess: () => void roomsQuery.refetch(),
  });
  const runSupervisorCheckMutation = rotationTrpc.runSupervisorCheck.useMutation({
    onSuccess: () => void roomsQuery.refetch(),
  });

  const rooms = !roomsUnavailable ? (roomsQuery.data ?? []) as RotationRoom[] : [];
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null,
    [rooms, selectedRoomId],
  );

  useEffect(() => {
    if (!selectedRoomId && rooms[0]?.id) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoom?.supervisor.config) {
      return;
    }
    const config = selectedRoom.supervisor.config;
    setSupervisorName(config.name);
    setSupervisorProvider(config.provider);
    setSupervisorModel(config.model);
    setCompletionCriteria(config.completionCriteria);
    setEvaluationMode(config.evaluationMode);
    setCompletionAction(config.completionAction);
    setSupervisorPrompt(config.prompt ?? '');
    setSupervisorTemperature(config.temperature !== undefined ? String(config.temperature) : '0');
    setSupervisorTranscriptWindow(String(config.maxTranscriptMessages));
  }, [selectedRoom?.id, selectedRoom?.supervisor.config]);

  const activeMutation = createRoomMutation.isPending
    || addParticipantMutation.isPending
    || configureSupervisorMutation.isPending
    || advanceTurnMutation.isPending
    || startExecutionMutation.isPending
    || runSupervisorCheckMutation.isPending;

  const mutationError =
    createRoomMutation.error?.message
    ?? addParticipantMutation.error?.message
    ?? configureSupervisorMutation.error?.message
    ?? advanceTurnMutation.error?.message
    ?? startExecutionMutation.error?.message
    ?? runSupervisorCheckMutation.error?.message
    ?? localError;

  async function handleCreateRoom() {
    setLocalError(null);
    const parsed = parseParticipants(createParticipants);
    if (parsed.error) {
      setLocalError(parsed.error);
      return;
    }

    const room = await createRoomMutation.mutateAsync({
      title: createTitle,
      objective: createObjective,
      sharedContext: createContext || undefined,
      mode: createMode,
      participants: parsed.participants,
    });
    setSelectedRoomId(room.id);
  }

  async function handleAddParticipant() {
    if (!selectedRoom) {
      setLocalError('Create or select a room first.');
      return;
    }
    setLocalError(null);
    await addParticipantMutation.mutateAsync({
      roomId: selectedRoom.id,
      participant: {
        id: participantId.trim(),
        name: participantName.trim(),
        provider: participantProvider.trim(),
        model: participantModel.trim(),
      },
    });
  }

  async function handleConfigureSupervisor() {
    if (!selectedRoom) {
      setLocalError('Create or select a room first.');
      return;
    }
    setLocalError(null);
    await configureSupervisorMutation.mutateAsync({
      roomId: selectedRoom.id,
      supervisor: {
        name: supervisorName.trim(),
        provider: supervisorProvider.trim(),
        model: supervisorModel.trim(),
        completionCriteria: completionCriteria.trim(),
        evaluationMode,
        completionAction,
        prompt: supervisorPrompt.trim() || undefined,
        temperature: supervisorTemperature.trim() ? Number.parseFloat(supervisorTemperature) : undefined,
        maxTranscriptMessages: Number.parseInt(supervisorTranscriptWindow, 10) || 18,
      },
    });
  }

  async function handleAdvanceTurn() {
    if (!selectedRoom) {
      setLocalError('Create or select a room first.');
      return;
    }
    setLocalError(null);
    await advanceTurnMutation.mutateAsync({
      roomId: selectedRoom.id,
      summary: roomSummary.trim() || undefined,
      checkpoint: roomCheckpoint.trim() || undefined,
    });
  }

  async function handleStartExecution() {
    if (!selectedRoom) {
      setLocalError('Create or select a room first.');
      return;
    }
    setLocalError(null);
    await startExecutionMutation.mutateAsync({
      roomId: selectedRoom.id,
      checkpoint: roomCheckpoint.trim() || undefined,
    });
  }

  async function handleRunSupervisorCheck() {
    if (!selectedRoom) {
      setLocalError('Create or select a room first.');
      return;
    }
    setLocalError(null);
    await runSupervisorCheckMutation.mutateAsync({ roomId: selectedRoom.id });
  }

  return (
    <div className="space-y-6">
      <Card id="rotation-room-composer">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4 text-purple-400" />
            Rotation room composer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Mode</label>
              <select
                value={createMode}
                onChange={(event) => setCreateMode(event.target.value as RotationRoomMode)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="plan">Plan</option>
                <option value="execute">Execute</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Objective</label>
            <Textarea value={createObjective} onChange={(event) => setCreateObjective(event.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Shared context</label>
            <Textarea value={createContext} onChange={(event) => setCreateContext(event.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Participants</label>
            <Textarea value={createParticipants} onChange={(event) => setCreateParticipants(event.target.value)} rows={5} />
            <p className="text-xs text-muted-foreground">One line per model: <code>id|name|provider|model</code></p>
          </div>
          <Button onClick={() => void handleCreateRoom()} disabled={activeMutation} className="gap-2">
            {createRoomMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create room
          </Button>
        </CardContent>
      </Card>

      {roomsUnavailable ? (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {roomsErrorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-blue-400" />
              Rotation rooms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {roomsUnavailable ? (
              <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-6 text-sm text-red-300">
                {roomsErrorMessage}
              </div>
            ) : rooms.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No rotation rooms yet. Create one above, then add Qwen or another model as the supervisor when ready.
              </div>
            ) : (
              <div className="grid gap-3">
                {rooms.map((room) => {
                  const currentTurn = room.turns.at(-1);
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        selectedRoom?.id === room.id ? 'border-purple-500/40 bg-purple-500/5' : 'border-border/60 hover:bg-accent/30'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{room.title}</span>
                        <Badge variant="outline" className="capitalize">{room.status}</Badge>
                        <Badge variant="secondary" className="capitalize">{room.mode}</Badge>
                        {room.supervisor.config ? (
                          <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                            {room.supervisor.status === 'satisfied' ? 'Supervisor satisfied' : 'Supervisor attached'}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{room.objective}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Cycle {room.currentCycleNumber + 1}</span>
                        {currentTurn ? <span>Turn: {currentTurn.role}</span> : null}
                        <span>{room.participants.length} models</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Radio className="h-4 w-4 text-green-400" />
              Selected room controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedRoom ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Select a room to add models, configure a supervisor, and drive the loop.
              </div>
            ) : (
              <>
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{selectedRoom.title}</span>
                    <Badge variant="outline" className="capitalize">{selectedRoom.status}</Badge>
                    <Badge variant="secondary" className="capitalize">{selectedRoom.mode}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedRoom.objective}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoom.participants.map((participant) => (
                      <Badge key={participant.id} variant="outline">
                        {participant.name} · {participant.model}
                      </Badge>
                    ))}
                  </div>
                  {selectedRoom.lastCheckpoint ? (
                    <p className="text-xs text-muted-foreground">Checkpoint: {selectedRoom.lastCheckpoint}</p>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">Add participant</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={participantId} onChange={(event) => setParticipantId(event.target.value)} placeholder="id" />
                    <Input value={participantName} onChange={(event) => setParticipantName(event.target.value)} placeholder="name" />
                    <Input value={participantProvider} onChange={(event) => setParticipantProvider(event.target.value)} placeholder="provider" />
                    <Input value={participantModel} onChange={(event) => setParticipantModel(event.target.value)} placeholder="model" />
                  </div>
                  <Button onClick={() => void handleAddParticipant()} disabled={activeMutation} variant="outline" className="gap-2">
                    {addParticipantMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    Add model to room
                  </Button>
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium">Supervisor</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={supervisorName} onChange={(event) => setSupervisorName(event.target.value)} placeholder="Supervisor label" />
                    <Input value={supervisorModel} onChange={(event) => setSupervisorModel(event.target.value)} placeholder="Model" />
                    <Input value={supervisorProvider} onChange={(event) => setSupervisorProvider(event.target.value)} placeholder="Provider" />
                    <Input value={supervisorTranscriptWindow} onChange={(event) => setSupervisorTranscriptWindow(event.target.value)} placeholder="Transcript window" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={evaluationMode}
                      onChange={(event) => setEvaluationMode(event.target.value as 'manual' | 'after_turn' | 'after_cycle')}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="manual">Manual</option>
                      <option value="after_turn">After turn</option>
                      <option value="after_cycle">After cycle</option>
                    </select>
                    <select
                      value={completionAction}
                      onChange={(event) => setCompletionAction(event.target.value as 'pause' | 'complete')}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="complete">Complete room</option>
                      <option value="pause">Pause room</option>
                    </select>
                  </div>
                  <Input value={supervisorTemperature} onChange={(event) => setSupervisorTemperature(event.target.value)} placeholder="Temperature" />
                  <Textarea value={completionCriteria} onChange={(event) => setCompletionCriteria(event.target.value)} rows={3} />
                  <Textarea value={supervisorPrompt} onChange={(event) => setSupervisorPrompt(event.target.value)} rows={3} />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void handleConfigureSupervisor()} disabled={activeMutation} className="gap-2">
                      {configureSupervisorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      Save supervisor
                    </Button>
                    <Button onClick={() => void handleRunSupervisorCheck()} disabled={activeMutation} variant="outline" className="gap-2">
                      {runSupervisorCheckMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Run supervisor check
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4 text-orange-400" />
                    <span className="text-sm font-medium">Room drive controls</span>
                  </div>
                  <Textarea value={roomSummary} onChange={(event) => setRoomSummary(event.target.value)} rows={2} placeholder="Turn summary" />
                  <Input value={roomCheckpoint} onChange={(event) => setRoomCheckpoint(event.target.value)} placeholder="Checkpoint" />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void handleAdvanceTurn()} disabled={activeMutation} variant="outline" className="gap-2">
                      {advanceTurnMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                      Advance turn
                    </Button>
                    <Button onClick={() => void handleStartExecution()} disabled={activeMutation} className="gap-2">
                      {startExecutionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Start execution
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium">Latest supervisor verdict</span>
                  </div>
                  {selectedRoom.supervisor.evaluations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No supervisor evaluations yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedRoom.supervisor.evaluations.slice(-2).reverse().map((evaluation) => (
                        <div key={evaluation.evaluatedAt} className="rounded-md border p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant={evaluation.verdict === 'complete' ? 'default' : 'secondary'}>
                              {evaluation.verdict}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(evaluation.evaluatedAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="mt-2">{evaluation.summary}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Satisfied: {evaluation.satisfiedCriteria.join(', ') || 'none'} · Remaining: {evaluation.remainingCriteria.join(', ') || 'none'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <span className="text-sm font-medium">Recent transcript</span>
                  <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
                    {selectedRoom.transcript.slice(-8).map((entry) => (
                      <div key={entry.id} className="rounded-md border p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{entry.participantName}</span>
                          <Badge variant="outline">{entry.role}</Badge>
                          <Badge variant="secondary">{entry.kind}</Badge>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mutationError ? (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {mutationError}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
