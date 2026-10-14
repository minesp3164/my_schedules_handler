import { request, type ApiResponse } from './client';

// 회사 자동완성에서 고른 회사(company_id)를 함께 보내면 서버가 실존 확인으로 표시한다.
export type Company = {
  id: string;
  name: string;
  corp_code: string | null;
  stock_code: string | null;
};

export function searchCompanies(token: string, query: string) {
  return request<ApiResponse<Company[]>>(`/companies/search?q=${encodeURIComponent(query)}`, token);
}

export type ApplicationStageKind = 'submission' | 'interview' | 'pass';

export type ApplicationStage = {
  id: string;
  name: string;
  kind: ApplicationStageKind;
  position: number;
  active: boolean;
  /** 유형별 고정 포인트(서버 결정). 사용자는 이름·순서만 바꾼다. */
  points: number;
};

export type ApplicationStageRecord = {
  id: string;
  stage_id: string;
  name: string;
  kind: ApplicationStageKind;
  points: number;
  completed_at: string;
};

export type Application = {
  id: string;
  company: string;
  title: string | null;
  url: string | null;
  memo: string | null;
  status: 'active' | 'rejected' | 'withdrawn' | 'accepted';
  closed_at: string | null;
  created_at: string;
  /** 완료된 단계 기록(점수 근거) */
  stages: ApplicationStageRecord[];
};

export type ApplicationsResponse = { applications: Application[]; stages: ApplicationStage[] };

export async function getApplications(token: string) {
  return (await request<ApiResponse<ApplicationsResponse>>('/applications', token)).data;
}

export function createApplication(
  token: string,
  input: { company: string; companyId?: string; title?: string; memo?: string }
) {
  return request<ApiResponse<{ application: Application }>>('/applications', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      application: {
        company: input.company,
        company_id: input.companyId,
        title: input.title,
        memo: input.memo,
      },
    }),
  });
}

// 불합격·포기는 종결 상태만 남긴다. 포인트는 회수하지 않는다.
export function closeApplication(token: string, id: string, status: 'rejected' | 'withdrawn') {
  return request<ApiResponse<{ application: Application }>>(`/applications/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application: { status } }),
  });
}

export async function getApplicationStages(token: string) {
  return (await request<ApiResponse<{ stages: ApplicationStage[] }>>('/application-stages', token))
    .data.stages;
}

export function createApplicationStage(
  token: string,
  input: { name: string; kind: ApplicationStageKind }
) {
  return request<ApiResponse<{ stage: ApplicationStage }>>('/application-stages', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application_stage: input }),
  });
}

export function updateApplicationStage(token: string, id: string, name: string) {
  return request<ApiResponse<{ stage: ApplicationStage }>>(`/application-stages/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application_stage: { name } }),
  });
}

// 삭제가 아니라 비활성화. 완료 이력은 그대로 남는다.
export function deactivateApplicationStage(token: string, id: string) {
  return request(`/application-stages/${id}`, token, { method: 'DELETE' });
}

// 지원 단계 완료 = 지원 포인트의 유일한 경로. 제출 단계는 "실제 지원" 할 일도 함께 채워진다.
export function recordStageEvent(
  token: string,
  applicationId: string,
  stageId: string,
  idempotencyKey: string
) {
  return request<{
    data: {
      application: Application;
      stage_event: ApplicationStageRecord;
      daily_summary: { points_total: number; daily_bonus_awarded: boolean } | null;
    };
  }>(`/applications/${applicationId}/stage-events`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ stage_event: { application_stage_id: stageId } }),
  });
}

export function revertStageEvent(token: string, stageEventId: string) {
  return request(`/stage-events/${stageEventId}`, token, { method: 'DELETE' });
}
