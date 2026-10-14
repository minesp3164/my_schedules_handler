import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  claimReward,
  createIdempotencyKey,
  deferTask,
  undoDefer,
  updateRewardStatus,
} from '@/services/api';
import type { UnlockRewardKind } from '@/services/reward-unlocks';
import type { ClaimPayload, OnClaim, OnStatusChange } from './shared';

// 보상 상세 화면의 모든 변이: 해금 · 상태 전이 · 회복 패스 이월/취소와 배너 오류 상태.
export function useRewardActions({
  token,
  kind,
  recordId,
}: {
  token: string | null | undefined;
  kind: UnlockRewardKind;
  recordId: string | null;
}) {
  const queryClient = useQueryClient();
  const [claimError, setClaimError] = useState<string | null>(null);

  const invalidateRewards = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['redemptions'] });
    queryClient.invalidateQueries({ queryKey: ['reward-unlocks'] });
    queryClient.invalidateQueries({ queryKey: ['history'] });
    queryClient.invalidateQueries({ queryKey: ['history-calendar'] });
    queryClient.invalidateQueries({ queryKey: ['badges'] });
  };

  // 웹에서는 Alert가 무음이므로 화면 상단 배너로 오류를 보여준다.
  const redeem = useMutation({
    mutationFn: (payload: ClaimPayload) =>
      claimReward(token!, kind, createIdempotencyKey(), payload),
    onSuccess: () => {
      setClaimError(null);
      invalidateRewards();
    },
    onError: (error: Error) => setClaimError(error.message),
  });
  const changeStatus = useMutation({
    mutationFn: (input: { id: string; status: 'unlocked' | 'skipped' }) =>
      updateRewardStatus(token!, input.id, input.status),
    onSuccess: () => {
      setClaimError(null);
      invalidateRewards();
    },
    onError: (error: Error) => setClaimError(error.message),
  });
  // 회복 패스 사용 = 할 일 하나를 내일로 이월. 되돌리기는 패스도 되돌려 준다.
  const defer = useMutation({
    mutationFn: (taskTemplateId: string) =>
      deferTask(token!, taskTemplateId, createIdempotencyKey()),
    onSuccess: () => {
      setClaimError(null);
      invalidateRewards();
    },
    onError: (error: Error) => setClaimError(error.message),
  });
  const undo = useMutation({
    mutationFn: (deferralId: string) => undoDefer(token!, deferralId),
    onSuccess: () => {
      setClaimError(null);
      invalidateRewards();
    },
    onError: (error: Error) => setClaimError(error.message),
  });

  const onClaim: OnClaim = async (payload) => {
    try {
      await redeem.mutateAsync(payload);
      return true;
    } catch {
      return false;
    }
  };
  const onStatusChange: OnStatusChange = async (status) => {
    if (!recordId) return false;
    try {
      await changeStatus.mutateAsync({ id: recordId, status });
      return true;
    } catch {
      return false;
    }
  };
  const onDefer = async (taskTemplateId: string) => {
    try {
      await defer.mutateAsync(taskTemplateId);
      return true;
    } catch {
      return false;
    }
  };
  const onUndo = async (deferralId: string) => {
    try {
      await undo.mutateAsync(deferralId);
      return true;
    } catch {
      return false;
    }
  };

  return { claimError, onClaim, onStatusChange, onDefer, onUndo };
}
