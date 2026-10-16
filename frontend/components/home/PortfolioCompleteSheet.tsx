import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

type PortfolioCompleteSheetProps = {
  taskTitle: string;
  completedCount: number;
  targetCount: number;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (url: string) => void;
};

// 기술 블로그/회고 할 일을 +1 하기 전 "어느 글을 발행했는지" 글 주소를 받는 확정 창.
// 주소는 완료 기록(note)으로 남아 홈·발자국에서 다시 확인할 수 있다.
export function PortfolioCompleteSheet({
  taskTitle,
  completedCount,
  targetCount,
  saving,
  error,
  onClose,
  onConfirm,
}: PortfolioCompleteSheetProps) {
  const { palette } = useTheme();
  const [url, setUrl] = useState('');

  const trimmed = url.trim();
  const normalized = normalizeUrl(trimmed);
  const canConfirm = normalized !== null;

  const submit = () => {
    if (!canConfirm || saving || !normalized) return;
    onConfirm(normalized);
  };

  return (
    <Modal visible transparent animationType="slide" presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(23, 48, 82, 0.28)' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.confirmSheet.closeLabel')}
          onPress={() => {
            if (!saving) onClose();
          }}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.line,
            borderWidth: 1,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 32,
          }}>
          <View className="h-1.5 w-10 self-center rounded-full bg-[#C8DDCF]" />
          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-[#26332D]">
              {t('home.portfolioSheet.title')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.confirmSheet.closeLabel')}
              disabled={saving}
              onPress={onClose}
              className="min-h-11 min-w-11 items-center justify-center">
              <Text className="text-sm font-semibold text-muted">
                {t('home.confirmSheet.close')}
              </Text>
            </Pressable>
          </View>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-muted" numberOfLines={1}>
              {t('home.portfolioSheet.nthPost', {
                title: taskTitle,
                current: Math.min(completedCount + 1, targetCount),
                total: targetCount,
              })}
            </Text>
            <Text className="ml-3 shrink-0 text-[10px] text-meta">
              {t('home.portfolioSheet.recordNote')}
            </Text>
          </View>

          {/* 글 주소 */}
          <View className="mt-4 border-t border-line pt-4">
            <Text className="text-sm font-semibold text-[#26332D]">
              {t('home.portfolioSheet.urlLabel')}
            </Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder={t('home.portfolioSheet.urlPlaceholder')}
              placeholderTextColor="#A8AEA2"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!saving}
              maxLength={500}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submit}
              className="mt-2 rounded-2xl border border-line bg-white px-4 py-3 text-base text-[#26332D]"
            />

            {trimmed ? (
              canConfirm ? (
                <Text className="mt-2 text-[11px] font-semibold text-[#3E8E68]">
                  {t('home.portfolioSheet.readyNote', { url: normalized })}
                </Text>
              ) : (
                <Text className="mt-2 text-[11px] font-semibold text-[#C44B5D]">
                  {t('home.portfolioSheet.invalidUrl')}
                </Text>
              )
            ) : (
              <Text className="mt-2 text-[11px] text-meta">
                {t('home.portfolioSheet.requiredNote')}
              </Text>
            )}
          </View>

          {error ? (
            <Text className="mt-3 text-xs font-semibold text-[#C44B5D]">{error}</Text>
          ) : null}

          <Pressable
            disabled={!canConfirm || saving}
            onPress={submit}
            accessibilityRole="button"
            accessibilityLabel={t('home.portfolioSheet.confirmAccessibility')}
            className="mt-5 h-14 items-center justify-center rounded-2xl disabled:opacity-40"
            style={{ backgroundColor: palette.accent }}>
            <Text className="text-base font-bold text-white">
              {saving ? t('home.confirmSheet.saving') : t('home.confirmSheet.confirm')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// scheme 없는 입력(예: velog.kr/@me/post)도 받아 https를 붙여 준다. http/https가 아니면 null.
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(withScheme);
    if (!parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
