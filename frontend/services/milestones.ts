import type { MilestoneProgress } from '@/services/api';
import { t } from '@/services/i18n';

export const rankTiers = [
  { name: t('footprint.tiers.bronze'), shortName: 'B', color: '#A66A3F' },
  { name: t('footprint.tiers.silver'), shortName: 'S', color: '#68758A' },
  { name: t('footprint.tiers.gold'), shortName: 'G', color: '#A87522' },
  { name: t('footprint.tiers.platinum'), shortName: 'P', color: '#438E98' },
  { name: t('footprint.tiers.diamond'), shortName: 'D', color: '#5969C9' },
] as const;

export type RankTrack = {
  id: 'activity_days' | 'completed_tasks' | 'focus_minutes';
  title: string;
  icon: string;
  unit: string;
  thresholds: number[];
};

export const rankTracks: RankTrack[] = [
  {
    id: 'activity_days',
    title: t('footprint.tracks.activityDays.title'),
    icon: '☀',
    unit: t('footprint.tracks.activityDays.unit'),
    thresholds: [3, 10, 30, 60, 100],
  },
  {
    id: 'completed_tasks',
    title: t('footprint.tracks.completedTasks.title'),
    icon: '✓',
    unit: t('footprint.tracks.completedTasks.unit'),
    thresholds: [10, 50, 150, 300, 500],
  },
  {
    id: 'focus_minutes',
    title: t('footprint.tracks.focusMinutes.title'),
    icon: '⌛',
    unit: t('footprint.tracks.focusMinutes.unit'),
    thresholds: [60, 600, 1800, 3600, 6000],
  },
];

export function trackValue(track: RankTrack, progress: MilestoneProgress) {
  return progress[track.id];
}

export function rankIndex(track: RankTrack, progress: MilestoneProgress) {
  const value = trackValue(track, progress);
  return track.thresholds.reduce(
    (current, threshold, index) => (value >= threshold ? index : current),
    -1
  );
}

export function currentRank(track: RankTrack, progress: MilestoneProgress) {
  return rankTiers[Math.max(rankIndex(track, progress), 0)];
}

export function formatTrackValue(track: RankTrack, value: number) {
  if (track.id === 'focus_minutes') {
    return t('footprint.metric.hoursMinutes', {
      hours: Math.floor(value / 60),
      minutes: value % 60,
    });
  }
  return `${value}${track.unit}`;
}

export function nextRank(track: RankTrack, progress: MilestoneProgress) {
  const index = rankIndex(track, progress) + 1;
  if (index >= rankTiers.length) return null;
  return { tier: rankTiers[index], threshold: track.thresholds[index] };
}

export function overallRank(progress: MilestoneProgress) {
  const indexes = rankTracks.map((track) => Math.max(rankIndex(track, progress), 0));
  const averageIndex = Math.round(indexes.reduce((sum, index) => sum + index, 0) / indexes.length);
  return rankTiers[averageIndex];
}

export function builderBadge(createdTasks: number) {
  if (createdTasks >= 10)
    return {
      title: t('footprint.builder.system.title'),
      description: t('footprint.builder.system.description'),
    };
  if (createdTasks >= 3)
    return {
      title: t('footprint.builder.designer.title'),
      description: t('footprint.builder.designer.description'),
    };
  if (createdTasks >= 1)
    return {
      title: t('footprint.builder.first.title'),
      description: t('footprint.builder.first.description'),
    };
  return null;
}
