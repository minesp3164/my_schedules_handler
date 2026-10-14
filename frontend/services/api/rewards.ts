import { request, type ApiResponse } from './client';

export type RewardRedemption = {
  id: string;
  reward_kind: 'cheer' | 'recovery' | 'reflection' | 'future' | 'growth';
  status: 'unlocked' | 'redeemed' | 'skipped';
  cost_points: number | null;
  period_key: string | null;
  unlocked_at: string;
  redeemed_at: string | null;
  payload: Record<string, string | number | GrowthCardStats | undefined>;
};

// 성장 카드에 들어가는 실제 월간 기록. 서버가 계산한 값만 신뢰한다.
export type GrowthCardStats = {
  month: string;
  focus_minutes: number;
  applications: number;
  goal_days: number;
  activity_days: number;
  points: number;
};

export type RewardUnlockState = {
  kind: RewardRedemption['reward_kind'];
  threshold: number;
  unit: 'weekly' | 'total' | 'balance';
  progress: number;
  unlocked: boolean;
  available: boolean;
  reason: 'locked' | 'used' | 'held' | 'limit' | null;
  period_key: string | null;
  record: RewardRedemption | null;
  stats?: GrowthCardStats;
};

export type RewardUnlocks = {
  total_points: number;
  earned_points: number;
  weekly_points: number;
  unlocks: RewardUnlockState[];
};

export async function getRewardRedemptions(token: string) {
  return (await request<ApiResponse<RewardRedemption[]>>('/reward-redemptions', token)).data;
}

export async function getRewardUnlocks(token: string) {
  return (await request<ApiResponse<RewardUnlocks>>('/reward-unlocks', token)).data;
}

// 해금형 보상 기록(응원·회복 패스·편지·성장 카드). 포인트는 차감하지 않는다.
export function claimReward(
  token: string,
  rewardKind: string,
  idempotencyKey: string,
  payload: Record<string, string | number | undefined> = {}
) {
  return request<{ data: RewardRedemption & { remaining_points: number; replayed: boolean } }>(
    '/reward-redemptions',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ reward_kind: rewardKind, payload }),
    }
  );
}

// 회복 패스 보유 기록의 '나중에 사용할게요' <-> '다시 보기' 전이.
export function updateRewardStatus(token: string, id: string, status: 'unlocked' | 'skipped') {
  return request<ApiResponse<RewardRedemption>>(`/reward-redemptions/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}
