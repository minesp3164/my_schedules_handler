import { Pressable, Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

type FocusSessionPanelProps = {
  remainingLabel: string;
  statusLabel: string;
  primaryLabel: string;
  hasSession: boolean;
  isStalePaused: boolean;
  finished: boolean;
  isPending: boolean;
  error?: string;
  previewMessage: string | null;
  onPrimary: () => void;
  onPreview: () => void;
  onComplete: () => void;
  onCancel: () => void;
};

export function FocusSessionPanel({
  remainingLabel,
  statusLabel,
  primaryLabel,
  hasSession,
  isStalePaused,
  finished,
  isPending,
  error,
  previewMessage,
  onPrimary,
  onPreview,
  onComplete,
  onCancel,
}: FocusSessionPanelProps) {
  const { palette } = useTheme();

  return (
    <View className="flex-1 justify-center px-5">
      <Text className="text-center text-2xl font-bold text-[#173052]">{t('focus.title')}</Text>
      <Text className="mt-2 text-center text-sm text-muted">{t('focus.description')}</Text>
      <View
        className="my-10 h-64 w-64 items-center justify-center self-center rounded-full border-[14px] bg-surface"
        style={{ borderColor: palette.accent }}>
        <Text className="text-5xl font-bold text-[#173052]">{remainingLabel}</Text>
        <Text className="mt-2 text-sm text-muted">{statusLabel}</Text>
      </View>
      {error ? <Text className="mb-3 text-center text-sm text-[#FF9BA6]">{error}</Text> : null}
      {finished ? (
        <Text
          className="mb-3 rounded-xl px-4 py-3 text-center text-sm font-semibold"
          style={{ backgroundColor: palette.accentSoft, color: palette.accent }}>
          {t('focus.finished')}
        </Text>
      ) : null}
      {isStalePaused ? (
        <View
          className="mb-3 rounded-xl border px-4 py-3"
          style={{ backgroundColor: palette.accentSoft, borderColor: palette.accent }}>
          <Text className="text-sm font-bold text-[#173052]">{t('focus.stalePausedTitle')}</Text>
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
      <Pressable
        onPress={onPreview}
        className="mt-3 items-center rounded-[14px] border border-line py-3 transition duration-150 hover:-translate-y-px hover:bg-surface">
        <Text className="font-semibold text-muted">{t('focus.preview')}</Text>
      </Pressable>
      {previewMessage ? (
        <Text className="mt-2 text-center text-xs text-muted">{previewMessage}</Text>
      ) : null}
      {hasSession ? (
        <View className="mt-3 flex-row gap-3">
          <Pressable
            disabled={isPending}
            onPress={onComplete}
            className="flex-1 items-center rounded-[14px] py-4 transition duration-150 hover:-translate-y-px hover:opacity-90"
            style={{ backgroundColor: palette.accent }}>
            <Text className="font-bold text-white">{t('focus.complete')}</Text>
          </Pressable>
          <Pressable
            disabled={isPending}
            onPress={onCancel}
            className="flex-1 items-center rounded-[14px] border border-line py-4 transition duration-150 hover:-translate-y-px hover:bg-surface">
            <Text className="font-bold text-muted">{t('focus.cancel')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
