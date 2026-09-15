import type { MilestoneProgress } from '@/services/api';

export const rankTiers = [
  { name: '브론즈', shortName: 'B', color: '#A66A3F' },
  { name: '실버', shortName: 'S', color: '#68758A' },
  { name: '골드', shortName: 'G', color: '#A87522' },
  { name: '플래티넘', shortName: 'P', color: '#438E98' },
  { name: '다이아', shortName: 'D', color: '#5969C9' },
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
    title: '활동한 날',
    icon: '☀',
    unit: '일',
    thresholds: [3, 10, 30, 60, 100],
  },
  {
    id: 'completed_tasks',
    title: '누적 할 일 완료',
    icon: '✓',
    unit: '개',
    thresholds: [10, 50, 150, 300, 500],
  },
  {
    id: 'focus_minutes',
    title: '누적 집중 시간',
    icon: '⌛',
    unit: '시간',
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
  if (track.id === 'focus_minutes') return `${Math.floor(value / 60)}시간 ${value % 60}분`;
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
    return { title: '나만의 시스템', description: '할 일 10개를 만들어 나만의 루틴을 구성했어요.' };
  if (createdTasks >= 3)
    return { title: '루틴 설계자', description: '할 일 3개를 만들어 하루의 흐름을 정했어요.' };
  if (createdTasks >= 1)
    return { title: '첫 루틴', description: '첫 할 일을 만들고 시작을 준비했어요.' };
  return null;
}
