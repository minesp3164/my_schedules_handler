import type { RewardUnlockState } from '@/services/api';

export type UnlockRewardKind = 'cheer' | 'recovery' | 'reflection' | 'future' | 'growth';

export type UnlockReward = {
  kind: UnlockRewardKind;
  title: string;
  shortTitle: string;
  description: string;
  threshold: number;
  progress: number;
  unlocked: boolean;
  available: boolean;
  reason: 'locked' | 'used' | 'held' | 'limit' | null;
  unit: 'weekly' | 'total' | 'balance';
  color: string;
  softColor: string;
  dark: boolean;
  onColor: string;
  onSoft: string;
  icon: string;
};

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  return { h: (h + 360) % 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number) {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

// 밝은 카드는 설정 색의 채도를 살짝 올린 연한 틴트, 어두운 카드는 다른 버튼과 같은 설정 색 원색을 쓴다.
// 두 톤을 카드 순서대로 교대 적용하고, 어두운 카드 위의 문자열은 흰색으로 둔다.
function rewardPalette(baseColor: string, index: number) {
  const { h, s } = hexToHsl(baseColor);
  const saturation = Math.min(s + 15, 90);
  const bright = index % 2 === 0;
  return {
    dark: !bright,
    color: bright ? hslToHex(h, saturation, 52) : baseColor,
    softColor: bright ? hslToHex(h, Math.min(saturation, 55), 92) : baseColor,
    onColor: bright ? '#24232A' : '#FFFFFF',
    onSoft: bright ? '#5E5B64' : 'rgba(255,255,255,0.72)',
  };
}

const REWARD_DEFS = [
  {
    kind: 'cheer',
    title: '익명 응원 남기기',
    shortTitle: '익명 응원',
    description: '누군가의 오늘에 짧고 따뜻한 문장을 건네요.',
    threshold: 100,
    icon: '✉',
  },
  {
    kind: 'recovery',
    title: '회복 패스',
    shortTitle: '회복 패스',
    description: '오늘의 할 일 하나를 내일로 부드럽게 옮겨요.',
    threshold: 200,
    icon: '⌁',
  },
  {
    kind: 'reflection',
    title: '주간 회고 열기',
    shortTitle: '주간 회고',
    description: '이번 주의 행동을 한 장의 기록으로 남겨요.',
    threshold: 300,
    icon: '◔',
  },
  {
    kind: 'future',
    title: '미래의 나에게 응원 남기기',
    shortTitle: '미래 편지',
    description: '힘든 날의 나에게 미리 건네는 작은 편지예요.',
    threshold: 400,
    icon: '♡',
  },
  {
    kind: 'growth',
    title: '성장 기록 카드 저장',
    shortTitle: '성장 기록',
    description: '이번 달의 노력과 한 줄 회고를 오래 남겨요.',
    threshold: 500,
    icon: '✦',
  },
] as const;

export function getUnlockRewards(
  totalPoints: number,
  weeklyPoints = 0,
  baseColor = '#52786B',
  states?: RewardUnlockState[] | null
): UnlockReward[] {
  const total = Math.max(0, totalPoints);
  const week = Math.max(0, weeklyPoints);

  // 서버 해금 상태가 있으면 그것을 따른다. 없으면(로딩 중·오프라인) 기존 로컬 계산으로 버틴다.
  return REWARD_DEFS.map((def, index) => {
    const state = states?.find((item) => item.kind === def.kind);
    const localProgress = def.kind === 'cheer' ? Math.min(week, def.threshold) : Math.min(total, def.threshold);
    const unlocked = state ? state.unlocked : total >= def.threshold;
    return {
      ...def,
      ...rewardPalette(baseColor, index),
      progress: state ? state.progress : localProgress,
      unlocked,
      unit: state ? state.unit : 'total',
      available: state ? state.available : unlocked,
      reason: state ? state.reason : unlocked ? null : 'locked',
    };
  });
}

export function rewardRequirement(reward: UnlockReward) {
  if (reward.unit === 'weekly') {
    return `이번 주 ${reward.threshold}점 달성 · ${reward.progress}점 모음`;
  }
  if (reward.unit === 'balance') {
    return `보유 ${reward.threshold}점 필요 · 현재 ${reward.progress}점`;
  }
  return `누적 ${reward.threshold}점 달성 · ${reward.progress}점 모음`;
}
