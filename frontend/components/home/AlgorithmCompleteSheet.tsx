import { useState } from 'react';
import { Image, Modal, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
    ? '문제명을 입력하거나 사진을 올려 주세요.'
    : !answer.trim()
      ? '어떤 답변이 나왔는지 입력해 주세요.'
      : null;

  const pickPhoto = async () => {
    setPickerError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickerError('사진을 올리려면 사진 접근 권한이 필요해요.');
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
            <Text className="text-xl font-bold text-[#26332D]">어떤 문제였나요?</Text>
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
              {taskTitle} · {Math.min(completedCount + 1, targetCount)}/{targetCount}번째 문제
            </Text>
            <Text className="ml-3 shrink-0 text-[10px] text-meta">저장하지 않는 확인용이에요</Text>
          </View>

          {/* 문제명 — 사진이 있으면 스킵 가능 */}
          <View className="mt-4 border-t border-line pt-4">
            <Text className="text-sm font-semibold text-[#26332D]">
              문제명{' '}
              <Text className="text-[11px] font-normal text-muted">(사진으로 대체 가능)</Text>
            </Text>
            <TextInput
              value={problem}
              onChangeText={setProblem}
              placeholder="예: BOJ 1085 — 삼각형의 변"
              placeholderTextColor="#A8AEA2"
              editable={!saving}
              className="mt-2 rounded-2xl border border-line bg-white px-4 py-3 text-base text-[#26332D]"></TextInput>
            <View className="mt-2 flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="문제 사진 올리기"
                disabled={saving}
                onPress={pickPhoto}
                className="rounded-full border border-[#9AC13C] px-3.5 py-2">
                <Text className="text-xs font-bold text-[#4E6B15]">
                  {photo ? '사진 바꾸기' : '사진 올리기'}
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
                    accessibilityLabel="올린 사진 삭제"
                    disabled={saving}
                    onPress={() => setPhoto(null)}
                    className="rounded-full bg-[#EEF1E8] px-3 py-2">
                    <Text className="text-xs font-semibold text-[#6E7563]">사진 삭제</Text>
                  </Pressable>
                </>
              ) : (
                <Text className="flex-1 text-[11px] text-meta">
                  사진을 올리면 문제명 입력은 건너뛸 수 있어요.
                </Text>
              )}
            </View>
          </View>

          {/* 답변 */}
          <View className="mt-4 border-t border-line pt-4">
            <Text className="text-sm font-semibold text-[#26332D]">어떤 답변이 나왔나요?</Text>
            <TextInput
              value={answer}
              onChangeText={setAnswer}
              multiline
              placeholder="예: 정답(42) · 시간초과 → 이분탐색으로 통과"
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
            accessibilityLabel="확인하고 완료 처리하기"
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
