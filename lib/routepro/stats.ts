// lib/routepro/stats.ts

export type RouteStats = {
  totalStops: number;
  totalMinutes: number;
  avgMinutesPerStop: number;
  stopsPerHour: number;
};

export function computeRouteStats(params: {
  totalStops: number;
  startedAt: Date;
  endedAt: Date;
}): RouteStats {
  const totalMinutes =
    (params.endedAt.getTime() - params.startedAt.getTime()) / 60000;

  const avgMinutesPerStop =
    params.totalStops > 0 ? totalMinutes / params.totalStops : 0;

  const stopsPerHour =
    totalMinutes > 0 ? (params.totalStops / totalMinutes) * 60 : 0;

  return {
    totalStops: params.totalStops,
    totalMinutes: Math.round(totalMinutes),
    avgMinutesPerStop: Number(avgMinutesPerStop.toFixed(2)),
    stopsPerHour: Number(stopsPerHour.toFixed(1)),
  };
}
