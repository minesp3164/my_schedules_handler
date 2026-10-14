import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Badge, BadgeCategory, BadgeMetric, MilestoneProgress } from '@/services/api';
import { t } from '@/services/i18n';

// 카테고리 순서와 한글 라벨은 발자국 화면 칩과 배지 카드에 함께 쓴다.
export const badgeCategories: { key: BadgeCategory | 'all'; label: string }[] = [
  { key: 'all', label: t('footprint.categories.all') },
  { key: 'routine', label: t('footprint.categories.routine') },
  { key: 'steady', label: t('footprint.categories.steady') },
  { key: 'focus', label: t('footprint.categories.focus') },
  { key: 'apply', label: t('footprint.categories.apply') },
  { key: 'algorithm', label: t('footprint.categories.algorithm') },
  { key: 'portfolio', label: t('footprint.categories.portfolio') },
];

export const categoryLabels: Record<BadgeCategory, string> = {
  routine: t('footprint.categories.routine'),
  steady: t('footprint.categories.steady'),
  focus: t('footprint.categories.focus'),
  apply: t('footprint.categories.apply'),
  algorithm: t('footprint.categories.algorithm'),
  portfolio: t('footprint.categories.portfolio'),
};

// 카테고리별 메달 색(채택 목업 기준): 루틴=민트, 꾸준함·지원·포트폴리오=골드, 집중=스카이, 알고리즘=실버.
const medalColors: Record<BadgeCategory, string> = {
  routine: '#7BC4AC',
  steady: '#F0B93F',
  focus: '#93A3D4',
  apply: '#F0B93F',
  algorithm: '#A9B4BE',
  portfolio: '#F0B93F',
};

export function medalColor(category: BadgeCategory) {
  return medalColors[category];
}

// 지표별 단위: 지원=건, 알고리즘=문제, 포트폴리오=회, 나머지=일·시간·개.
export function formatMetric(metric: BadgeMetric, value: number) {
  if (metric === 'focus_minutes') {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return minutes
      ? t('footprint.metric.hoursMinutes', { hours, minutes })
      : t('footprint.metric.hours', { hours });
  }
  if (metric === 'activity_days') return t('footprint.metric.days', { count: value });
  if (metric === 'application_completions')
    return t('footprint.metric.applications', { count: value });
  if (metric === 'algorithm_completions') return t('footprint.metric.problems', { count: value });
  if (metric === 'portfolio_completions') return t('footprint.metric.times', { count: value });
  return t('footprint.metric.count', { count: value });
}

function targetLabel(metric: BadgeMetric, value: number) {
  const formatted = formatMetric(metric, value);
  if (metric === 'activity_days') return t('footprint.metric.targetActivity', { value: formatted });
  if (metric === 'focus_minutes')
    return t('footprint.metric.targetAccumulated', { value: formatted });
  if (metric === 'application_completions')
    return t('footprint.metric.targetApplications', { value: formatted });
  if (metric === 'created_tasks') return t('footprint.metric.targetTasks', { value: formatted });
  if (metric === 'completed_tasks')
    return t('footprint.metric.targetCompleted', { value: formatted });
  return formatted;
}

// 잠긴 배지 칩: "지원 20건 · 15건 남음"처럼 기준과 남은 거리를 함께 보여준다.
export function needText(badge: Badge, progress: MilestoneProgress) {
  const remaining = Math.max(badge.threshold - progress[badge.metric], 0);
  const target = targetLabel(badge.metric, badge.threshold);
  return remaining
    ? t('footprint.metric.remaining', {
        target,
        value: formatMetric(badge.metric, remaining),
      })
    : target;
}

// 축하 시트의 달성 근거 한 줄.
export function achievementReason(badge: Badge, progress: MilestoneProgress) {
  const current = progress[badge.metric];
  if (badge.metric === 'activity_days') {
    return t('footprint.reason.activityDays', { threshold: badge.threshold, current });
  }
  if (badge.metric === 'focus_minutes') {
    return t('footprint.reason.focusMinutes', {
      target: formatMetric(badge.metric, badge.threshold),
      current: formatMetric(badge.metric, current),
    });
  }
  if (badge.metric === 'created_tasks') {
    return t('footprint.reason.createdTasks', { threshold: badge.threshold, current });
  }
  if (badge.metric === 'application_completions') {
    return t('footprint.reason.applications', { threshold: badge.threshold, current });
  }
  if (badge.metric === 'algorithm_completions') {
    return t('footprint.reason.algorithms', { threshold: badge.threshold, current });
  }
  if (badge.metric === 'portfolio_completions') {
    return t('footprint.reason.portfolio', { threshold: badge.threshold, current });
  }
  return t('footprint.reason.default', { threshold: badge.threshold, current });
}

// 날짜 표기는 앱 전체에서 2026.09.23 형태로 통일한다.
export function formatBadgeDate(iso: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10).replace(/-/g, '.');
}

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function isAchievedToday(badge: Badge) {
  if (!badge.achieved_at) return false;
  return badge.achieved_at.slice(0, 10) === localDateKey(new Date());
}

const celebratedStorageKey = 'reward-tracker-celebrated-badges';

async function readCelebrated() {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.localStorage?.getItem(celebratedStorageKey) ?? null);
  }
  try {
    return await SecureStore.getItemAsync(celebratedStorageKey);
  } catch {
    return null;
  }
}

// exists=false면 아직 시드 전(첫 실행)이다. 축하 이력이 없으면 배지를 조용히 시드해 조용히 넘긴다.
export async function loadCelebratedBadgeKeys(): Promise<{ keys: string[]; exists: boolean }> {
  const raw = await readCelebrated();
  if (raw === null) return { keys: [], exists: false };
  try {
    const parsed = JSON.parse(raw);
    const keys = Array.isArray(parsed)
      ? parsed.filter((key: unknown): key is string => typeof key === 'string')
      : [];
    return { keys, exists: true };
  } catch {
    return { keys: [], exists: false };
  }
}

export async function saveCelebratedBadgeKeys(keys: string[]) {
  const value = JSON.stringify(keys);
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(celebratedStorageKey, value);
      return;
    }
    await SecureStore.setItemAsync(celebratedStorageKey, value);
  } catch {
    // 저장에 실패해도 앱은 계속 돌아가고, 다음 실행에서 다시 시드된다.
  }
}
