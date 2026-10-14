import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createApplication,
  createIdempotencyKey,
  getApplications,
  recordStageEvent,
  searchCompanies,
  type Dashboard,
} from '@/services/api';
import { t } from '@/services/i18n';
import type { DashboardTask } from './board';

// 서버의 Company.normalize_name과 같은 키로 회사명을 비교한다(괄호·법인형태 제거, 소문자).
const normalizeCompany = (name: string) =>
  name
    .toLowerCase()
    .replace(/[（(][^）)]*[）)]/g, ' ')
    .replace(/주식회사|유한회사|유한책임회사|사단법인|재단법인/g, ' ')
    .replace(/\b(inc|corp|corporation|ltd|llc|co|company|limited)\b/g, ' ')
    .replace(/[^0-9a-z가-힣]/g, '');

// "실제 지원" 회사 확인 → 회사명 입력 시트를 함께 다룬다.
export function useApplicationStage(token: string | null | undefined) {
  const queryClient = useQueryClient();
  // 실제 지원 완료 전 회사명 입력 시트 상태.
  const [applicationPrompt, setApplicationPrompt] = useState<DashboardTask | null>(null);
  // "실제 지원" 회사 확인 → 해당 건의 제출 단계를 기록한다. 지원 포인트의 유일한 경로이며
  // 제출 단계 기록이 그날의 할 일 완료까지 자동으로 채운다(포인트는 중복 지급되지 않는다).
  const stageMutation = useMutation({
    mutationFn: async ({ note, companyId }: { note: string; companyId: string | null }) => {
      if (!token) throw new Error(t('common.connectFirst'));
      const { applications, stages } = await getApplications(token);
      const submission = stages.find((stage) => stage.kind === 'submission' && stage.active);
      if (!submission) throw new Error(t('applications.error.noSubmissionStage'));
      const key = normalizeCompany(note);
      let application = applications.find(
        (item) => item.status === 'active' && normalizeCompany(item.company) === key
      );
      if (!application) {
        try {
          const created = await createApplication(token, {
            company: note,
            companyId: companyId ?? undefined,
          });
          application = created.data.application;
        } catch (error) {
          // 같은 회사의 진행 중인 건이 이미 있는 경우(서버 검증) → 그 건에 이어 기록한다.
          const fresh = await getApplications(token);
          application = fresh.applications.find(
            (item) => item.status === 'active' && normalizeCompany(item.company) === key
          );
          if (!application) throw error;
        }
      }
      return recordStageEvent(token, application.id, submission.id, createIdempotencyKey());
    },
    // 오프라인 큐 적재 시에도 보드의 +1이 즉시 보이도록 캐시를 미리 갱신한다.
    onMutate: async () => {
      if (!applicationPrompt) return;
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previous = queryClient.getQueryData<Dashboard>(['dashboard']);
      queryClient.setQueryData<Dashboard>(['dashboard'], (current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((item) => {
                if (item.id !== applicationPrompt.id) return item;
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
                      note: null,
                      note_verified: null,
                      stage_backed: true,
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
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
  // 회사 자동완성: 캐시된 실존 목록에서 검색해 시트에 넘긴다.
  const searchCompanyList = useCallback(
    async (query: string) => {
      if (!token) return [];
      const companies = await searchCompanies(token, query);
      return companies.data;
    },
    [token]
  );
  // 지원한 회사명이 확인돼야 완료로 넘어간다(빈 값은 시트에서 막고, 회사 선택 여부는 서버가 재검증한다).
  const confirmApplication = (note: string, companyId: string | null) => {
    if (!applicationPrompt) return;
    stageMutation.mutate({ note, companyId }, { onSuccess: () => setApplicationPrompt(null) });
  };

  return {
    stageMutation,
    applicationPrompt,
    setApplicationPrompt,
    searchCompanyList,
    confirmApplication,
  };
}
