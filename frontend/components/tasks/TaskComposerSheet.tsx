import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import type { TaskTemplate } from '@/services/api';

type TaskComposerSheetProps = {
  visible: boolean;
  saving: boolean;
  task?: TaskTemplate | null;
  onClose: () => void;
  onSave: (input: { title: string; targetCount: number; kind: string; weekdays: number[] }) => void;
};
const categories = ['focus', 'algorithm', 'portfolio', 'application'];
const categoryPoints: Record<string, number> = {
  focus: 10,
  algorithm: 1,
  portfolio: 20,
  application: 25,
};
const fixedPointCategories = new Set(['portfolio', 'application']);
const weekdays = [1, 2, 3, 4, 5, 6, 0];

export function TaskComposerSheet({
  visible,
  saving,
  task,
  onClose,
  onSave,
}: TaskComposerSheetProps) {
  const [targetCount, setTargetCount] = useState(task?.target_count ?? 1);
  const [kind, setKind] = useState(task?.kind ?? 'focus');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(task?.weekdays ?? weekdays);
  const { palette } = useTheme();
  const autoPoints =
    (categoryPoints[kind] ?? 0) * (fixedPointCategories.has(kind) ? 1 : targetCount);
  const close = () => {
    setTargetCount(1);
    setKind('focus');
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
              {t(task ? 'tasks.editSheetTitle' : 'tasks.sheetTitle')}
            </Text>
            <Pressable
              accessibilityLabel={t('tasks.closeAddSheet')}
              onPress={close}
              className="min-h-11 min-w-11 items-center justify-center">
              <Text className="text-sm font-semibold text-muted">{t('tasks.cancel')}</Text>
            </Pressable>
          </View>
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
            <Text className="text-sm font-semibold text-[#26332D]">{t('tasks.category')}</Text>
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
            <Text className="mt-3 text-xs font-semibold text-muted">
              {t('tasks.autoPoints', { points: autoPoints })}
            </Text>
          </View>
          <View className="mt-4 border-t border-line pt-4">
            <Text className="text-sm font-semibold text-[#26332D]">{t('tasks.weekdays')}</Text>
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
            disabled={selectedWeekdays.length === 0 || saving}
            onPress={() =>
              onSave({
                title: t(`tasks.category${kind.charAt(0).toUpperCase()}${kind.slice(1)}`),
                targetCount,
                kind,
                weekdays: selectedWeekdays,
              })
            }
            style={{ backgroundColor: palette.accent }}
            className="mt-6 h-14 items-center justify-center rounded-2xl bg-lavender disabled:opacity-40">
            <Text className="text-base font-bold text-white">
              {saving ? t('tasks.saving') : t(task ? 'tasks.saveEdit' : 'tasks.add')}
            </Text>
          </Pressable>
        </View>
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
      <Text className="text-sm font-semibold text-[#26332D]">{label}</Text>
      <View className="flex-row items-center">
        <Pressable
          accessibilityLabel={decrementLabel}
          disabled={disabled}
          onPress={onDecrease}
          className="h-11 w-11 items-center justify-center rounded-lg bg-[#EEF5FA] disabled:opacity-40">
          <Text className="text-xl font-bold text-[#52786B]">−</Text>
        </Pressable>
        <Text className="min-w-16 text-center text-sm font-bold text-[#26332D]">{value}</Text>
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
