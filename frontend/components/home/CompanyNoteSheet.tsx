import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/services/theme';
import { t } from '@/services/i18n';
import type { Company } from '@/services/api';

type CompanyNoteSheetProps = {
  /** 라벨이 든 번역 네임스페이스(예: home.applicationSheet) */
  sheetKey: string;
  /** "제목 · 1/3번째 기록" 진행 문구 — 호출부에서 이미 번역해 넘긴다 */
  progress: string;
  /** 오늘 이미 기록된 값 — 있으면 목록으로 먼저 보여준다 */
  recordedNotes?: { title: string; items: string[] };
  /** 회사 없이 완료하는 경로(조사만 한 활동 전용) */
  skipLabel?: string;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSearch: (query: string) => Promise<Company[]>;
  onConfirm: (note: string, companyId: string | null) => void;
  onSkip?: () => void;
};

// 할 일을 +1 하기 전 "어디에/무엇을 기록했는지" 회사명을 받는 확정 창.
// 목록에서 고르면 실존 회사로 확인되고, 그냥 적으면 미확인으로 남아도 완료는 막지 않는다.
export function CompanyNoteSheet({
  sheetKey,
  progress,
  recordedNotes,
  skipLabel,
  saving,
  error,
  onClose,
  onSearch,
  onConfirm,
  onSkip,
}: CompanyNoteSheetProps) {
  const { palette } = useTheme();
  const [company, setCompany] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Company[]>([]);

  const trimmed = company.trim();
  const canConfirm = trimmed.length > 0;

  // 입력할 때마다 실존 목록을 검색한다(선택 후·삭제 시 목록 비움은 핸들러에서 처리한다).
  useEffect(() => {
    let stale = false;
    const query = company.trim();
    if (!query || companyId) return;

    const timer = setTimeout(() => {
      onSearch(query)
        .then((list) => {
          if (stale) return;
          setSuggestions(list);
        })
        .catch(() => {
          if (stale) return;
          setSuggestions([]);
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [company, companyId, onSearch]);

  const handleChange = (value: string) => {
    setCompany(value);
    setCompanyId(null); // 직접 수정하면 이전 선택의 실존 확인은 무효가 된다.
    if (!value.trim()) setSuggestions([]);
  };

  const handlePick = (picked: Company) => {
    setCompany(picked.name);
    setCompanyId(picked.id);
    setSuggestions([]);
  };

  return (
    <Modal visible transparent animationType="slide" presentationStyle="overFullScreen">
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(23, 48, 82, 0.28)' }}>
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
            <Text className="text-xl font-bold text-[#26332D]">{t(`${sheetKey}.title`)}</Text>
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
              {progress}
            </Text>
            <Text className="ml-3 shrink-0 text-[10px] text-meta">
              {t(`${sheetKey}.recordNote`)}
            </Text>
          </View>

          {/* 오늘(이 할 일에) 이미 기록된 회사 — 누를 때마다 무엇을 조사했는지 다시 볼 수 있게 한다. */}
          {recordedNotes?.items.length ? (
            <View className="mt-4 border-t border-line pt-4">
              <Text className="text-sm font-semibold text-[#26332D]">{recordedNotes.title}</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {recordedNotes.items.map((item) => (
                  <View
                    key={item}
                    className="rounded-full border border-line bg-white px-3 py-1.5"
                    style={{ borderColor: palette.line }}>
                    <Text className="text-xs font-semibold text-[#26332D]">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* 회사명 */}
          <View className="mt-4 border-t border-line pt-4">
            <Text className="text-sm font-semibold text-[#26332D]">
              {t(`${sheetKey}.companyLabel`)}
            </Text>
            <TextInput
              value={company}
              onChangeText={handleChange}
              placeholder={t(`${sheetKey}.companyPlaceholder`)}
              placeholderTextColor="#A8AEA2"
              editable={!saving}
              maxLength={100}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canConfirm && !saving) onConfirm(trimmed, companyId);
              }}
              className="mt-2 rounded-2xl border border-line bg-white px-4 py-3 text-base text-[#26332D]"
            />

            {suggestions.length ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 176 }}
                className="mt-2 rounded-2xl border border-line bg-white">
                {suggestions.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={t(`${sheetKey}.selectSuggestion`, { name: item.name })}
                    disabled={saving}
                    onPress={() => handlePick(item)}
                    className="border-b border-line px-4 py-2.5 last:border-b-0">
                    <Text className="text-sm text-[#26332D]" numberOfLines={1}>
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {companyId ? (
              <Text className="mt-2 text-[11px] font-semibold text-[#3E8E68]">
                {t(`${sheetKey}.verifiedNote`)}
              </Text>
            ) : trimmed ? (
              <Text className="mt-2 text-[11px] text-meta">{t(`${sheetKey}.unverifiedNote`)}</Text>
            ) : (
              <Text className="mt-2 text-[11px] text-meta">{t(`${sheetKey}.requiredNote`)}</Text>
            )}
          </View>

          {error ? (
            <Text className="mt-3 text-xs font-semibold text-[#C44B5D]">{error}</Text>
          ) : null}

          <Pressable
            disabled={!canConfirm || saving}
            onPress={() => onConfirm(trimmed, companyId)}
            accessibilityRole="button"
            accessibilityLabel={t(`${sheetKey}.confirmAccessibility`)}
            className="mt-5 h-14 items-center justify-center rounded-2xl disabled:opacity-40"
            style={{ backgroundColor: palette.accent }}>
            <Text className="text-base font-bold text-white">
              {saving ? t('home.confirmSheet.saving') : t('home.confirmSheet.confirm')}
            </Text>
          </Pressable>

          {skipLabel && onSkip ? (
            <Pressable
              disabled={saving}
              onPress={onSkip}
              accessibilityRole="button"
              accessibilityLabel={skipLabel}
              className="mt-2 h-11 items-center justify-center rounded-2xl disabled:opacity-40">
              <Text className="text-sm font-semibold text-muted">{skipLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
