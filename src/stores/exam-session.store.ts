import { create } from 'zustand';

export interface AnswerState {
  examQuestionId: string;
  selectedOptions: string[];
  essayAnswer: string;
  isDoubtful: boolean;
  answeredAt: string | null;
}

interface ExamSessionState {
  sessionId: string | null;
  examId: string | null;
  examTitle: string;
  durationMinutes: number;
  startedAt: Date | null;
  questionOrder: string[]; // list of examQuestionId in display order
  currentIndex: number;
  answers: Record<string, AnswerState>; // keyed by examQuestionId
  isSubmitted: boolean;
  finalScore: number | null;
  isPassed: boolean | null;

  // Actions
  initSession: (params: {
    sessionId: string;
    examId: string;
    examTitle: string;
    durationMinutes: number;
    startedAt: Date;
    questionOrder: string[];
  }) => void;
  setCurrentIndex: (index: number) => void;
  setAnswer: (examQuestionId: string, partial: Partial<AnswerState>) => void;
  toggleDoubtful: (examQuestionId: string) => void;
  markSubmitted: (score: number, isPassed: boolean | null) => void;
  reset: () => void;
}

const DEFAULT: Omit<ExamSessionState, keyof { initSession: unknown; setCurrentIndex: unknown; setAnswer: unknown; toggleDoubtful: unknown; markSubmitted: unknown; reset: unknown }> = {
  sessionId: null,
  examId: null,
  examTitle: '',
  durationMinutes: 0,
  startedAt: null,
  questionOrder: [],
  currentIndex: 0,
  answers: {},
  isSubmitted: false,
  finalScore: null,
  isPassed: null,
};

export const useExamSessionStore = create<ExamSessionState>((set, get) => ({
  ...DEFAULT,

  initSession: (params) =>
    set({
      sessionId: params.sessionId,
      examId: params.examId,
      examTitle: params.examTitle,
      durationMinutes: params.durationMinutes,
      startedAt: params.startedAt,
      questionOrder: params.questionOrder,
      currentIndex: 0,
      answers: {},
      isSubmitted: false,
      finalScore: null,
      isPassed: null,
    }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  setAnswer: (examQuestionId, partial) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [examQuestionId]: {
          examQuestionId,
          selectedOptions: [],
          essayAnswer: '',
          isDoubtful: false,
          answeredAt: new Date().toISOString(),
          ...state.answers[examQuestionId],
          ...partial,
        },
      },
    })),

  toggleDoubtful: (examQuestionId) =>
    set((state) => {
      const current = state.answers[examQuestionId];
      return {
        answers: {
          ...state.answers,
          [examQuestionId]: {
            examQuestionId,
            selectedOptions: [],
            essayAnswer: '',
            answeredAt: null,
            ...current,
            isDoubtful: !current?.isDoubtful,
          },
        },
      };
    }),

  markSubmitted: (score, isPassed) =>
    set({ isSubmitted: true, finalScore: score, isPassed }),

  reset: () => set({ ...DEFAULT }),
}));

// Computed selectors
export const useAnsweredCount = () =>
  useExamSessionStore((s) =>
    s.questionOrder.filter(
      (id) => (s.answers[id]?.selectedOptions?.length ?? 0) > 0 || s.answers[id]?.essayAnswer,
    ).length,
  );

export const useDoubtfulCount = () =>
  useExamSessionStore((s) =>
    s.questionOrder.filter((id) => s.answers[id]?.isDoubtful).length,
  );

export const useRemainingSeconds = () => {
  const startedAt = useExamSessionStore((s) => s.startedAt);
  const durationMinutes = useExamSessionStore((s) => s.durationMinutes);
  if (!startedAt) return null;
  const endMs = new Date(startedAt).getTime() + durationMinutes * 60_000;
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
};
