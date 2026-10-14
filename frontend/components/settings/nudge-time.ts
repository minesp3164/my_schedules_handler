// 알림 시각 입력값을 "HH:MM" 형식으로 키보드 입력 중에도 정리한다.
export function formatNudgeTimeInput(next: string) {
  const digits = next.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;

  const splitAt = Number(digits.slice(0, 2)) <= 23 ? 2 : 1;
  return `${digits.slice(0, splitAt)}:${digits.slice(splitAt, splitAt + 2)}`;
}

// "13", "13:5" 같은 부분 입력을 저장 가능한 "HH:MM"으로 채운다.
export function normalizeNudgeAt(raw: string) {
  const trimmed = raw.trim();
  if (/^\d{1,2}$/.test(trimmed)) return `${trimmed.padStart(2, '0')}:00`;
  if (!trimmed.includes(':')) return trimmed;

  const [hours, minutes = ''] = trimmed.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padEnd(2, '0')}`;
}
