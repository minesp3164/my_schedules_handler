import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  completeTask,
  createIdempotencyKey,
  revertCompletion,
  type Dashboard,
} from '@/services/api';
import { t } from '@/services/i18n';
import type { DashboardTask } from './board';

// 할 일 +1/되돌리기와 알고리즘 완료 확인창을 함께 다룬다.
export function useTaskCompletion(token: string | null | undefined) {
  const queryClient = useQueryClient();
  const taskMutation = useMutation({
    mutationFn: async ({
      task,
      note,
      companyId,
    }: {
      task: DashboardTask;
      note?: string;
      companyId?: string;
    }) => {
      if (task.read_only) return;
      if (!token) throw new Error(t('common.connectFirst'));
      const completion = task.completions.at(-1);
      const shouldRevert = task.goal_completed;
      return shouldRevert && completion
        ? Promise.all(
            task.completions.map((item) => revertCompletion(item.id, token, createIdempotencyKey()))
          )
        : completeTask(task.id, token, createIdempotencyKey(), note, companyId);
    },
    // 오프라인 큐 적재 시에도 보드의 +1이 즉시 보이도록 캐시를 미리 갱신한다.
    onMutate: async ({ task }) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previous = queryClient.getQueryData<Dashboard>(['dashboard']);
      queryClient.setQueryData<Dashboard>(['dashboard'], (current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((item) => {
                if (item.id !== task.id) return item;
                if (task.goal_completed) {
                  return {
                    ...item,
                    completed_count: 0,
                    remaining_count: item.target_count,
                    goal_completed: false,
                    completions: [],
                  };
                }
                const completed = Math.min(item.completed_count + 1, item.target_count);
                return {
                  ...item,
                  completed_count: completed,
                  remaining_count: Math.max(item.target_count - completed, 0),
                  goal_completed: completed >= item.target_count,
                  completions: [
                    ...item.completions,
                    { id: `optimistic-${Date.now()}`, note: null, note_verified: null },
                  ],
                };
              }),
            }
          : current
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(['dashboard'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
    },
  });
  // 알고리즘 완료만 확인창을 거친다(문제명+답변 확인 후 +1).
  const [confirmTask, setConfirmTask] = useState<DashboardTask | null>(null);
  const confirmAlgorithm = () => {
    if (!confirmTask) return;
    taskMutation.mutate({ task: confirmTask }, { onSuccess: () => setConfirmTask(null) });
  };

  return { taskMutation, confirmTask, setConfirmTask, confirmAlgorithm };
}
