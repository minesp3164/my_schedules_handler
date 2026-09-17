import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

const RING_SIZE = 256;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type FocusSessionPanelProps = {
  remainingLabel: string;
  statusLabel: string;
  primaryLabel: string;
  progress: number;
  hasSession: boolean;
  isStalePaused: boolean;
  finished: boolean;
  finishedLabel?: string;
  titleLabel?: string;
  isPending: boolean;
  error?: string;
  onPrimary: () => void;
  onCancel: () => void;
};

export function FocusSessionPanel({
  remainingLabel,
  statusLabel,
  primaryLabel,
  progress,
  hasSession,
  isStalePaused,
  finished,
  finishedLabel,
  titleLabel,
  isPending,
  error,
  onPrimary,
  onCancel,
}: FocusSessionPanelProps) {
  const { palette } = useTheme();

  return (
    <View className="flex-1 justify-center px-5">
      <Text className="text-center text-2xl font-bold text-[#26332D]">{titleLabel ?? t('focus.title')}</Text>
      <Text className="mt-2 text-center text-sm text-muted">{t('focus.description')}</Text>
      <View
        className="my-10 self-center"
        style={{ width: RING_SIZE, height: RING_SIZE }}>
        <View className="h-full w-full items-center justify-center rounded-full bg-surface">
          <Text className="text-5xl font-bold text-[#26332D]">{remainingLabel}</Text>
          <Text className="mt-2 text-sm text-muted">{statusLabel}</Text>
        </View>
        <Svg
          width={RING_SIZE}
          height={RING_SIZE}
          style={{ position: 'absolute', top: 0, left: 0 }}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={palette.accentSoft}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={palette.accent}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
      </View>
      {error ? <Text className="mb-3 text-center text-sm text-[#FF9BA6]">{error}</Text> : null}
      {finished ? (
        <Text
          className="mb-3 rounded-xl px-4 py-3 text-center text-sm font-semibold"
          style={{ backgroundColor: palette.accentSoft, color: palette.accent }}>
          {finishedLabel ?? t('focus.finished')}
        </Text>
      ) : null}
      {isStalePaused ? (
        <View
          className="mb-3 rounded-xl border px-4 py-3"
          style={{ backgroundColor: palette.accentSoft, borderColor: palette.accent }}>
          <Text className="text-sm font-bold text-[#26332D]">{t('focus.stalePausedTitle')}</Text>
          <Text className="mt-1 text-xs leading-5 text-muted">
            {t('focus.stalePausedDescription')}
          </Text>
        </View>
      ) : null}
      <Pressable
        disabled={isPending}
        onPress={onPrimary}
        style={{ backgroundColor: palette.accent }}
        className="items-center rounded-[14px] bg-lavender py-4 transition duration-150 hover:-translate-y-px hover:opacity-90 disabled:opacity-50">
        <Text className="font-bold text-white">{primaryLabel}</Text>
      </Pressable>
      {hasSession ? (
        <Pressable
          disabled={isPending}
          onPress={onCancel}
          className="mt-3 items-center rounded-[14px] border border-line py-4 transition duration-150 hover:-translate-y-px hover:bg-surface">
          <Text className="font-bold text-muted">{t('focus.cancel')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
