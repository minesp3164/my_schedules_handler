import type { Dashboard } from '@/services/api';

type DashboardTask = Dashboard['tasks'][number];

export type TodayRecommendation =
  | { type: 'focus' }
  | {
      type: 'task';
      task: DashboardTask;
      completesReward: boolean;
    };

export function getTodayRecommendations(
  tasks: DashboardTask[],
  points: number,
  rewardGoal = 100
): TodayRecommendation[] {
  const unfinished = tasks.filter((task) => !task.goal_completed);
  if (unfinished.length === 0) return [{ type: 'focus' }];

  const remaining = Math.max(rewardGoal - points, 0);
  const rewardFinisher = unfinished
    .filter((task) => remaining > 0 && task.points >= remaining)
    .sort((left, right) => left.points - right.points)[0];
  const inProgress = unfinished.find((task) => task.completed_count > 0);
  const lightest = [...unfinished].sort((left, right) => left.points - right.points)[0];
  const orderedTasks = [rewardFinisher, inProgress, lightest, ...unfinished].filter(
    (task, index, list): task is DashboardTask => Boolean(task) && list.indexOf(task) === index
  );
  const taskRecommendations = orderedTasks.map((task) => ({
    type: 'task' as const,
    task,
    completesReward: task === rewardFinisher,
  }));

  return points === 0
    ? [{ type: 'focus' }, ...taskRecommendations]
    : [...taskRecommendations, { type: 'focus' }];
}
