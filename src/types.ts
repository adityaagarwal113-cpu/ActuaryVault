export type ExamBodyType = "IFOA" | "IAI";

export type SubjectType =
  | "CM1"
  | "CM2"
  | "CS1"
  | "CS2"
  | "CB1"
  | "CB2"
  | "CP1"
  | "CP2"
  | "CP3"
  | "SP"
  | "SA";

export type DifficultyType = "Easy" | "Medium" | "Hard";

export interface Question {
  questionId: string;
  examBody: ExamBodyType;
  subject: string; // e.g. "CM1", "SP5", "CP1"
  chapter: string;
  topic: string;
  difficulty: DifficultyType;
  marks: number;
  commandWord: string; // e.g. "Discuss", "Calculate", "Explain"
  question: string;
  rephrasedQuestion?: string;
  officialAnswer?: string;
  markScheme?: string;
  examinerReport?: string;
  aiSolution?: string;
  keyPoints?: string;
  commonMistakes?: string;
  source?: string;
  uploadDate: string; // ISO date string
  confidenceScore?: number;
  status: "approved" | "pending" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  term?: string; // e.g. "Nov 2025" or "Apr 2025"
}

export interface Favorite {
  favoriteId: string;
  userId: string;
  questionId: string;
  createdAt: string;
}

export type StudyModeType = "chapter-wise" | "mixed" | "past-papers";
