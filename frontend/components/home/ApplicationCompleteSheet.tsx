import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/services/theme';
import type { Company } from '@/services/api';

type ApplicationCompleteSheetProps = {
  taskTitle: string;
  completedCount: number;
  targetCount: number;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSearch: (query: string) => Promise<Company[]>;
  onConfirm: (note: string, companyId: string | null) => void;
};

// 실제 지원 할 일을 +1 하기 전 "어디에 지원했는지" 회사명을 받는 확정 창.
// 목록에서 고르면 실존 회사로 확인되고, 그냥 적으면 미확인으로 남아도 완료는 막지 않는다.
export function ApplicationCompleteSheet({
  taskTitle,
  completedCount,
  targetCount,
  saving,
  error,
  onClose,
  onSearch,
  onConfirm,
}: ApplicationCompleteSheetProps) {
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
          accessibilityLabel="확인창 닫기"
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
            <Text className="text-xl font-bold text-[#26332D]">어디에 지원했어요?</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="확인창 닫기"
              disabled={saving}
              onPress={onClose}
              className="min-h-11 min-w-11 items-center justify-center">
              <Text className="text-sm font-semibold text-muted">닫기</Text>
            </Pressable>
          </View>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-muted" numberOfLines={1}>
              {taskTitle} · {Math.min(completedCount + 1, targetCount)}/{targetCount}번째 지원
            </Text>
            <Text className="ml-3 shrink-0 text-[10px] text-meta">지원한 곳이 기록돼요</Text>
          </View>

          {/* 회사명 */}
          <View className="mt-4 border-t border-line pt-4">
            <Text className="text-sm font-semibold text-[#26332D]">지원한 회사</Text>
            <TextInput
              value={company}
              onChangeText={handleChange}
              placeholder="예: 네이버 · 서울시 청년취업센터"
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
                    accessibilityLabel={`${item.name} 선택`}
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
                ✓ 목록에서 확인된 실존 회사로 기록돼요.
              </Text>
            ) : trimmed ? (
              <Text className="mt-2 text-[11px] text-meta">
                미확인 회사로 기록돼요 · 목록에서 고르면 확인돼요.
              </Text>
            ) : (
              <Text className="mt-2 text-[11px] text-meta">
                지원한 곳을 적어야 완료로 넘어갈 수 있어요.
              </Text>
            )}
          </View>

          {error ? (
            <Text className="mt-3 text-xs font-semibold text-[#C44B5D]">{error}</Text>
          ) : null}

          <Pressable
            disabled={!canConfirm || saving}
            onPress={() => onConfirm(trimmed, companyId)}
            accessibilityRole="button"
            accessibilityLabel="지원한 회사를 적고 완료 처리하기"
            className="mt-5 h-14 items-center justify-center rounded-2xl disabled:opacity-40"
            style={{ backgroundColor: palette.accent }}>
            <Text className="text-base font-bold text-white">
              {saving ? '기록 중…' : '확인 완료'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
