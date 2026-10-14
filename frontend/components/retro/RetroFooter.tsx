import { useEffect, useRef } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

// 하단 회고 입력 · 저장. 웹 Safari 키보드 대응 푸터 보정도 함께 맡는다.
export function RetroFooter({
  isCurrentWeek,
  draft,
  onDraftChange,
  saved,
  saving,
  canSave,
  hasSavedBody,
  error,
  onSave,
}: {
  isCurrentWeek: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  saved: boolean;
  saving: boolean;
  canSave: boolean;
  hasSavedBody: boolean;
  error: string | null;
  onSave: () => void;
}) {
  const { palette } = useTheme();
  // 웹 Safari는 KeyboardAvoidingView와 interactive-widget이 안 먹혀서 visualViewport로 보정한다.
  const footerRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const viewport = (globalThis as { visualViewport?: VisualViewport }).visualViewport;
    if (!viewport) return;
    const update = () => {
      const node = footerRef.current as unknown as { style?: CSSStyleDeclaration } | null;
      if (!node?.style) return;
      const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      node.style.transform = covered > 0 ? `translateY(${-covered}px)` : '';
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);
  return (
    <View
      ref={footerRef}
      className="border-t border-line px-5 pb-4 pt-3"
      style={{ backgroundColor: palette.screen }}>
      <Text className="mb-2 text-[13px] font-extrabold text-[#26332D]">
        {isCurrentWeek ? t('retro.retroPrompt') : t('retro.retroPromptPast')}
      </Text>
      <View className="flex-row gap-2">
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          placeholder={t('retro.placeholder')}
          placeholderTextColor="#8AA08F"
          maxLength={500}
          className="flex-1 rounded-2xl border border-line bg-white px-4 py-3 text-[13px] text-[#26332D]"
        />
        <Pressable
          onPress={onSave}
          disabled={saving || !canSave}
          className="items-center justify-center rounded-2xl bg-[#26332D] px-5 disabled:opacity-50">
          <Text className="text-[13px] font-extrabold text-white">
            {saved ? t('retro.saved') : t('retro.save')}
          </Text>
        </Pressable>
      </View>
      {hasSavedBody ? (
        <Text className="mt-1.5 text-[10px] text-muted">{t('retro.emptyBodyDeleteHint')}</Text>
      ) : (
        <Text className="mt-1.5 text-[10px] text-muted">{t('retro.costHint')}</Text>
      )}
      {error ? <Text className="mt-1.5 text-[11px] text-[#FF9BA6]">{error}</Text> : null}
    </View>
  );
}
