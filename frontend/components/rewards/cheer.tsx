import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { RewardRedemption } from '@/services/api';
import { useTheme } from '@/services/theme';
import { t } from '@/services/i18n';
import type { OnClaim } from './shared';

export function CheerArrivalPreview({
  onClose,
  message = t('rewards.cheer.inbox.newMessage'),
  detail = t('rewards.cheer.arrivalDetail'),
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
          {t('rewards.cheer.arrivalTitle')}
        </Text>
        <Animated.View
          className="mt-6"
          style={{ opacity: messageOpacity, transform: [{ translateY: messageOffset }] }}>
          <Text
            className="text-[10px] font-bold tracking-[1px]"
            style={{ color: palette.accentDeep }}>
            {t('rewards.cheer.fromAnonymous')}
          </Text>
          <Text className="mt-4 text-[21px] font-bold leading-8 text-[#3A3030]">{message}</Text>
          <Text className="mt-4 text-sm leading-6 text-[#786F70]">{detail}</Text>
          <View
            className="mt-3 flex-row justify-end gap-3 border-t pt-2"
            style={{ borderColor: palette.line }}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('rewards.cheer.hideAccessibility')}
              className="items-center justify-center rounded-xl px-3 py-1">
              <Text className="text-sm font-semibold text-[#827879]">
                {t('rewards.cheer.hide')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('rewards.cheer.reportAccessibility')}
              className="items-center justify-center rounded-xl px-3 py-1">
              <Text className="text-sm font-semibold" style={{ color: palette.accent }}>
                {t('rewards.cheer.report')}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
      <Text className="mt-7 text-center text-[11px] leading-5 text-[#9C9494]">
        {t('rewards.cheer.previewNotice')}
      </Text>
    </View>
  );
}

export function Cheer({
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
    t('rewards.cheer.suggestions.first'),
    t('rewards.cheer.suggestions.second'),
    t('rewards.cheer.suggestions.third'),
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
          {usedRecord && !sent ? t('rewards.cheer.savedWeekly') : t('rewards.cheer.saved')}
        </Text>
        {archived ? (
          <View className="mt-4 w-full rounded-2xl bg-white/70 p-4">
            <Text className="text-center text-sm leading-6 text-[#6B4B45]">{archived}</Text>
          </View>
        ) : null}
        <Text className="mt-3 text-center text-sm leading-6 text-[#7D5D58]">
          {t('rewards.cheer.savedBody')}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-7 rounded-2xl px-5 py-3"
          style={{ backgroundColor: accent }}>
          <Text className="font-bold text-white">{t('rewards.backToBox')}</Text>
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
        {t('rewards.cheer.headline')}
      </Text>
      <Text className="mt-3 text-sm leading-6 text-[#79727A]">{t('rewards.cheer.body')}</Text>
      <View className="mt-7 rounded-3xl border border-[#F1DCD6] bg-white p-4">
        <View className="flex-row justify-between">
          <Text className="text-xs font-bold text-[#60585C]">
            {t('rewards.cheer.messageLabel')}
          </Text>
          <Text className="text-xs text-[#9B9295]">{message.length} / 100</Text>
        </View>
        <TextInput
          value={message}
          onChangeText={(value) => setMessage(value.slice(0, 100))}
          multiline
          maxLength={100}
          placeholder={t('rewards.cheer.suggestions.first')}
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
          {t('rewards.cheer.privacyNotice')}
        </Text>
      </View>
      <Pressable
        onPress={() => setShowArrivalPreview(true)}
        accessibilityRole="button"
        accessibilityLabel={t('rewards.cheer.arrivalPreview')}
        className="mt-4 items-center rounded-2xl border border-[#F1DCD6] py-3">
        <Text className="text-sm font-bold text-[#B25E50]">
          {t('rewards.cheer.arrivalPreview')}
        </Text>
      </Pressable>
      <Pressable
        disabled={!message.trim()}
        onPress={async () => {
          const ok = await onRedeem({ message: message.trim() });
          if (ok) setSent(true);
        }}
        className="mt-7 flex-row items-center justify-between rounded-2xl px-5 py-4"
        style={{ backgroundColor: message.trim() ? accent : '#EBD9D5' }}>
        <Text className="font-bold text-white">{t('rewards.cheer.submit')}</Text>
        <Text className="text-xl text-white">→</Text>
      </Pressable>
    </View>
  );
}
