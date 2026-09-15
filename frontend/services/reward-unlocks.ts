export type UnlockRewardKind = 'cheer' | 'recovery' | 'reflection' | 'future' | 'growth';

export type UnlockReward = {
  kind: UnlockRewardKind;
  title: string;
  shortTitle: string;
  description: string;
  threshold: number;
  progress: number;
  unlocked: boolean;
  unit: 'weekly' | 'total';
  color: string;
  softColor: string;
  icon: string;
};

export function getUnlockRewards(totalPoints: number, _weeklyPoints = 0): UnlockReward[] {
  const total = Math.max(0, totalPoints);

  return [
    {
      kind: 'cheer',
      title: '익명 응원 남기기',
      shortTitle: '익명 응원',
      description: '누군가의 오늘에 짧고 따뜻한 문장을 건네요.',
      threshold: 100,
      progress: Math.min(total, 100),
      unlocked: total >= 100,
      unit: 'total',
      color: '#E85E4A',
      softColor: '#FFE4DE',
      icon: '✉',
    },
    {
      kind: 'recovery',
      title: '회복 패스',
      shortTitle: '회복 패스',
      description: '오늘의 할 일 하나를 내일로 부드럽게 옮겨요.',
      threshold: 200,
      progress: Math.min(total, 200),
      unlocked: total >= 200,
      unit: 'total',
      color: '#5F7D12',
      softColor: '#EEFFC4',
      icon: '⌁',
    },
    {
      kind: 'reflection',
      title: '주간 회고 열기',
      shortTitle: '주간 회고',
      description: '이번 주의 행동을 한 장의 기록으로 남겨요.',
      threshold: 300,
      progress: Math.min(total, 300),
      unlocked: total >= 300,
      unit: 'total',
      color: '#7057D5',
      softColor: '#EAE5FF',
      icon: '◔',
    },
    {
      kind: 'future',
      title: '미래의 나에게 응원 남기기',
      shortTitle: '미래 편지',
      description: '힘든 날의 나에게 미리 건네는 작은 편지예요.',
      threshold: 400,
      progress: Math.min(total, 400),
      unlocked: total >= 400,
      unit: 'total',
      color: '#4876BD',
      softColor: '#E2EFFF',
      icon: '♡',
    },
    {
      kind: 'growth',
      title: '성장 기록 카드 저장',
      shortTitle: '성장 기록',
      description: '이번 달의 노력과 한 줄 회고를 오래 남겨요.',
      threshold: 500,
      progress: Math.min(total, 500),
      unlocked: total >= 500,
      unit: 'total',
      color: '#A27317',
      softColor: '#FFF2BC',
      icon: '✦',
    },
  ];
}

export function rewardRequirement(reward: UnlockReward) {
  return `가격 ${reward.threshold}점`;
}
