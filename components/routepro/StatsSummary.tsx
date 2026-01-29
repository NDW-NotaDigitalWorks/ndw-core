// components/routepro/StatsSummary.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteStats } from "@/lib/routepro/stats";

type Props = {
  stats: RouteStats;
};

export function StatsSummary({ stats }: Props) {
  return (
    <Card className="rounded-2xl border mt-6">
      <CardHeader>
        <CardTitle className="text-base">Riepilogo rotta</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-neutral-500">Stop totali</div>
          <div className="text-lg font-semibold">{stats.totalStops}</div>
        </div>

        <div>
          <div className="text-neutral-500">Tempo totale</div>
          <div className="text-lg font-semibold">
            {stats.totalMinutes} min
          </div>
        </div>

        <div>
          <div className="text-neutral-500">Minuti per stop</div>
          <div className="text-lg font-semibold">
            {stats.avgMinutesPerStop}
          </div>
        </div>

        <div>
          <div className="text-neutral-500">Stop / ora</div>
          <div className="text-lg font-semibold">
            {stats.stopsPerHour}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
