import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { getDashboard, type RewardRedemption, type TaskDeferral } from '@/services/api';
import { formatShortDate, t } from '@/services/i18n';
import type { OnClaim, OnStatusChange } from './shared';

function RecoveryHeader() {
  return (
    <>
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#6B8520]">
        A GENTLER TOMORROW
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#29301F]">
        {t('rewards.recovery.headline')}
      </Text>
      <Text className="mt-3 text-sm leading-6 text-[#707865]">{t('rewards.recovery.body')}</Text>
    </>
  );
}

// 이월된 할 일 목록. 오늘 안에는 되돌릴 수 있다(회복 패스도 함께 돌아온다).
function DeferredList({
  deferrals,
  onUndo,
}: {
  deferrals: TaskDeferral[];
  onUndo: (deferralId: string) => Promise<boolean>;
}) {
  if (!deferrals.length) return null;
  return (
    <View className="mt-6 rounded-2xl bg-[#EFF3E6] p-4">
      <Text className="text-xs font-bold text-[#667247]">
        {t('rewards.recovery.deferredTitle')}
      </Text>
      {deferrals.map((item) => (
        <View
          key={item.deferral_id}
          className="mt-2 flex-row items-center justify-between rounded-xl bg-white/70 px-3 py-2">
          <Text className="flex-1 text-sm text-[#37451C]" numberOfLines={1}>
            {t('rewards.recovery.deferredItem', {
              title: item.title,
              month: Number(item.to_date.slice(5, 7)),
              day: Number(item.to_date.slice(8)),
            })}
          </Text>
          <Pressable
            onPress={() => onUndo(item.deferral_id)}
            accessibilityRole="button"
            accessibilityLabel={t('rewards.recovery.undoAccessibility', { title: item.title })}
            className="ml-2 rounded-lg border border-[#9AC13C] px-2.5 py-1.5">
            <Text className="text-[11px] font-bold text-[#4E6B15]">
              {t('rewards.recovery.undo')}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export type RecoveryTasks = NonNullable<Awaited<ReturnType<typeof getDashboard>>['tasks']>;

export function RecoveryPass({
  record,
  available,
  progress,
  tasks,
  tasksLoading,
  deferrals,
  onClaim,
  onStatusChange,
  onDefer,
  onUndo,
  accent,
}: {
  record: RewardRedemption | null;
  available: boolean;
  progress: number;
  tasks: RecoveryTasks;
  tasksLoading: boolean;
  deferrals: TaskDeferral[];
  onClaim: OnClaim;
  onStatusChange: OnStatusChange;
  onDefer: (taskTemplateId: string) => Promise<boolean>;
  onUndo: (deferralId: string) => Promise<boolean>;
  accent: string;
}) {
  const [usedTitle, setUsedTitle] = useState<string | null>(null);
  const candidates = tasks.filter((task) => !task.goal_completed && task.remaining_count > 0);
  const nextPassAt = (Math.floor(progress / 200) + 1) * 200;

  if (usedTitle) {
    return (
      <View className="px-5 pt-7">
        <RecoveryHeader />
        <View className="mt-7 rounded-3xl bg-[#E9F9BC] p-6">
          <Text className="text-2xl">🌿</Text>
          <Text className="mt-3 text-xl font-bold text-[#37451C]">
            {t('rewards.recovery.sentTitle', { title: usedTitle })}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-[#667247]">
            {t('rewards.recovery.sentBody')}
          </Text>
        </View>
        <DeferredList deferrals={deferrals} onUndo={onUndo} />
        <Pressable
          onPress={() => router.back()}
          className="mt-6 rounded-2xl px-5 py-4"
          style={{ backgroundColor: accent }}>
          <Text className="text-center font-bold text-white">{t('rewards.backToBox')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!record) {
    if (!available) {
      return (
        <View className="px-5 pt-7">
          <RecoveryHeader />
          <View className="mt-7 rounded-3xl bg-[#EFF1E9] p-5">
            <Text className="text-lg font-bold text-[#37401F]">
              {t('rewards.recovery.waitingTitle')}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-[#6E7563]">
              {t('rewards.recovery.waitingBody', { next: nextPassAt, progress })}
            </Text>
          </View>
          <DeferredList deferrals={deferrals} onUndo={onUndo} />
        </View>
      );
    }
    return (
      <View className="px-5 pt-7">
        <RecoveryHeader />
        <View className="mt-7 rounded-3xl bg-[#E9F9BC] p-5">
          <Text className="text-lg font-bold text-[#37451C]">
            {t('rewards.recovery.claimTitle')}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-[#667247]">
            {t('rewards.recovery.claimBody')}
          </Text>
        </View>
        <Pressable
          onPress={async () => {
            await onClaim({});
          }}
          className="mt-6 flex-row items-center justify-between rounded-2xl px-5 py-4"
          style={{ backgroundColor: accent }}>
          <Text className="font-bold text-white">{t('rewards.status.claimReward')}</Text>
          <Text className="text-xl text-white">→</Text>
        </Pressable>
        <Text className="mt-3 text-center text-[10px] text-[#878D7D]">
          {t('rewards.recovery.claimHint')}
        </Text>
        <DeferredList deferrals={deferrals} onUndo={onUndo} />
      </View>
    );
  }

  const deferred = record.status === 'skipped';
  return (
    <View className="px-5 pt-7">
      <RecoveryHeader />
      <View className="mt-7 rounded-3xl bg-[#E9F9BC] p-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-[#37451C]">
            {t('rewards.recovery.heldTitle')}
          </Text>
          <View className="rounded-full bg-white/70 px-2.5 py-1">
            <Text className="text-[10px] font-bold text-[#667247]">
              {deferred ? t('rewards.recovery.deferredBadge') : t('rewards.recovery.newReward')}
            </Text>
          </View>
        </View>
        <Text className="mt-2 text-sm leading-6 text-[#667247]">
          {deferred ? t('rewards.recovery.heldDeferred') : t('rewards.recovery.heldReady')}
        </Text>
        <Text className="mt-3 text-[10px] text-[#7A8B5B]">
          {t('rewards.recovery.unlockedOn', {
            date: formatShortDate(new Date(record.unlocked_at)),
          })}
        </Text>
      </View>

      {deferred ? null : (
        <View className="mt-6">
          <Text className="text-xs font-bold text-[#667247]">
            {t('rewards.recovery.pickTitle')}
          </Text>
          <Text className="mt-0.5 text-[11px] text-[#878D7D]">
            {t('rewards.recovery.pickBody')}
          </Text>
          {tasksLoading ? (
            <Text className="mt-3 rounded-2xl bg-[#EFF1E9] px-4 py-3 text-center text-sm text-[#6E7563]">
              {t('rewards.recovery.loading')}
            </Text>
          ) : candidates.length ? (
            candidates.map((task) => (
              <Pressable
                key={task.id}
                onPress={async () => {
                  const ok = await onDefer(task.id);
                  if (ok) setUsedTitle(task.title);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('rewards.recovery.sendAccessibility', {
                  title: task.title,
                })}
                className="mt-2 flex-row items-center justify-between rounded-2xl border border-[#9AC13C] bg-white px-4 py-3">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-bold text-[#37451C]" numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text className="text-[10px] text-[#878D7D]">
                    {t('rewards.recovery.taskProgress', {
                      completed: task.completed_count,
                      target: task.target_count,
                    })}
                  </Text>
                </View>
                <Text className="text-lg text-[#4E6B15]">→</Text>
              </Pressable>
            ))
          ) : (
            <Text className="mt-3 rounded-2xl bg-[#EFF1E9] px-4 py-3 text-center text-sm text-[#6E7563]">
              {t('rewards.recovery.noTasks')}
            </Text>
          )}
        </View>
      )}

      <Pressable
        onPress={async () => {
          await onStatusChange(deferred ? 'unlocked' : 'skipped');
        }}
        className="mt-6 flex-row items-center justify-between rounded-2xl border border-[#9AC13C] bg-white px-5 py-4">
        <Text className="font-bold text-[#4E6B15]">
          {deferred ? t('rewards.recovery.restore') : t('rewards.recovery.later')}
        </Text>
        <Text className="text-xl text-[#4E6B15]">{deferred ? '↺' : '↓'}</Text>
      </Pressable>
      <DeferredList deferrals={deferrals} onUndo={onUndo} />
    </View>
  );
}
