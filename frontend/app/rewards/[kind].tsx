import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  claimReward,
  createIdempotencyKey,
  deferTask,
  getDashboard,
  getRewardRedemptions,
  getRewardUnlocks,
  undoDefer,
  updateRewardStatus,
  type GrowthCardStats,
  type RewardRedemption,
  type RewardUnlockState,
  type TaskDeferral,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { formatShortDate } from '@/services/i18n';
import {
  getUnlockRewards,
  type UnlockReward,
  type UnlockRewardKind,
} from '@/services/reward-unlocks';
import { useTheme } from '@/services/theme';

const kindSet = new Set<UnlockRewardKind>(['cheer', 'recovery', 'reflection', 'future', 'growth']);

type ClaimPayload = Record<string, string | number | undefined>;
type OnClaim = (payload: ClaimPayload) => Promise<boolean>;
type OnStatusChange = (status: 'unlocked' | 'skipped') => Promise<boolean>;

function PageHeader({ title }: { title: string }) {
  return (
    <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기"
        className="h-10 w-10 items-center justify-center">
        <Text className="text-3xl text-[#28252D]">‹</Text>
      </Pressable>
      <Text className="text-sm font-bold text-[#28252D]">{title}</Text>
      <View className="h-10 w-10" />
    </View>
  );
}

// 해금 기준은 단위가 다르다(주간/누적/보유). 잠김 문구도 그에 맞춰 안내한다.
function lockedCopy(reward: UnlockReward) {
  const needed = Math.max(reward.threshold - reward.progress, 0);
  if (reward.unit === 'weekly') {
    return `이번 주 ${reward.threshold}점까지 ${reward.progress}점 모았어요. 이번 주 안에 모으면 열려요. 포인트는 사용되지 않아요.`;
  }
  if (reward.unit === 'balance') {
    return `보유 포인트가 ${needed}점 부족해요. 주간 회고를 처음 저장할 때 300점을 사용해요.`;
  }
  return `${needed}점을 더 쌓으면 이 경험을 열 수 있어요. 포인트는 사용되지 않아요.`;
}

function Locked({ reward, onPreview }: { reward: UnlockReward; onPreview?: () => void }) {
  return (
    <View className="mx-5 mt-12 items-center rounded-3xl bg-[#F4F1F7] px-7 py-10">
      <Text className="text-3xl">✦</Text>
      <Text className="mt-4 text-xl font-bold text-[#302D35]">아직 열리지 않았어요</Text>
      <Text className="mt-2 text-center text-sm leading-6 text-[#77717D]">
        {lockedCopy(reward)}
      </Text>
      <Pressable onPress={() => router.back()} className="mt-7 rounded-2xl bg-[#302D35] px-5 py-3">
        <Text className="text-sm font-bold text-white">보관함으로 돌아가기</Text>
      </Pressable>
      {onPreview ? (
        <Pressable
          onPress={onPreview}
          accessibilityRole="button"
          accessibilityLabel="응원 도착 미리 보기"
          className="mt-4 min-h-11 items-center justify-center px-4">
          <Text className="text-sm font-bold text-[#B25E50]">응원 도착 미리 보기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CheerArrivalPreview({
  onClose,
  message = '오늘 한 번 시작했다는 것만으로도 충분해요.',
  detail = '지금 이 한 걸음도 분명 앞으로 가는 중이에요.',
}: {
  onClose: () => void;
  message?: string;
  detail?: string;
}) {
  const { palette } = useTheme();
  const [envelopeScale] = useState(() => new Animated.Value(0.55));
  const [messageOpacity] = useState(() => new Animated.Value(0));
  const [messageOffset] = useState(() => new Animated.Value(20));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(envelopeScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 9,
      }),
      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.timing(messageOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(messageOffset, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [envelopeScale, messageOffset, messageOpacity]);

  return (
    <View className="px-5 pt-10">
      <Text
        className="text-center text-[10px] font-bold tracking-[2px]"
        style={{ color: palette.accent }}>
        A KIND NOTE ARRIVED
      </Text>
      <View className="mt-7 rounded-3xl border bg-white p-6" style={{ borderColor: palette.line }}>
        <Animated.View
          className="h-20 w-20 items-center justify-center self-center"
          style={{
            transform: [{ scale: envelopeScale }],
          }}>
          <Text className="text-[34px]">✉</Text>
        </Animated.View>
        <Text className="text-center text-xl font-bold text-[#362B2C]">
          누군가의 응원이 도착했어요
        </Text>
        <Animated.View
          className="mt-6"
          style={{ opacity: messageOpacity, transform: [{ translateY: messageOffset }] }}>
          <Text
            className="text-[10px] font-bold tracking-[1px]"
            style={{ color: palette.accentDeep }}>
            FROM. 익명의 누군가
          </Text>
          <Text className="mt-4 text-[21px] font-bold leading-8 text-[#3A3030]">{message}</Text>
          <Text className="mt-4 text-sm leading-6 text-[#786F70]">{detail}</Text>
          <View
            className="mt-3 flex-row justify-end gap-3 border-t pt-2"
            style={{ borderColor: palette.line }}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="응원 숨기기"
              className="items-center justify-center rounded-xl px-3 py-1">
              <Text className="text-sm font-semibold text-[#827879]">숨기기</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="응원 신고"
              className="items-center justify-center rounded-xl px-3 py-1">
              <Text className="text-sm font-semibold" style={{ color: palette.accent }}>
                신고
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
      <Text className="mt-7 text-center text-[11px] leading-5 text-[#9C9494]">
        실제 수신 기능에서는 숨긴 메시지를 다시 보여주지 않고, 신고된 메시지는 즉시 검토 대상으로
        이동해요.
      </Text>
    </View>
  );
}

function Cheer({
  onRedeem,
  accent,
  usedRecord,
}: {
  onRedeem: OnClaim;
  accent: string;
  usedRecord: RewardRedemption | null;
}) {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [showArrivalPreview, setShowArrivalPreview] = useState(false);
  const suggestions = [
    '오늘의 작은 시도가 내일을 바꿀 거예요!',
    '지금 이 한 걸음, 정말 멋져요!',
    '끝까지 응원할게요. 파이팅!',
  ];
  if (showArrivalPreview)
    return <CheerArrivalPreview onClose={() => setShowArrivalPreview(false)} />;
  if (sent || usedRecord) {
    const archived =
      typeof usedRecord?.payload.message === 'string' ? usedRecord.payload.message : message.trim();
    return (
      <View className="mx-5 mt-12 items-center rounded-3xl bg-[#FFE8E3] px-7 py-12">
        <Text className="text-4xl">✦</Text>
        <Text className="mt-4 text-xl font-bold text-[#502E2A]">
          {usedRecord && !sent ? '이번 주 응원을 남겼어요.' : '응원을 남겼어요.'}
        </Text>
        {archived ? (
          <View className="mt-4 w-full rounded-2xl bg-white/70 p-4">
            <Text className="text-center text-sm leading-6 text-[#6B4B45]">{archived}</Text>
          </View>
        ) : null}
        <Text className="mt-3 text-center text-sm leading-6 text-[#7D5D58]">
          다음 주에 다시 열려요. 남긴 문장은 보관함의 보상 기록에서 다시 볼 수 있어요.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-7 rounded-2xl px-5 py-3"
          style={{ backgroundColor: accent }}>
          <Text className="font-bold text-white">보관함으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View className="px-5 pt-7">
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#C46A5B]">
        UNLOCKED THIS WEEK
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#2A272C]">
        오늘의 누군가에게{`\n`}응원을 건네요.
      </Text>
      <Text className="mt-3 text-sm leading-6 text-[#79727A]">
        이름도, 답장도 없는 짧은 문장이에요. 부담 없이 지나가도 괜찮도록요.
      </Text>
      <View className="mt-7 rounded-3xl border border-[#F1DCD6] bg-white p-4">
        <View className="flex-row justify-between">
          <Text className="text-xs font-bold text-[#60585C]">응원 문장</Text>
          <Text className="text-xs text-[#9B9295]">{message.length} / 100</Text>
        </View>
        <TextInput
          value={message}
          onChangeText={(value) => setMessage(value.slice(0, 100))}
          multiline
          maxLength={100}
          placeholder="오늘의 작은 시도가 내일을 바꿀 거예요!"
          placeholderTextColor="#B8B0B3"
          className="mt-3 min-h-28 text-base leading-6 text-[#302B2D]"
          textAlignVertical="top"
        />
        <View className="flex-row flex-wrap gap-2 border-t border-[#F2E9E6] pt-3">
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => setMessage(suggestion)}
              className="rounded-full bg-[#FFF0ED] px-3 py-2">
              <Text className="text-[11px] text-[#AD5A4C]">{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View className="mt-4 flex-row rounded-2xl bg-[#FFF0ED] p-4">
        <Text className="mr-3 text-base">✓</Text>
        <Text className="flex-1 text-[11px] leading-5 text-[#845F59]">
          연락처·링크·개인정보는 자동으로 가려지고, 모든 응원은 검토 후 전달돼요.
        </Text>
      </View>
      <Pressable
        onPress={() => setShowArrivalPreview(true)}
        accessibilityRole="button"
        accessibilityLabel="응원 도착 미리 보기"
        className="mt-4 items-center rounded-2xl border border-[#F1DCD6] py-3">
        <Text className="text-sm font-bold text-[#B25E50]">응원 도착 미리 보기</Text>
      </Pressable>
      <Pressable
        disabled={!message.trim()}
        onPress={async () => {
          const ok = await onRedeem({ message: message.trim() });
          if (ok) setSent(true);
        }}
        className="mt-7 flex-row items-center justify-between rounded-2xl px-5 py-4"
        style={{ backgroundColor: message.trim() ? accent : '#EBD9D5' }}>
        <Text className="font-bold text-white">응원 남기기</Text>
        <Text className="text-xl text-white">→</Text>
      </Pressable>
    </View>
  );
}

function RecoveryHeader() {
  return (
    <>
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#6B8520]">
        A GENTLER TOMORROW
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#29301F]">
        오늘 못 한 일을{`\n`}내일로 옮겨요.
      </Text>
      <Text className="mt-3 text-sm leading-6 text-[#707865]">
        이건 미루기가 아니라 회복을 선택하는 방법이에요. 받아 둔 패스 하나로 오늘의 할 일 하나를
        내일로 옮길 수 있어요.
      </Text>
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
      <Text className="text-xs font-bold text-[#667247]">내일로 보낸 할 일</Text>
      {deferrals.map((item) => (
        <View
          key={item.deferral_id}
          className="mt-2 flex-row items-center justify-between rounded-xl bg-white/70 px-3 py-2">
          <Text className="flex-1 text-sm text-[#37451C]" numberOfLines={1}>
            {item.title} → {Number(item.to_date.slice(5, 7))}월 {Number(item.to_date.slice(8))}일
          </Text>
          <Pressable
            onPress={() => onUndo(item.deferral_id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title} 오늘로 되돌리기`}
            className="ml-2 rounded-lg border border-[#9AC13C] px-2.5 py-1.5">
            <Text className="text-[11px] font-bold text-[#4E6B15]">되돌리기</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

type RecoveryTasks = NonNullable<Awaited<ReturnType<typeof getDashboard>>['tasks']>;

function RecoveryPass({
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
            {usedTitle}를 내일로 보냈어요.
          </Text>
          <Text className="mt-2 text-sm leading-6 text-[#667247]">
            오늘의 몫은 여기까지. 내일 스케줄에 다시 나타나요. 오늘 안에는 아래에서 되돌릴 수
            있어요.
          </Text>
        </View>
        <DeferredList deferrals={deferrals} onUndo={onUndo} />
        <Pressable
          onPress={() => router.back()}
          className="mt-6 rounded-2xl px-5 py-4"
          style={{ backgroundColor: accent }}>
          <Text className="text-center font-bold text-white">보관함으로 돌아가기</Text>
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
            <Text className="text-lg font-bold text-[#37401F]">다음 패스를 기다리는 중</Text>
            <Text className="mt-2 text-sm leading-6 text-[#6E7563]">
              이번 누적 구간의 패스는 썼어요. 누적 {nextPassAt}점이 되면 새 패스가 열려요. (현재{' '}
              {progress}점)
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
          <Text className="text-lg font-bold text-[#37451C]">회복 패스 보상</Text>
          <Text className="mt-2 text-sm leading-6 text-[#667247]">
            누적 200점마다 하나씩 받을 수 있어요. 포인트는 사용되지 않고, 최대 1개까지 보관할 수
            있어요.
          </Text>
        </View>
        <Pressable
          onPress={async () => {
            await onClaim({});
          }}
          className="mt-6 flex-row items-center justify-between rounded-2xl px-5 py-4"
          style={{ backgroundColor: accent }}>
          <Text className="font-bold text-white">보상 받기</Text>
          <Text className="text-xl text-white">→</Text>
        </Pressable>
        <Text className="mt-3 text-center text-[10px] text-[#878D7D]">
          받으면 바로 아래에서 할 일을 내일로 옮길 수 있어요.
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
          <Text className="text-lg font-bold text-[#37451C]">회복 패스 보유 중</Text>
          <View className="rounded-full bg-white/70 px-2.5 py-1">
            <Text className="text-[10px] font-bold text-[#667247]">
              {deferred ? '나중에 하기로 함' : '새 보상'}
            </Text>
          </View>
        </View>
        <Text className="mt-2 text-sm leading-6 text-[#667247]">
          {deferred
            ? '나중에 쓰기로 했어요. 회복 패스는 보관함에 그대로 남아 있어요.'
            : '받아 둔 회복 패스예요. 할 일 하나를 내일로 옮기는 데 써요.'}
        </Text>
        <Text className="mt-3 text-[10px] text-[#7A8B5B]">
          해금일 {formatShortDate(new Date(record.unlocked_at))}
        </Text>
      </View>

      {deferred ? null : (
        <View className="mt-6">
          <Text className="text-xs font-bold text-[#667247]">무엇을 내일로 보낼까요?</Text>
          <Text className="mt-0.5 text-[11px] text-[#878D7D]">
            패스 하나로 할 일 하나를 옮겨요. 완료한 기록은 그대로 남고, 내일 스케줄에 다시 나타나요.
          </Text>
          {tasksLoading ? (
            <Text className="mt-3 rounded-2xl bg-[#EFF1E9] px-4 py-3 text-center text-sm text-[#6E7563]">
              오늘의 할 일을 불러오는 중이에요…
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
                accessibilityLabel={`${task.title} 내일로 보내기`}
                className="mt-2 flex-row items-center justify-between rounded-2xl border border-[#9AC13C] bg-white px-4 py-3">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-bold text-[#37451C]" numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text className="text-[10px] text-[#878D7D]">
                    {task.completed_count}/{task.target_count} 완료 · 내일로 보내기
                  </Text>
                </View>
                <Text className="text-lg text-[#4E6B15]">→</Text>
              </Pressable>
            ))
          ) : (
            <Text className="mt-3 rounded-2xl bg-[#EFF1E9] px-4 py-3 text-center text-sm text-[#6E7563]">
              오늘 남은 할 일이 없어요.
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
          {deferred ? '다시 보상으로 돌려놓기' : '나중에 사용할게요'}
        </Text>
        <Text className="text-xl text-[#4E6B15]">{deferred ? '↺' : '↓'}</Text>
      </Pressable>
      <DeferredList deferrals={deferrals} onUndo={onUndo} />
    </View>
  );
}

function Reflection({
  totalPoints,
  tasks,
  accent,
}: {
  totalPoints: number;
  tasks: Awaited<ReturnType<typeof getDashboard>>['tasks'];
  accent: string;
}) {
  return (
    <View className="px-5 pt-7">
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#7660CC]">
        WEEKLY REVIEW · UNLOCKED
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#2C2936]">
        이번 주, 당신이{`\n`}해낸 것들.
      </Text>
      <Text className="mt-3 text-sm text-[#77717E]">
        한 주의 포인트·집중·완료 기록을 모아보고, 한 줄 회고를 남겨요.
      </Text>
      <View className="mt-7 flex-row gap-2">
        <View className="flex-1 rounded-2xl bg-[#EFEAFF] p-4">
          <Text className="text-2xl font-bold text-[#493D7B]">{totalPoints}</Text>
          <Text className="mt-1 text-[11px] text-[#736A91]">누적 포인트</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-[#E9F2FF] p-4">
          <Text className="text-2xl font-bold text-[#3E6293]">
            {tasks.filter((task) => task.goal_completed).length}
          </Text>
          <Text className="mt-1 text-[11px] text-[#6B7E96]">완료한 목표</Text>
        </View>
      </View>
      <Pressable
        onPress={() => router.push('/weekly-retro')}
        className="mt-8 flex-row items-center justify-between rounded-2xl px-5 py-4"
        style={{ backgroundColor: accent }}>
        <Text className="font-bold text-white">주간 회고 열기</Text>
        <Text className="text-xl text-white">→</Text>
      </Pressable>
      <Text className="mt-3 text-center text-[10px] text-[#878D7D]">
        이번 주 회고를 처음 저장할 때 300점을 사용해요. 열람은 자유예요.
      </Text>
    </View>
  );
}

function FutureLetter({
  accent,
  letters,
  onRedeem,
}: {
  accent: string;
  letters: RewardRedemption[];
  onRedeem: OnClaim;
}) {
  const [letter, setLetter] = useState('');
  const [saved, setSaved] = useState(false);
  return (
    <View className="px-5 pt-7">
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#7A98C9]">
        PRIVATE LETTER · UNLOCKED
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#2B2A31]">
        미래의 나에게{`\n`}먼저 말을 걸어요.
      </Text>
      <Text className="mt-3 text-sm leading-6 text-[#77717C]">
        해금하면 상시 쓸 수 있어요. 남긴 편지는 아래 보관함에서 언제든 다시 읽어요.
      </Text>
      {saved ? (
        <View className="mt-7 items-center rounded-3xl bg-[#FFF2D9] px-6 py-10">
          <Text className="text-4xl">♡</Text>
          <Text className="mt-4 text-xl font-bold text-[#5D482D]">미래의 나에게 남겼어요.</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-[#806B51]">
            지친 날, 면접 전, 기다림이 길어진 날에 조용히 다시 보여드릴게요.
          </Text>
          <Pressable
            onPress={() => {
              setLetter('');
              setSaved(false);
            }}
            className="mt-6 rounded-2xl border border-[#D5DDEA] bg-white px-5 py-3">
            <Text className="font-bold text-[#3B4B6B]">한 번 더 남기기</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            className="mt-3 rounded-2xl px-5 py-3"
            style={{ backgroundColor: accent }}>
            <Text className="font-bold text-white">보관함으로 돌아가기</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="mt-7 min-h-52 rounded-sm border border-[#E3D3B4] bg-[#FFFDF5] p-5 shadow-sm">
            <Text className="border-b border-dashed border-[#DAC7A2] pb-3 text-[10px] tracking-[1px] text-[#987C51]">
              TO. 미래의 나
            </Text>
            <TextInput
              value={letter}
              onChangeText={setLetter}
              multiline
              placeholder="오늘 한 번 시작한 것만으로 충분해. 다시 천천히 해보자."
              placeholderTextColor="#C2B49B"
              className="mt-4 min-h-28 text-base leading-7 text-[#4B3D2D]"
              textAlignVertical="top"
            />
            <Text className="text-right text-[10px] text-[#9C8A6E]"># 지친 날</Text>
          </View>
          <Pressable
            disabled={!letter.trim()}
            onPress={async () => {
              const ok = await onRedeem({ letter: letter.trim() });
              if (ok) setSaved(true);
            }}
            className="mt-7 flex-row items-center justify-between rounded-2xl px-5 py-4"
            style={{ backgroundColor: letter.trim() ? accent : '#D5DDEA' }}>
            <Text className="font-bold text-white">미래의 나에게 남기기</Text>
            <Text className="text-xl text-white">→</Text>
          </Pressable>
        </>
      )}
      {letters.length ? (
        <View className="mt-8">
          <Text className="text-[10px] font-bold tracking-[1.5px] text-[#987C51]">
            SAVED LETTERS
          </Text>
          <Text className="mb-3 mt-1 text-lg font-bold text-[#2B2A31]">
            남긴 편지 {letters.length}개
          </Text>
          {letters.map((item) => (
            <View
              key={item.id}
              className="mb-2 rounded-2xl border border-[#E3D3B4] bg-[#FFFDF5] p-4">
              <Text className="text-[10px] tracking-[1px] text-[#987C51]">
                {formatShortDate(new Date(item.redeemed_at ?? item.unlocked_at))} · TO. 미래의 나
              </Text>
              <Text className="mt-2 text-sm leading-6 text-[#4B3D2D]" numberOfLines={4}>
                {typeof item.payload.letter === 'string' ? item.payload.letter : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function monthLabel(month: string) {
  const [year, mon] = month.split('-');
  return `${year}년 ${Number(mon)}월`;
}

function focusLabel(minutes: number) {
  if (minutes <= 0) return '0분';
  return minutes >= 60 ? `${Number((minutes / 60).toFixed(1))}시간` : `${minutes}분`;
}

function GrowthCardBody({ stats }: { stats: GrowthCardStats }) {
  return (
    <View className="mt-6 rounded-3xl bg-[#263B64] p-6">
      <Text className="text-xs text-[#C4D0EA]">{monthLabel(stats.month)}의 기록</Text>
      <Text className="mt-6 text-2xl font-bold leading-8 text-[#FFF9E8]">
        집중 {focusLabel(stats.focus_minutes)}
      </Text>
      <View className="mt-6 flex-row border-t border-[#FFFFFF33] pt-4">
        <View className="flex-1">
          <Text className="text-lg font-bold text-[#FFF9E8]">{stats.applications}</Text>
          <Text className="text-[10px] text-[#BFCBE0]">실제 지원</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-[#FFF9E8]">{stats.goal_days}</Text>
          <Text className="text-[10px] text-[#BFCBE0]">전체 목표 달성</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-[#FFF9E8]">{stats.activity_days}</Text>
          <Text className="text-[10px] text-[#BFCBE0]">활동한 날</Text>
        </View>
      </View>
      <Text className="mt-4 text-[11px] text-[#BFCBE0]">이번 달 {stats.points}점 쌓음</Text>
    </View>
  );
}

function savedCardStats(record: RewardRedemption | null): GrowthCardStats | null {
  const stats = record?.payload.stats;
  return stats && typeof stats === 'object' && !Array.isArray(stats) ? stats : null;
}

function GrowthCard({
  accent,
  state,
  cards,
  onRedeem,
}: {
  accent: string;
  state: RewardUnlockState;
  cards: RewardRedemption[];
  onRedeem: OnClaim;
}) {
  const [saved, setSaved] = useState(false);
  const usedRecord = state.reason === 'used' ? state.record : null;
  const displayStats = savedCardStats(usedRecord) ?? state.stats;
  const pastCards = cards.filter((card) => card.id !== usedRecord?.id);
  if (!displayStats) return null;

  return (
    <View className="px-5 pt-7">
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#9B761E]">
        GROWTH ARCHIVE · UNLOCKED
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#2E2A31]">
        작은 기록을{`\n`}오래 남겨요.
      </Text>
      {saved ? (
        <View className="mt-5 rounded-2xl bg-[#E8EFFF] px-4 py-3">
          <Text className="text-xs font-bold text-[#263B64]">
            {monthLabel(displayStats.month)} 성장 카드를 보관함에 저장했어요.
          </Text>
        </View>
      ) : null}
      <GrowthCardBody stats={displayStats} />
      {usedRecord ? (
        <>
          <View className="mt-2 self-start rounded-full bg-[#E8EFFF] px-2.5 py-1">
            <Text className="text-[10px] font-bold text-[#263B64]">이번 달 카드 · 저장됨</Text>
          </View>
          <Text className="mt-3 text-center text-[11px] text-[#878D7D]">
            이번 달 카드는 저장했어요. 다음 달에 다시 만들 수 있어요.
          </Text>
        </>
      ) : (
        <Pressable
          onPress={async () => {
            const ok = await onRedeem({});
            if (ok) setSaved(true);
          }}
          className="mt-5 flex-row items-center justify-between rounded-2xl border px-5 py-4"
          style={{ borderColor: accent }}>
          <Text className="font-bold" style={{ color: accent }}>
            카드 저장하기
          </Text>
          <Text className="text-xl" style={{ color: accent }}>
            ↓
          </Text>
        </Pressable>
      )}
      {pastCards.length ? (
        <View className="mt-8">
          <Text className="text-[10px] font-bold tracking-[1.5px] text-[#9B761E]">PAST CARDS</Text>
          <Text className="mb-3 mt-1 text-lg font-bold text-[#2E2A31]">
            지난 성장 카드 {pastCards.length}장
          </Text>
          {pastCards.map((card) => {
            const stats = savedCardStats(card);
            if (!stats) return null;
            return (
              <View key={card.id} className="mb-2 rounded-2xl bg-[#31456E] p-4">
                <Text className="text-[11px] text-[#C4D0EA]">{monthLabel(stats.month)}</Text>
                <Text className="mt-1 text-sm font-bold text-[#FFF9E8]">
                  집중 {focusLabel(stats.focus_minutes)} · 지원 {stats.applications}건 · 목표{' '}
                  {stats.goal_days}일
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function RewardDetailScreen() {
  const { kind: requestedKind, preview } = useLocalSearchParams<{
    kind: string;
    preview?: string;
  }>();
  const kind: UnlockRewardKind = kindSet.has(requestedKind as UnlockRewardKind)
    ? (requestedKind as UnlockRewardKind)
    : 'cheer';
  const [token, setToken] = useState<string | null | undefined>();
  const { palette, colors } = useTheme();
  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(token!),
    enabled: Boolean(token),
  });
  const unlocks = useQuery({
    queryKey: ['reward-unlocks'],
    queryFn: () => getRewardUnlocks(token!),
    enabled: Boolean(token),
  });
  const redemptions = useQuery({
    queryKey: ['redemptions'],
    queryFn: () => getRewardRedemptions(token!),
    enabled: Boolean(token),
  });
  const queryClient = useQueryClient();
  const [showArrivalPreview, setShowArrivalPreview] = useState(Boolean(preview));
  const [claimError, setClaimError] = useState<string | null>(null);
  const totalPoints = dashboard.data?.total_points ?? 0;
  const state = unlocks.data?.unlocks.find((item) => item.kind === kind);
  const futureLetters = (redemptions.data ?? []).filter(
    (record) => record.reward_kind === 'future'
  );
  const growthCards = (redemptions.data ?? []).filter((record) => record.reward_kind === 'growth');

  const invalidateRewards = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['redemptions'] });
    queryClient.invalidateQueries({ queryKey: ['reward-unlocks'] });
    queryClient.invalidateQueries({ queryKey: ['history'] });
    queryClient.invalidateQueries({ queryKey: ['history-calendar'] });
  };
  // 웹에서는 Alert가 무음이므로 화면 상단 배너로 오류를 보여준다.
  const redeem = useMutation({
    mutationFn: (payload: ClaimPayload) =>
      claimReward(token!, kind, createIdempotencyKey(), payload),
    onSuccess: () => {
      setClaimError(null);
      invalidateRewards();
    },
    onError: (error: Error) => setClaimError(error.message),
  });
  const changeStatus = useMutation({
    mutationFn: (input: { id: string; status: 'unlocked' | 'skipped' }) =>
      updateRewardStatus(token!, input.id, input.status),
    onSuccess: () => {
      setClaimError(null);
      invalidateRewards();
    },
    onError: (error: Error) => setClaimError(error.message),
  });
  const onClaim: OnClaim = async (payload) => {
    try {
      await redeem.mutateAsync(payload);
      return true;
    } catch {
      return false;
    }
  };
  const onStatusChange: OnStatusChange = async (status) => {
    if (!state?.record) return false;
    try {
      await changeStatus.mutateAsync({ id: state.record.id, status });
      return true;
    } catch {
      return false;
    }
  };
  // 회복 패스 사용 = 할 일 하나를 내일로 이월. 되돌리기는 패스도 되돌려 준다.
  const defer = useMutation({
    mutationFn: (taskTemplateId: string) =>
      deferTask(token!, taskTemplateId, createIdempotencyKey()),
    onSuccess: () => {
      setClaimError(null);
      invalidateRewards();
    },
    onError: (error: Error) => setClaimError(error.message),
  });
  const undo = useMutation({
    mutationFn: (deferralId: string) => undoDefer(token!, deferralId),
    onSuccess: () => {
      setClaimError(null);
      invalidateRewards();
    },
    onError: (error: Error) => setClaimError(error.message),
  });
  const onDefer = async (taskTemplateId: string) => {
    try {
      await defer.mutateAsync(taskTemplateId);
      return true;
    } catch {
      return false;
    }
  };
  const onUndo = async (deferralId: string) => {
    try {
      await undo.mutateAsync(deferralId);
      return true;
    } catch {
      return false;
    }
  };

  const reward = useMemo(
    () =>
      getUnlockRewards(
        totalPoints,
        unlocks.data?.weekly_points ?? 0,
        colors.button,
        unlocks.data?.unlocks
      ).find((item) => item.kind === kind)!,
    [kind, totalPoints, unlocks.data, colors.button]
  );

  let content: ReactNode = (
    <Locked
      reward={reward}
      onPreview={kind === 'cheer' ? () => setShowArrivalPreview(true) : undefined}
    />
  );
  if (showArrivalPreview) {
    const savedCheer = preview === 'saved-cheer';
    content = (
      <CheerArrivalPreview
        onClose={() => setShowArrivalPreview(false)}
        message={savedCheer ? '작게 쌓은 하루도 분명 당신의 편이에요.' : undefined}
        detail={savedCheer ? '어제의 작은 시도를 잊지 않았으면 좋겠어요.' : undefined}
      />
    );
  } else if (reward.unlocked) {
    if (kind === 'cheer')
      content = (
        <Cheer
          onRedeem={onClaim}
          accent={reward.color}
          usedRecord={state?.reason === 'used' ? state.record : null}
        />
      );
    if (kind === 'recovery')
      content = state ? (
        <RecoveryPass
          record={state.record}
          available={state.available}
          progress={state.progress}
          tasks={dashboard.data?.tasks ?? []}
          tasksLoading={dashboard.isLoading}
          deferrals={dashboard.data?.deferrals ?? []}
          onClaim={onClaim}
          onStatusChange={onStatusChange}
          onDefer={onDefer}
          onUndo={onUndo}
          accent={reward.color}
        />
      ) : unlocks.isError ? (
        <LoadFailed />
      ) : null;
    if (kind === 'reflection')
      content = (
        <Reflection
          totalPoints={totalPoints}
          tasks={dashboard.data?.tasks ?? []}
          accent={reward.color}
        />
      );
    if (kind === 'future')
      content = <FutureLetter accent={reward.color} letters={futureLetters} onRedeem={onClaim} />;
    if (kind === 'growth')
      content = state ? (
        <GrowthCard accent={reward.color} state={state} cards={growthCards} onRedeem={onClaim} />
      ) : unlocks.isError ? (
        <LoadFailed />
      ) : null;
  }
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <PageHeader title={reward.shortTitle} />
      <ScrollView contentContainerClassName="pb-10">
        {claimError ? (
          <View className="mx-5 mt-2 rounded-xl bg-[#FFE8E3] px-4 py-3">
            <Text className="text-xs font-semibold leading-5 text-[#8A3D2F]">{claimError}</Text>
          </View>
        ) : null}
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadFailed() {
  return (
    <Text className="mx-5 mt-12 text-center text-sm leading-6 text-[#77717D]">
      해금 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
    </Text>
  );
}
