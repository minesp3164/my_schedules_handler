import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import type { TodayRecommendation } from '@/services/today-recommendation';
import { NextActionCard } from './NextActionCard';
import { INK, RING, TRACK, type BoardColumn, type DashboardTask } from './board';

// 상태별 스택 리스트
export function BoardTaskList({
  loading,
  column,
  allTasksCount,
  recommendation,
  hasAlternatives,
  busy,
  onComplete,
  onNextRecommendation,
}: {
  loading: boolean;
  column: BoardColumn;
  allTasksCount: number;
  recommendation: TodayRecommendation | undefined;
  hasAlternatives: boolean;
  busy: boolean;
  onComplete: (task: DashboardTask) => void;
  onNextRecommendation: () => void;
}) {
  const { palette } = useTheme();
  return (
    <View className="mx-5 mt-3 rounded-3xl border border-hairline bg-white">
      <View className="px-5 pt-4">
        <Text className="text-xs text-meta">{column.caption}</Text>
      </View>

      {loading ? (
        <Text className="px-5 pb-6 pt-5 text-[13px] text-meta">{t('home.loading')}</Text>
      ) : column.tasks.length === 0 ? (
        <View className="px-5 pb-6 pt-4">
          {column.id === 'todo' && allTasksCount === 0 ? (
            <Pressable
              onPress={() => router.push('/tasks')}
              accessibilityRole="button"
              accessibilityLabel={t('home.configureGoals')}
              accessibilityHint={t('home.configureGoalsHint')}
              className="flex-row items-center justify-between rounded-2xl border border-hairline px-4 py-3.5 transition duration-150 hover:opacity-90">
              <View className="flex-1 pr-3">
                <Text className="text-[15px] font-bold text-ink">{t('home.configureGoals')}</Text>
                <Text className="mt-0.5 text-xs text-meta">{t('home.configureGoalsHint')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={INK} />
            </Pressable>
          ) : null}

          {column.id === 'todo' && recommendation ? (
            <NextActionCard
              embedded
              recommendation={recommendation}
              hasAlternatives={hasAlternatives}
              disabled={busy}
              onAct={() => {
                if (recommendation.type === 'focus') {
                  router.push('/focus');
                  return;
                }
                onComplete(recommendation.task);
              }}
              onNext={onNextRecommendation}
            />
          ) : (
            <View className="items-center px-4 pb-2 pt-6">
              <View className="h-9 w-9 rounded-full border-2" style={{ borderColor: RING }} />
              <Text className="mt-3 text-center text-[13px] leading-5 text-meta">
                {column.id === 'done' ? t('home.emptyDone') : t('home.emptyColumn')}
              </Text>
            </View>
          )}
        </View>
      ) : (
        column.tasks.map((task, index) => {
          const taskProgress = Math.min(
            100,
            Math.round((task.completed_count / task.target_count) * 100)
          );
          const statusLabel = task.goal_completed
            ? task.read_only
              ? t('home.goalCompletedReadOnly', {
                  completed: task.completed_count,
                  total: task.target_count,
                })
              : t('home.goalCompletedProgress', {
                  completed: task.completed_count,
                  total: task.target_count,
                })
            : t('home.taskProgress', {
                completed: task.completed_count,
                total: task.target_count,
              });
          const lastCompletion = task.completions.at(-1);
          const recordedNote =
            task.kind === 'application' && lastCompletion?.note ? lastCompletion.note : null;
          const noteUnverified = lastCompletion?.note_verified === false;
          return (
            <View key={task.id}>
              {index > 0 ? <View className="mx-5 h-px bg-hairline" /> : null}
              <Pressable
                disabled={busy || task.read_only}
                onPress={() => {
                  if (!task.goal_completed && task.kind === 'focus') {
                    router.push('/focus');
                    return;
                  }
                  onComplete(task);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('home.taskAccessibility', {
                  title: task.title,
                  action: task.read_only
                    ? t('home.goalCompleted')
                    : task.goal_completed
                      ? t('home.revertAction')
                      : task.kind === 'focus'
                        ? t('focus.start')
                        : t('home.completeAction'),
                })}
                className="px-5 py-4 transition duration-150 hover:opacity-90 disabled:opacity-50">
                <View className="flex-row items-center">
                  {task.goal_completed ? (
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: INK }}>
                      <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View
                      className="h-7 w-7 rounded-full border-2"
                      style={{
                        borderColor: task.completed_count > 0 ? palette.accent : RING,
                      }}
                    />
                  )}

                  <View className="ml-3 flex-1 pr-2">
                    <Text
                      className="text-[15px] font-semibold leading-5 text-ink"
                      numberOfLines={2}>
                      {task.title}
                    </Text>
                    <Text className="mt-1 text-xs leading-4 text-meta">{statusLabel}</Text>
                    {recordedNote ? (
                      <Text
                        className={`mt-0.5 text-[11px] font-semibold leading-4 ${
                          noteUnverified ? 'text-[#C44B5D]' : 'text-meta'
                        }`}>
                        {noteUnverified
                          ? t('home.applicationNote.unverified', { note: recordedNote })
                          : t('home.applicationNote.recorded', { note: recordedNote })}
                      </Text>
                    ) : null}
                  </View>

                  {task.goal_completed ? null : (
                    <Text className="text-[13px] font-bold" style={{ color: palette.accent }}>
                      {`+${task.points}`}
                    </Text>
                  )}
                </View>

                {task.goal_completed ? null : (
                  <View
                    className="ml-10 mt-3 h-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: TRACK }}>
                    <View
                      style={{
                        width: `${taskProgress}%`,
                        backgroundColor: palette.accent,
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                )}
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}
