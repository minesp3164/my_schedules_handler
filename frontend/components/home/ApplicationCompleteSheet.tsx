import { t } from '@/services/i18n';
import type { Company } from '@/services/api';
import { CompanyNoteSheet } from './CompanyNoteSheet';

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
// 회사명은 서버가 필수로 요구하므로 회사 없이 완료하는 경로는 없다.
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
  return (
    <CompanyNoteSheet
      sheetKey="home.applicationSheet"
      progress={t('home.confirmSheet.nthApplication', {
        title: taskTitle,
        current: Math.min(completedCount + 1, targetCount),
        total: targetCount,
      })}
      saving={saving}
      error={error}
      onClose={onClose}
      onSearch={onSearch}
      onConfirm={onConfirm}
    />
  );
}
