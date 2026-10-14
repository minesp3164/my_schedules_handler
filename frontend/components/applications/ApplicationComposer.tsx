import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import type { Company } from '@/services/api';

export type NewApplication = {
  company: string;
  companyId: string | null;
  title: string;
  memo: string;
};

// 지원 건 추가 시트. 회사명은 실존 목록에서 검색하거나 직접 입력할 수 있다.
export function ApplicationComposer({
  visible,
  saving,
  error,
  onClose,
  onSearch,
  onConfirm,
}: {
  visible: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSearch: (query: string) => Promise<Company[]>;
  onConfirm: (input: NewApplication) => void;
}) {
  const { palette } = useTheme();
  const [company, setCompany] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [suggestions, setSuggestions] = useState<Company[]>([]);

  const trimmed = company.trim();

  useEffect(() => {
    let stale = false;
    const query = company.trim();
    if (!visible || !query || companyId) return;

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
  }, [company, companyId, visible, onSearch]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <View className="w-full max-w-md rounded-3xl bg-white p-5">
          <Text className="text-lg font-bold text-[#26332D]">{t('applications.addTitle')}</Text>

          <Text className="mt-4 text-xs font-bold text-meta">{t('applications.companyLabel')}</Text>
          <TextInput
            value={company}
            onChangeText={(text) => {
              setCompany(text);
              setCompanyId(null);
            }}
            placeholder={t('applications.companyPlaceholder')}
            placeholderTextColor="#AAB0B6"
            className="mt-1.5 h-11 rounded-xl border border-line px-3 text-sm text-[#26332D]"
          />
          {suggestions.length > 0 && !companyId ? (
            <View className="mt-1 max-h-32 overflow-hidden rounded-xl border border-line">
              {suggestions.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setCompany(item.name);
                    setCompanyId(item.id);
                    setSuggestions([]);
                  }}
                  className="min-h-10 justify-center border-b border-line px-3 last:border-b-0">
                  <Text className="text-xs text-[#26332D]">{item.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text className="mt-3 text-xs font-bold text-meta">{t('applications.titleLabel')}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            className="mt-1.5 h-11 rounded-xl border border-line px-3 text-sm text-[#26332D]"
          />

          <Text className="mt-3 text-xs font-bold text-meta">{t('applications.memoLabel')}</Text>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            multiline
            className="mt-1.5 min-h-16 rounded-xl border border-line px-3 py-2 text-sm text-[#26332D]"
          />

          {error ? <Text className="mt-3 text-xs text-[#FF9BA6]">{error}</Text> : null}

          <View className="mt-5 flex-row gap-2">
            <Pressable
              onPress={onClose}
              className="h-11 flex-1 items-center justify-center rounded-xl border border-line">
              <Text className="text-sm font-bold text-muted">{t('applications.cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={!trimmed || saving}
              onPress={() =>
                onConfirm({ company: trimmed, companyId, title: title.trim(), memo: memo.trim() })
              }
              style={{ backgroundColor: palette.accent, opacity: !trimmed || saving ? 0.5 : 1 }}
              className="h-11 flex-1 items-center justify-center rounded-xl">
              <Text className="text-sm font-bold text-white">
                {saving ? '…' : t('applications.save')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
