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

// 오늘 리서치 완료에 남은 회사명(중복 제거). 홈 보드와 리서치 시트가 같은 값을 보게 한다.
export function researchNotes(task: DashboardTask): string[] {
  if (task.kind !== 'research') return [];
  const notes = task.completions
    .map((completion) => completion.note?.trim())
    .filter((note): note is string => Boolean(note));
  return [...new Set(notes)];
}

// 목록에서 고르지 않고 직접 적은 회사가 하나라도 있으면 미확인으로 표시한다.
export function hasUnverifiedNote(task: DashboardTask): boolean {
  return task.completions.some(
    (completion) => Boolean(completion.note) && completion.note_verified === false
  );
}

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
