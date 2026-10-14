import { useMutation, useQueryClient } from '@tanstack/react-query';
import { undoDefer, type Dashboard } from '@/services/api';
import { t } from '@/services/i18n';

// 회복 패스로 내일 보낸 할 일을 오늘 안에 되돌린다.
export function useDeferralUndo(token: string | null | undefined) {
  const queryClient = useQueryClient();
  const undoMutation = useMutation({
    mutationFn: (deferralId: string) => {
      if (!token) throw new Error(t('common.connectFirst'));
      return undoDefer(token, deferralId);
    },
    onMutate: async (deferralId: string) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previous = queryClient.getQueryData<Dashboard>(['dashboard']);
      // 이월 목록에서 바로 없애 화면에 즉시 반영한다(할 일 자체의 복귀는 재전송 후 갱신).
      queryClient.setQueryData<Dashboard>(['dashboard'], (current) =>
        current
          ? {
              ...current,
              deferrals: current.deferrals.filter((item) => item.deferral_id !== deferralId),
            }
          : current
      );
      return { previous };
    },
    onError: (_error, _deferralId, context) => {
      if (context?.previous) queryClient.setQueryData(['dashboard'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['reward-unlocks'] });
    },
  });

  return { undoMutation };
}
