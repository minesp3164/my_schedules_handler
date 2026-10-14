import { createUuid } from '@/services/ids';
import { request, type ApiResponse } from './client';

export type TaskTemplate = {
  id: string;
  title: string;
  points: number;
  target_count: number;
  position: number;
  kind: string;
  active: boolean;
  weekdays: number[];
};

export async function getTaskTemplates(token: string) {
  return (await request<ApiResponse<TaskTemplate[]>>('/task_templates', token)).data;
}

export type NewTaskTemplate = Omit<TaskTemplate, 'id' | 'active' | 'points'> & {
  points?: number;
};

export function createTaskTemplate(token: string, task: NewTaskTemplate) {
  return request<ApiResponse<TaskTemplate>>('/task_templates', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_template: task }),
    // 오프라인 추가는 임시 id 로 캐시에 먼저 반영한다(재전송 후 서버 id 로 교체된다).
    optimistic: () => ({
      data: {
        id: `pending:${createUuid()}`,
        title: task.title,
        points: task.points ?? 0,
        target_count: task.target_count,
        position: task.position,
        kind: task.kind,
        active: true,
        weekdays: task.weekdays,
      },
    }),
  });
}

export function updateTaskTemplate(token: string, id: string, task: NewTaskTemplate) {
  return request<ApiResponse<TaskTemplate>>(`/task_templates/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_template: task }),
  });
}

export function deactivateTaskTemplate(token: string, id: string) {
  return request(`/task_templates/${id}`, token, { method: 'DELETE' });
}
