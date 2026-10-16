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
    onMutate: async ({ task, note, companyId }) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previous = queryClient.getQueryData<Dashboard>(['dashboard']);
      const trimmedNote = note?.trim() || null;
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
                    {
                      id: `optimistic-${Date.now()}`,
                      note: trimmedNote,
                      // 목록에서 고른 회사만 실존 확인, 직접 적은 값은 미확인으로 미리 표시한다.
                      note_verified: trimmedNote ? Boolean(companyId) : null,
                    },
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

  // 기업 리서치는 확인창에서 "어떤 기업을 조사했는지" 회사명을 받는다.
  const [researchPrompt, setResearchPrompt] = useState<DashboardTask | null>(null);
  const closeResearch = () => setResearchPrompt(null);
  const confirmResearch = (note: string, companyId: string | null) => {
    if (!researchPrompt) return;
    taskMutation.mutate(
      { task: researchPrompt, note, companyId: companyId ?? undefined },
      { onSuccess: closeResearch }
    );
  };
  // 회사 없이 조사만 끝낸 날은 회사명 없이 완료로 남긴다.
  const skipResearchNote = () => {
    if (!researchPrompt) return;
    taskMutation.mutate({ task: researchPrompt }, { onSuccess: closeResearch });
  };

  // 기술 블로그/회고는 확인창에서 "어느 글을 발행했는지" 글 주소를 받는다.
  const [portfolioPrompt, setPortfolioPrompt] = useState<DashboardTask | null>(null);
  const closePortfolio = () => setPortfolioPrompt(null);
  const confirmPortfolio = (url: string) => {
    if (!portfolioPrompt) return;
    taskMutation.mutate({ task: portfolioPrompt, note: url }, { onSuccess: closePortfolio });
  };

  return {
    taskMutation,
    confirmTask,
    setConfirmTask,
    confirmAlgorithm,
    researchPrompt,
    setResearchPrompt,
    confirmResearch,
    skipResearchNote,
    portfolioPrompt,
    setPortfolioPrompt,
    confirmPortfolio,
  };
}
