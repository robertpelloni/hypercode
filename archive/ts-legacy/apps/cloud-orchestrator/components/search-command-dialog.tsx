'use client';

import * as React from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  MessageSquare, 
  LayoutTemplate, 
  Trello, 
  Users,
  Settings,
  Plus,
  HeartPulse
} from 'lucide-react';

interface SearchCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (view: 'sessions' | 'templates' | 'kanban' | 'debates' | 'health') => void;
}

export function SearchCommandDialog({
  open,
  onOpenChange,
  onNavigate,
}: SearchCommandDialogProps) {
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const runCommand = React.useCallback((command: () => void) => {
    onOpenChange(false);
    command();
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList className="bg-zinc-950 text-white">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('sessions'))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Go to Sessions</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('templates'))}>
            <LayoutTemplate className="mr-2 h-4 w-4" />
            <span>Go to Templates</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('kanban'))}>
            <Trello className="mr-2 h-4 w-4" />
            <span>Go to Kanban</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('debates'))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Go to Debates</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('health'))}>
            <HeartPulse className="mr-2 h-4 w-4" />
            <span>Go to Health</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator className="bg-white/10" />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Session</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Open Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
