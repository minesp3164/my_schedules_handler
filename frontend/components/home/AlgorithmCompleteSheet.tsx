import { useState } from 'react';
import { Image, Modal, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

type AlgorithmCompleteSheetProps = {
  taskTitle: string;
  completedCount: number;
  targetCount: number;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

// 알고리즘 할 일을 +1 하기 전 "어떤 문제 / 어떤 답변"을 스스로 확인하는 확정 창.
// 입력은 저장하지 않고 확정용으로만 쓴다. 사진을 올리면 문제명 입력은 스킵할 수 있다.
export function AlgorithmCompleteSheet({
  taskTitle,
  completedCount,
  targetCount,
  saving,
  error,
  onClose,
  onConfirm,
}: AlgorithmCompleteSheetProps) {
  const { palette } = useTheme();
  const [problem, setProblem] = useState('');
  const [answer, setAnswer] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const hasProblem = Boolean(problem.trim()) || Boolean(photo);
  const canConfirm = hasProblem && Boolean(answer.trim());
  const validationHint = !hasProblem
    ? t('home.algorithmSheet.hintEnterProblem')
    : !answer.trim()
      ? t('home.algorithmSheet.hintEnterAnswer')
      : null;

  const pickPhoto = async () => {
    setPickerError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickerError(t('home.algorithmSheet.photoPermissionNeeded'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length) setPhoto(result.assets[0].uri);
  };

  const displayError = error ?? pickerError;

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
            <Text className="text-xl font-bold text-[#26332D]">
              {t('home.algorithmSheet.title')}
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
              {t('home.confirmSheet.nthProblem', {
                title: taskTitle,
                current: Math.min(completedCount + 1, targetCount),
                total: targetCount,
              })}
            </Text>
            <Text className="ml-3 shrink-0 text-[10px] text-meta">
              {t('home.algorithmSheet.notSavedNote')}
            </Text>
          </View>

          {/* 문제명 — 사진이 있으면 스킵 가능 */}
          <View className="mt-4 border-t border-line pt-4">
            <Text className="text-sm font-semibold text-[#26332D]">
              {t('home.algorithmSheet.problemLabel')}{' '}
              <Text className="text-[11px] font-normal text-muted">
                {t('home.algorithmSheet.problemHint')}
              </Text>
            </Text>
            <TextInput
              value={problem}
              onChangeText={setProblem}
              placeholder={t('home.algorithmSheet.problemPlaceholder')}
              placeholderTextColor="#A8AEA2"
              editable={!saving}
              className="mt-2 rounded-2xl border border-line bg-white px-4 py-3 text-base text-[#26332D]"></TextInput>
            <View className="mt-2 flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.algorithmSheet.uploadPhotoAccessibility')}
                disabled={saving}
                onPress={pickPhoto}
                className="rounded-full border border-[#9AC13C] px-3.5 py-2">
                <Text className="text-xs font-bold text-[#4E6B15]">
                  {photo
                    ? t('home.algorithmSheet.changePhoto')
                    : t('home.algorithmSheet.uploadPhoto')}
                </Text>
              </Pressable>
              {photo ? (
                <>
                  <Image
                    source={{ uri: photo }}
                    resizeMode="cover"
                    style={{ width: 40, height: 40, borderRadius: 10 }}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('home.algorithmSheet.deletePhotoAccessibility')}
                    disabled={saving}
                    onPress={() => setPhoto(null)}
                    className="rounded-full bg-[#EEF1E8] px-3 py-2">
                    <Text className="text-xs font-semibold text-[#6E7563]">
                      {t('home.algorithmSheet.deletePhoto')}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text className="flex-1 text-[11px] text-meta">
                  {t('home.algorithmSheet.photoSkipHint')}
                </Text>
              )}
            </View>
          </View>

          {/* 답변 */}
          <View className="mt-4 border-t border-line pt-4">
            <Text className="text-sm font-semibold text-[#26332D]">
              {t('home.algorithmSheet.answerTitle')}
            </Text>
            <TextInput
              value={answer}
              onChangeText={setAnswer}
              multiline
              placeholder={t('home.algorithmSheet.answerPlaceholder')}
              placeholderTextColor="#A8AEA2"
              editable={!saving}
              className="mt-2 min-h-20 rounded-2xl border border-line bg-white px-4 py-3 text-base leading-6 text-[#26332D]"
              textAlignVertical="top"
            />
          </View>

          {displayError ? (
            <Text className="mt-3 text-xs font-semibold text-[#C44B5D]">{displayError}</Text>
          ) : null}
          {!displayError && validationHint ? (
            <Text className="mt-3 text-[11px] text-meta">{validationHint}</Text>
          ) : null}

          <Pressable
            disabled={!canConfirm || saving}
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel={t('home.algorithmSheet.confirmAccessibility')}
            className="mt-5 h-14 items-center justify-center rounded-2xl disabled:opacity-40"
            style={{ backgroundColor: palette.accent }}>
            <Text className="text-base font-bold text-white">
              {saving ? t('home.confirmSheet.saving') : t('home.confirmSheet.confirm')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
