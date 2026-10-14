import { t } from '@/services/i18n';
import type { HistoryDay } from '@/services/api';

export const DAY_MS = 86_400_000;

export const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const mondayOf = (date: Date) => {
  const day = (date.getDay() + 6) % 7; // 일요일=0 → 월요일 기준으로 보정
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
};

export const formatWeekRange = (start: Date) => {
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return `${start.getMonth() + 1}.${start.getDate()} – ${end.getMonth() + 1}.${end.getDate()}`;
};

export const formatFocusSeconds = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t('retro.focusMinutes', { minutes });
  return t('retro.focusHours', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
};

export type WeekStats = {
  points: number;
  focusSeconds: number;
  focusSessions: number;
  completedTasks: number;
  goalDays: number;
  dailyPoints: number[];
  taskCounts: { title: string; count: number }[];
};

const emptyStats: WeekStats = {
  points: 0,
  focusSeconds: 0,
  focusSessions: 0,
  completedTasks: 0,
  goalDays: 0,
  dailyPoints: Array(7).fill(0),
  taskCounts: [],
};

export function aggregate(days: HistoryDay[] | undefined): WeekStats {
  if (!days?.length) return emptyStats;
  const stats: WeekStats = { ...emptyStats, dailyPoints: Array(7).fill(0) };
  const perTask = new Map<string, number>();

  days.forEach((day) => {
    stats.points += day.summary.points_total;
    stats.focusSeconds += day.summary.focus_seconds ?? 0;
    if (day.summary.all_goals_completed_at) stats.goalDays += 1;
    const weekday = (new Date(`${day.date}T00:00:00`).getDay() + 6) % 7;
    stats.dailyPoints[weekday] = day.summary.points_total;

    for (const event of day.point_events) {
      if (event.reversed_at) continue;
      if (event.event_type === 'focus_completion') stats.focusSessions += 1;
      // 집중 완료가 자동 체크하는 'focus' 할 일은 '집중 세션' 행과 같은 기록이라 제외한다.
      if (event.event_type === 'task_completion' && event.source_kind !== 'focus') {
        stats.completedTasks += 1;
        const title = event.source_title ?? '-';
        perTask.set(title, (perTask.get(title) ?? 0) + 1);
      }
    }
  });
  stats.taskCounts = [...perTask.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
  return stats;
}
