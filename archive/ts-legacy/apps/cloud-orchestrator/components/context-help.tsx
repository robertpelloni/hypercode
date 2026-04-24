'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HelpCircle, ExternalLink } from "lucide-react";
import { HELP_CONTENT } from "@/lib/help-content";
import { cn } from "@/lib/utils";

interface ContextHelpProps {
  topic?: string;
  className?: string;
}

export function ContextHelp({ topic = "default", className }: ContextHelpProps) {
  const content = HELP_CONTENT[topic] || HELP_CONTENT["default"];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("rounded-full hover:bg-white/10", className)} title="Help">
          <HelpCircle className="h-5 w-5 text-muted-foreground hover:text-white transition-colors" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-zinc-950 border-l border-white/10 w-[400px] sm:w-[540px] text-white">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2 text-xl">
            <HelpCircle className="h-6 w-6 text-purple-400" />
            {content.title}
          </SheetTitle>
          <SheetDescription className="text-white/60 text-base mt-4 leading-relaxed">
            {content.summary}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          <div className="space-y-4">
             <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Related Resources</h4>
             <div className="grid gap-3">
                 {content.docSlug && (
                   <a href={`/docs/${content.docSlug}`}>
                     <Button variant="outline" className="w-full justify-between bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition-colors h-12">
                        <span>Read Full Documentation</span>
                        <ExternalLink className="h-4 w-4 opacity-50" />
                     </Button>
                   </a>
                 )}
                 <a href="/docs">
                   <Button variant="outline" className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-white hover:text-white transition-colors h-12">
                      <span>Documentation Home</span>
                      <ExternalLink className="h-4 w-4 opacity-50" />
                   </Button>
                 </a>
             </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
