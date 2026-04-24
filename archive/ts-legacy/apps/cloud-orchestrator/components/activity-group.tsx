'use client';

import { memo } from 'react';
import { Activity } from '@jules/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ActivityContent } from './activity-content';

interface ActivityGroupProps {
  activities: Activity[];
}

export const ActivityGroup = memo(function ActivityGroup({ activities }: ActivityGroupProps) {
  // Filter nulls (empty JSONs that slipped)
  const validItems = activities.filter(a => a.content);
  if (validItems.length === 0) return null;

  return (
    <div className="flex gap-2.5">
      <Avatar className="h-6 w-6 shrink-0 mt-0.5 bg-muted border border-border">
        <AvatarFallback className="bg-white text-black text-[9px] font-bold uppercase tracking-wider">J</AvatarFallback>
      </Avatar>
      <Card className="flex-1 border-border bg-card/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2 text-card-foreground">
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider bg-yellow-500/90 border-transparent text-black font-bold">progress</Badge>
            <span className="text-[9px] font-mono text-muted-foreground tracking-wide">{validItems.length} updates</span>
          </div>
          <div className="space-y-2">
            {validItems.map((activity, idx) => (
              <div key={activity.id} className={idx > 0 ? 'pt-2 border-t border-border' : ''}>
                <div className="text-[11px] leading-relaxed break-words">
                    <ActivityContent content={activity.content} metadata={activity.metadata} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
