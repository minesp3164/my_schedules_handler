import { t } from '@/services/i18n';
import type { Dashboard } from '@/services/api';

export type DashboardTask = NonNullable<Dashboard['tasks']>[number];
export type BoardStatus = 'todo' | 'doing' | 'done';

// Mindvalley Progress 스크린에서 가져온 토큰: 먹빛 텍스트 + 흰 바탕 + 헤어라인 카드.
export const INK = '#111418';
export const META = '#8A9099';
export const TRACK = '#EEF0F2';
export const RING = '#DDE1E6';

const boardColumns: { id: BoardStatus; labelKey: string; captionKey: string }[] = [
  { id: 'todo', labelKey: 'home.board.todo.label', captionKey: 'home.board.todo.caption' },
  { id: 'doing', labelKey: 'home.board.doing.label', captionKey: 'home.board.doing.caption' },
  { id: 'done', labelKey: 'home.board.done.label', captionKey: 'home.board.done.caption' },
];

export function getTaskStatus(task: DashboardTask): BoardStatus {
  if (task.goal_completed) return 'done';
  if (task.completed_count > 0) return 'doing';
  return 'todo';
}

export type BoardColumn = (typeof boardColumns)[number] & {
  label: string;
  caption: string;
  tasks: DashboardTask[];
};

// 할 일을 상태(할 일/하는 중/완료)별 컬럼으로 나눈다.
export function buildBoard(tasks: DashboardTask[]): BoardColumn[] {
  return boardColumns.map((column) => ({
    ...column,
    label: t(column.labelKey),
    caption: t(column.captionKey),
    tasks: tasks.filter((task) => getTaskStatus(task) === column.id),
  }));
}
