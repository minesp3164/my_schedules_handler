import { useEffect, useMemo, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createIdempotencyKey, getDashboard, redeemReward } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { getUnlockRewards, type UnlockRewardKind } from '@/services/reward-unlocks';
import { useTheme } from '@/services/theme';

const kindSet = new Set<UnlockRewardKind>(['cheer', 'recovery', 'reflection', 'future', 'growth']);

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

function Locked({ needed, onPreview }: { needed: number; onPreview?: () => void }) {
  return (
    <View className="mx-5 mt-12 items-center rounded-3xl bg-[#F4F1F7] px-7 py-10">
      <Text className="text-3xl">✦</Text>
      <Text className="mt-4 text-xl font-bold text-[#302D35]">아직 열리지 않았어요</Text>
      <Text className="mt-2 text-center text-sm leading-6 text-[#77717D]">
        {needed}점을 더 쌓으면 이 경험을 열 수 있어요. 포인트는 사용되지 않아요.
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

function Cheer({ onRedeem }: { onRedeem: () => Promise<unknown> }) {
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
  if (sent)
    return (
      <View className="mx-5 mt-12 items-center rounded-3xl bg-[#FFE8E3] px-7 py-12">
        <Text className="text-4xl">✦</Text>
        <Text className="mt-4 text-xl font-bold text-[#502E2A]">응원을 남겼어요.</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-[#7D5D58]">
          검토를 거쳐 누군가의 하루에 조용히 도착할 거예요.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-7 rounded-2xl bg-[#E85E4A] px-5 py-3">
          <Text className="font-bold text-white">보관함으로 돌아가기</Text>
        </Pressable>
      </View>
    );
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
          await onRedeem();
          setSent(true);
        }}
        className={`mt-7 flex-row items-center justify-between rounded-2xl px-5 py-4 ${message.trim() ? 'bg-[#E85E4A]' : 'bg-[#EBD9D5]'}`}>
        <Text className="font-bold text-white">응원 남기기</Text>
        <Text className="text-xl text-white">→</Text>
      </Pressable>
    </View>
  );
}

function Recovery({
  tasks,
  onRedeem,
}: {
  tasks: Awaited<ReturnType<typeof getDashboard>>['tasks'];
  onRedeem: () => Promise<unknown>;
}) {
  const movable = tasks.filter((task) => task.kind !== 'application');
  const [selectedId, setSelectedId] = useState(movable[0]?.id);
  const [used, setUsed] = useState(false);
  if (used)
    return (
      <View className="mx-5 mt-12 items-center rounded-3xl bg-[#E9F9BC] px-7 py-12">
        <Text className="text-4xl">⌁</Text>
        <Text className="mt-4 text-xl font-bold text-[#37451C]">회복을 선택했어요.</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-[#667247]">
          선택한 일은 내일의 첫 행동으로 보관할게요. 오늘은 실패나 벌점으로 남지 않아요.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-7 rounded-2xl bg-[#334221] px-5 py-3">
          <Text className="font-bold text-[#F4FFD5]">보관함으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  return (
    <View className="px-5 pt-7">
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#6B8520]">
        A GENTLER TOMORROW
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#29301F]">
        오늘 못 한 일을{`\n`}내일로 옮겨요.
      </Text>
      <Text className="mt-3 text-sm leading-6 text-[#707865]">
        이건 미루기가 아니라 회복을 선택하는 방법이에요. 오늘의 전체 목표에서는 빼고, 내일의 루틴에
        남겨둘게요.
      </Text>
      <Text className="mt-8 text-xs font-bold text-[#626958]">오늘 어떤 일을 옮길까요?</Text>
      <View className="mt-3 gap-2">
        {tasks.map((task) => {
          const disabled = task.kind === 'application';
          const selected = task.id === selectedId;
          return (
            <Pressable
              key={task.id}
              disabled={disabled}
              onPress={() => setSelectedId(task.id)}
              className={`flex-row items-center rounded-2xl border bg-white p-4 ${selected ? 'border-2 border-[#9AC13C]' : 'border-[#E2E7D8]'} ${disabled ? 'opacity-45' : ''}`}>
              <Text
                className={`mr-3 h-6 w-6 rounded-full text-center leading-6 ${selected ? 'bg-[#B9E54E] text-[#324315]' : 'bg-[#EEF0E8] text-[#7F8577]'}`}>
                {disabled ? '×' : selected ? '✓' : ''}
              </Text>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#33382E]">{task.title}</Text>
                <Text className="mt-1 text-[11px] text-[#7E8377]">
                  {disabled ? '마감이 있는 할 일은 옮길 수 없어요.' : '내일의 첫 행동으로 보관'}
                </Text>
              </View>
              <Text className="text-xs font-bold text-[#667642]">+{task.points}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        disabled={!selectedId}
        onPress={async () => {
          await onRedeem();
          setUsed(true);
        }}
        className={`mt-7 flex-row items-center justify-between rounded-2xl px-5 py-4 ${selectedId ? 'bg-[#334221]' : 'bg-[#D8DDCE]'}`}>
        <Text className="font-bold text-[#F4FFD5]">회복 패스 사용하기</Text>
        <Text className="text-xl text-[#F4FFD5]">→</Text>
      </Pressable>
      <Text className="mt-3 text-center text-[10px] text-[#878D7D]">
        오늘은 ‘회복 선택’으로 기록돼요.
      </Text>
    </View>
  );
}

function Reflection({
  totalPoints,
  tasks,
  onRedeem,
}: {
  totalPoints: number;
  tasks: Awaited<ReturnType<typeof getDashboard>>['tasks'];
  onRedeem: () => Promise<unknown>;
}) {
  const [saved, setSaved] = useState(false);
  const [win, setWin] = useState('');
  const [start, setStart] = useState('');
  const canSave = Boolean(win.trim() && start.trim());
  if (saved)
    return (
      <View className="mx-5 mt-12 items-center rounded-3xl bg-[#ECE8FF] px-7 py-12">
        <Text className="text-4xl">◔</Text>
        <Text className="mt-4 text-xl font-bold text-[#393259]">이번 주를 기록했어요.</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-[#6C6388]">
          비교 대신 당신이 실제로 쌓은 행동을 남겨뒀어요.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-7 rounded-2xl bg-[#7057D5] px-5 py-3">
          <Text className="font-bold text-white">보관함으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  return (
    <View className="px-5 pt-7">
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#7660CC]">
        WEEKLY REVIEW · UNLOCKED
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#2C2936]">
        이번 주, 당신이{`\n`}해낸 것들.
      </Text>
      <Text className="mt-3 text-sm text-[#77717E]">점수가 아닌 실제 행동을 먼저 모아봤어요.</Text>
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
      <View className="mt-6 gap-4">
        <View>
          <Text className="text-sm font-bold text-[#34303B]">이번 주 가장 잘한 한 가지는?</Text>
          <TextInput
            value={win}
            onChangeText={setWin}
            placeholder="작아도 좋아요. 기억하고 싶은 장면을 적어보세요."
            placeholderTextColor="#A19BA7"
            multiline
            className="mt-2 min-h-20 rounded-2xl bg-[#F4F1FF] p-4 text-sm text-[#3D3655]"
            textAlignVertical="top"
          />
        </View>
        <View>
          <Text className="text-sm font-bold text-[#34303B]">다음 주 가볍게 시작할 일은?</Text>
          <TextInput
            value={start}
            onChangeText={setStart}
            placeholder="월요일의 첫 5분을 정해두면 충분해요."
            placeholderTextColor="#A19BA7"
            multiline
            className="mt-2 min-h-20 rounded-2xl bg-[#FFF5DC] p-4 text-sm text-[#5A4C28]"
            textAlignVertical="top"
          />
        </View>
      </View>
      <Pressable
        disabled={!canSave}
        onPress={async () => {
          await onRedeem();
          setSaved(true);
        }}
        className={`mt-7 flex-row items-center justify-between rounded-2xl px-5 py-4 ${canSave ? 'bg-[#7057D5]' : 'bg-[#D9D2EF]'}`}>
        <Text className="font-bold text-white">이번 주를 기록할게요</Text>
        <Text className="text-xl text-white">→</Text>
      </Pressable>
    </View>
  );
}

function Future({
  growth,
  totalPoints,
  tasks,
  onRedeem,
}: {
  growth: boolean;
  totalPoints: number;
  tasks: Awaited<ReturnType<typeof getDashboard>>['tasks'];
  onRedeem: () => Promise<unknown>;
}) {
  const [letter, setLetter] = useState('');
  const [saved, setSaved] = useState(false);
  if (growth)
    return (
      <View className="px-5 pt-8">
        <Text className="text-[10px] font-bold tracking-[1.5px] text-[#9B761E]">
          GROWTH ARCHIVE · UNLOCKED
        </Text>
        <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#2E2A31]">
          작은 기록을{`\n`}오래 남겨요.
        </Text>
        <View className="mt-8 rounded-3xl bg-[#263B64] p-6">
          <Text className="text-xs text-[#C4D0EA]">2026년 9월의 기록</Text>
          <Text className="mt-7 text-2xl font-bold leading-8 text-[#FFF9E8]">
            작은 기록을{`\n`}계속 쌓아 온 한 달
          </Text>
          <View className="mt-7 flex-row border-t border-[#FFFFFF33] pt-4">
            <View className="flex-1">
              <Text className="text-lg font-bold text-[#FFF9E8]">{totalPoints}</Text>
              <Text className="text-[10px] text-[#BFCBE0]">누적 포인트</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-[#FFF9E8]">
                {tasks.filter((task) => task.goal_completed).length}
              </Text>
              <Text className="text-[10px] text-[#BFCBE0]">완료한 목표</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-[#FFF9E8]">✦</Text>
              <Text className="text-[10px] text-[#BFCBE0]">첫 성장 카드</Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={async () => {
            await onRedeem();
            Alert.alert('성장 기록 카드', '카드를 보관함에 저장했어요.');
          }}
          className="mt-5 flex-row items-center justify-between rounded-2xl border border-[#B8A471] px-5 py-4">
          <Text className="font-bold text-[#5D4D29]">카드 저장하기</Text>
          <Text className="text-xl text-[#5D4D29]">↓</Text>
        </Pressable>
      </View>
    );
  if (saved)
    return (
      <View className="mx-5 mt-12 items-center rounded-3xl bg-[#FFF2D9] px-7 py-12">
        <Text className="text-4xl">♡</Text>
        <Text className="mt-4 text-xl font-bold text-[#5D482D]">미래의 나에게 남겼어요.</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-[#806B51]">
          지친 날, 면접 전, 기다림이 길어진 날에 조용히 다시 보여드릴게요.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-7 rounded-2xl bg-[#5D482D] px-5 py-3">
          <Text className="font-bold text-[#FFF8E8]">보관함으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  return (
    <View className="px-5 pt-7">
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#7A98C9]">
        PRIVATE LETTER · UNLOCKED
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#2B2A31]">
        미래의 나에게{`\n`}먼저 말을 걸어요.
      </Text>
      <Text className="mt-3 text-sm leading-6 text-[#77717C]">
        지친 날, 면접 전, 기다림이 길어진 날에만 조용히 다시 보여드릴게요.
      </Text>
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
          await onRedeem();
          setSaved(true);
        }}
        className={`mt-7 flex-row items-center justify-between rounded-2xl px-5 py-4 ${letter.trim() ? 'bg-[#4D638C]' : 'bg-[#D5DDEA]'}`}>
        <Text className="font-bold text-white">미래의 나에게 남기기</Text>
        <Text className="text-xl text-white">→</Text>
      </Pressable>
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
  const { palette } = useTheme();
  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(token!),
    enabled: Boolean(token),
  });
  const queryClient = useQueryClient();
  const [showArrivalPreview, setShowArrivalPreview] = useState(Boolean(preview));
  const totalPoints = dashboard.data?.total_points ?? 0;
  const redeem = useMutation({
    mutationFn: () => redeemReward(token!, kind, createIdempotencyKey()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    onError: (error: Error) => Alert.alert('구매할 수 없어요', error.message),
  });
  const reward = useMemo(
    () => getUnlockRewards(totalPoints).find((item) => item.kind === kind)!,
    [kind, totalPoints]
  );
  const needed = Math.max(reward.threshold - reward.progress, 0);
  let content = (
    <Locked
      needed={needed}
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
    if (kind === 'cheer') content = <Cheer onRedeem={() => redeem.mutateAsync()} />;
    if (kind === 'recovery')
      content = (
        <Recovery tasks={dashboard.data?.tasks ?? []} onRedeem={() => redeem.mutateAsync()} />
      );
    if (kind === 'reflection')
      content = (
        <Reflection
          totalPoints={totalPoints}
          tasks={dashboard.data?.tasks ?? []}
          onRedeem={() => redeem.mutateAsync()}
        />
      );
    if (kind === 'future')
      content = (
        <Future
          growth={false}
          totalPoints={totalPoints}
          tasks={dashboard.data?.tasks ?? []}
          onRedeem={() => redeem.mutateAsync()}
        />
      );
    if (kind === 'growth')
      content = (
        <Future
          growth
          totalPoints={totalPoints}
          tasks={dashboard.data?.tasks ?? []}
          onRedeem={() => redeem.mutateAsync()}
        />
      );
  }
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <PageHeader title={reward.shortTitle} />
      <ScrollView contentContainerClassName="pb-10">{content}</ScrollView>
    </SafeAreaView>
  );
}
