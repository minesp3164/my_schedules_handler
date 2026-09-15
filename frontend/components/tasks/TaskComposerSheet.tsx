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

type TaskComposerSheetProps = {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (input: { title: string; targetCount: number; kind: string; weekdays: number[] }) => void;
};
const categories = ['focus', 'algorithm', 'portfolio', 'application', 'custom'];
const categoryPoints: Record<string, number> = {
  focus: 10,
  algorithm: 15,
  portfolio: 20,
  application: 25,
  custom: 10,
};
const fixedPointCategories = new Set(['portfolio', 'application']);
const weekdays = [1, 2, 3, 4, 5, 6, 0];

export function TaskComposerSheet({ visible, saving, onClose, onSave }: TaskComposerSheetProps) {
  const [title, setTitle] = useState('');
  const [targetCount, setTargetCount] = useState(1);
  const [kind, setKind] = useState('focus');
  const [customKind, setCustomKind] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(weekdays);
  const { palette } = useTheme();
  const autoPoints =
    (categoryPoints[kind] ?? categoryPoints.custom) *
    (fixedPointCategories.has(kind) ? 1 : targetCount);
  const close = () => {
    setTitle('');
    setTargetCount(1);
    setKind('focus');
    setCustomKind('');
    setSelectedWeekdays(weekdays);
    onClose();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={close}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(23, 48, 82, 0.28)' }}>
        <Pressable
          accessibilityLabel={t('tasks.closeAddSheet')}
          onPress={close}
          style={{ position: 'absolute', inset: 0 }}
        />
        <KeyboardAvoidingView
          enabled={Platform.OS !== 'web'}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
            <View className="h-1.5 w-10 self-center rounded-full bg-[#B8DBF7]" />
            <View className="mt-5 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-[#173052]">{t('tasks.sheetTitle')}</Text>
              <Pressable
                accessibilityLabel={t('tasks.closeAddSheet')}
                onPress={close}
                className="min-h-11 min-w-11 items-center justify-center">
                <Text className="text-sm font-semibold text-muted">{t('tasks.cancel')}</Text>
              </Pressable>
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('tasks.placeholder')}
              placeholderTextColor="#69809D"
              autoFocus
              className="mt-5 rounded-xl border border-line bg-screen px-4 py-4 text-[#173052]"
            />
            <Counter
              label={t('tasks.targetCount')}
              value={t('tasks.targetCountValue', { count: targetCount })}
              decrementLabel={t('tasks.decreaseTargetCount')}
              incrementLabel={t('tasks.increaseTargetCount')}
              disabled={targetCount === 1}
              onDecrease={() => setTargetCount((count) => Math.max(1, count - 1))}
              onIncrease={() => setTargetCount((count) => count + 1)}
            />
            <View className="mt-4 border-t border-line pt-4">
              <Text className="text-sm font-semibold text-[#173052]">{t('tasks.category')}</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {categories.map((option) => {
                  const selected = kind === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setKind(option)}
                      className="rounded-full px-3 py-2"
                      style={{ backgroundColor: selected ? palette.accent : palette.accentSoft }}>
                      <Text
                        className="text-xs font-bold"
                        style={{ color: selected ? '#FFFFFF' : palette.accent }}>
                        {t(`tasks.category${option.charAt(0).toUpperCase()}${option.slice(1)}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {kind === 'custom' ? (
                <TextInput
                  value={customKind}
                  onChangeText={setCustomKind}
                  placeholder={t('tasks.customCategoryPlaceholder')}
                  placeholderTextColor="#69809D"
                  maxLength={30}
                  className="mt-3 rounded-xl border border-line bg-screen px-4 py-3 text-[#173052]"
                />
              ) : null}
              <Text className="mt-3 text-xs font-semibold text-muted">
                {t('tasks.autoPoints', { points: autoPoints })}
              </Text>
            </View>
            <View className="mt-4 border-t border-line pt-4">
              <Text className="text-sm font-semibold text-[#173052]">{t('tasks.weekdays')}</Text>
              <Text className="mt-1 text-xs text-muted">{t('tasks.weekdaysHint')}</Text>
              <View className="mt-3 flex-row justify-between gap-1">
                {weekdays.map((weekday) => {
                  const selected = selectedWeekdays.includes(weekday);
                  return (
                    <Pressable
                      key={weekday}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t(`tasks.weekday${weekday}`)}
                      onPress={() =>
                        setSelectedWeekdays((current) =>
                          selected
                            ? current.filter((item) => item !== weekday)
                            : [...current, weekday].sort((left, right) => left - right)
                        )
                      }
                      className="h-10 min-w-10 items-center justify-center rounded-full px-2"
                      style={{ backgroundColor: selected ? palette.accent : palette.accentSoft }}>
                      <Text
                        className="text-xs font-bold"
                        style={{ color: selected ? '#FFFFFF' : palette.accent }}>
                        {t(`tasks.weekdayShort${weekday}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable
              disabled={!title || selectedWeekdays.length === 0 || saving}
              onPress={() =>
                onSave({
                  title,
                  targetCount,
                  kind: kind === 'custom' && customKind.trim() ? customKind.trim() : kind,
                  weekdays: selectedWeekdays,
                })
              }
              style={{ backgroundColor: palette.accent }}
              className="mt-6 h-14 items-center justify-center rounded-2xl bg-lavender disabled:opacity-40">
              <Text className="text-base font-bold text-white">
                {saving ? t('tasks.saving') : t('tasks.add')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Counter({
  label,
  value,
  decrementLabel,
  incrementLabel,
  disabled,
  bordered,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  decrementLabel: string;
  incrementLabel: string;
  disabled: boolean;
  bordered?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const { palette } = useTheme();
  return (
    <View
      className={`mt-${bordered ? '3 border-t border-line pt-4' : '4'} flex-row items-center justify-between`}>
      <Text className="text-sm font-semibold text-[#173052]">{label}</Text>
      <View className="flex-row items-center">
        <Pressable
          accessibilityLabel={decrementLabel}
          disabled={disabled}
          onPress={onDecrease}
          className="h-11 w-11 items-center justify-center rounded-lg bg-[#EEF5FA] disabled:opacity-40">
          <Text className="text-xl font-bold text-[#2479CC]">−</Text>
        </Pressable>
        <Text className="min-w-16 text-center text-sm font-bold text-[#173052]">{value}</Text>
        <Pressable
          accessibilityLabel={incrementLabel}
          onPress={onIncrease}
          style={{ backgroundColor: palette.accent }}
          className="h-11 w-11 items-center justify-center rounded-lg bg-lavender">
          <Text className="text-xl font-bold text-white">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
