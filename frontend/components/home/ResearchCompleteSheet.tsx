import { t } from '@/services/i18n';
import type { Company } from '@/services/api';
import { CompanyNoteSheet } from './CompanyNoteSheet';

type ResearchCompleteSheetProps = {
  taskTitle: string;
  completedCount: number;
  targetCount: number;
  /** 오늘 이 할 일에 이미 기록된 리서치 대상 기업 */
  recordedNotes: string[];
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSearch: (query: string) => Promise<Company[]>;
  onConfirm: (note: string, companyId: string | null) => void;
  onSkip: () => void;
};

// 기업 리서치를 +1 하기 전 "어떤 기업을 조사했는지" 회사명을 받는 확정 창.
// 조사는 기록만 남기는 활동이라 회사 없이 완료하는 경로도 함께 둔다.
export function ResearchCompleteSheet({
  taskTitle,
  completedCount,
  targetCount,
  recordedNotes,
  saving,
  error,
  onClose,
  onSearch,
  onConfirm,
  onSkip,
}: ResearchCompleteSheetProps) {
  return (
    <CompanyNoteSheet
      sheetKey="home.researchSheet"
      progress={t('home.confirmSheet.nthResearch', {
        title: taskTitle,
        current: Math.min(completedCount + 1, targetCount),
        total: targetCount,
      })}
      recordedNotes={
        recordedNotes.length
          ? { title: t('home.researchSheet.recordedTitle'), items: recordedNotes }
          : undefined
      }
      skipLabel={t('home.researchSheet.skip')}
      saving={saving}
      error={error}
      onClose={onClose}
      onSearch={onSearch}
      onConfirm={onConfirm}
      onSkip={onSkip}
    />
  );
}
