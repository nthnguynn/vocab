import dataset1500Raw from "@/data/reflex-dataset.json";
import dataset1000Raw from "@/data/reflex-1000-dataset.json";

export interface ReflexSentence {
  order: number;
  vi: string;
  en: string;
  hints: string[];
}

export interface ReflexCollocationTable {
  title: string;
  rows: string[][];
}

export interface ReflexExtraVocab {
  word: string;
  meaning: string;
}

export interface ReflexUnit {
  unitNumber: number;
  topicIndex?: number;
  bookId?: "1500" | "1000";
  title: string;
  engTitle: string;
  viTitle: string | null;
  categoryId: number;
  sentencesCount: number;
  sentences: ReflexSentence[];
  extraVocab?: ReflexExtraVocab[];
  collocations?: ReflexCollocationTable[];
}

export interface ReflexCategory {
  id: number;
  name: string;
  icon: string;
  units: number[];
}

export interface ReflexBook {
  id: "1500" | "1000";
  title: string;
  subtitle: string;
  totalSentences: number;
  totalUnits: number;
  icon: string;
  badge: string;
}

export const REFLEX_BOOKS: ReflexBook[] = [
  {
    id: "1500",
    title: "1.500 Câu Phản Xạ Viết - Nói",
    subtitle: "50 Unit giao tiếp cơ bản đến nâng cao (Có audio)",
    totalSentences: 1500,
    totalUnits: 50,
    icon: "🌸",
    badge: "50 Unit · Có Audio",
  },
  {
    id: "1000",
    title: "1.000 Câu Giao Tiếp Thực Tế",
    subtitle: "40 Chủ đề đời sống, du lịch, đi làm & thi cử",
    totalSentences: 1000,
    totalUnits: 40,
    icon: "📘",
    badge: "40 Chủ đề · 4 Phần",
  },
];

const data1500 = dataset1500Raw as unknown as { categories: ReflexCategory[]; units: ReflexUnit[] };
const data1000 = dataset1000Raw as unknown as { categories: ReflexCategory[]; units: ReflexUnit[] };

// Add bookId markers
const units1500: ReflexUnit[] = data1500.units.map((u) => ({ ...u, bookId: "1500", topicIndex: u.unitNumber }));
const units1000: ReflexUnit[] = data1000.units.map((u, idx) => ({ ...u, bookId: "1000", topicIndex: idx + 1 }));

export function getBookById(id: "1500" | "1000"): ReflexBook {
  return REFLEX_BOOKS.find((b) => b.id === id) || REFLEX_BOOKS[0];
}

export function getAllCategories(bookId: "1500" | "1000" = "1500"): ReflexCategory[] {
  return bookId === "1000" ? data1000.categories : data1500.categories;
}

export function getAllUnits(bookId?: "1500" | "1000"): ReflexUnit[] {
  if (bookId === "1500") return units1500;
  if (bookId === "1000") return units1000;
  return [...units1500, ...units1000];
}

export function getReflexUnit(unitNumber: number): ReflexUnit | null {
  if (unitNumber > 100) {
    return units1000.find((u) => u.unitNumber === unitNumber) ?? null;
  }
  return units1500.find((u) => u.unitNumber === unitNumber) ?? null;
}

export function getBookForUnit(unitNumber: number): ReflexBook {
  return unitNumber > 100 ? REFLEX_BOOKS[1] : REFLEX_BOOKS[0];
}

/**
 * Chuẩn hóa chuỗi để so sánh (bỏ dấu câu, chuyển chữ thường, bỏ khoảng trắng thừa)
 */
export function normalizeSentence(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface DiffWord {
  word: string;
  status: "correct" | "wrong" | "missing" | "extra";
  expected?: string;
  typed?: string;
}

/**
 * Tính chi tiết từng từ giữa đáp án mẫu (expected) và câu người dùng gõ (typed)
 */
export function calculateSentenceDiff(
  expected: string,
  typed: string
): {
  words: DiffWord[];
  accuracy: number;
  isCorrect: boolean;
} {
  const normExpected = normalizeSentence(expected);
  const normTyped = normalizeSentence(typed);

  if (normExpected === normTyped) {
    const rawTokens = expected.split(/\s+/).filter(Boolean);
    return {
      words: rawTokens.map((w) => ({ word: w, status: "correct" })),
      accuracy: 100,
      isCorrect: true,
    };
  }

  const expTokens = expected.split(/\s+/).filter(Boolean);
  const typTokens = typed.split(/\s+/).filter(Boolean);

  const cleanExp = expTokens.map((w) => normalizeSentence(w));
  const cleanTyp = typTokens.map((w) => normalizeSentence(w));

  const resultWords: DiffWord[] = [];
  let correctCount = 0;

  let typIdx = 0;
  for (let i = 0; i < expTokens.length; i++) {
    const expClean = cleanExp[i];
    const expRaw = expTokens[i];

    if (typIdx < typTokens.length) {
      const typClean = cleanTyp[typIdx];
      const typRaw = typTokens[typIdx];

      if (expClean === typClean) {
        resultWords.push({ word: expRaw, status: "correct" });
        correctCount++;
        typIdx++;
      } else {
        const nextMatchInTyp = cleanTyp.indexOf(expClean, typIdx);
        const nextMatchInExp = cleanExp.indexOf(typClean, i);

        if (nextMatchInTyp !== -1 && nextMatchInTyp - typIdx <= 2) {
          while (typIdx < nextMatchInTyp) {
            resultWords.push({ word: typTokens[typIdx], status: "extra", typed: typTokens[typIdx] });
            typIdx++;
          }
          resultWords.push({ word: expRaw, status: "correct" });
          correctCount++;
          typIdx++;
        } else if (nextMatchInExp !== -1 && nextMatchInExp - i <= 2) {
          resultWords.push({ word: expRaw, status: "missing", expected: expRaw });
        } else {
          resultWords.push({ word: expRaw, status: "wrong", expected: expRaw, typed: typRaw });
          typIdx++;
        }
      }
    } else {
      resultWords.push({ word: expRaw, status: "missing", expected: expRaw });
    }
  }

  while (typIdx < typTokens.length) {
    resultWords.push({ word: typTokens[typIdx], status: "extra", typed: typTokens[typIdx] });
    typIdx++;
  }

  const accuracy = Math.max(0, Math.min(100, Math.round((correctCount / Math.max(1, expTokens.length)) * 100)));
  const isCorrect = accuracy >= 95;

  return { words: resultWords, accuracy, isCorrect };
}

/**
 * So sánh phát âm nhận diện từ Web Speech API với câu mẫu
 */
export function calculateSpeechAccuracy(expected: string, spoken: string): { accuracy: number; isPass: boolean } {
  const normExpectedWords = normalizeSentence(expected).split(/\s+/).filter(Boolean);
  const normSpokenWords = normalizeSentence(spoken).split(/\s+/).filter(Boolean);

  if (normExpectedWords.length === 0) return { accuracy: 100, isPass: true };

  let matched = 0;
  for (const expW of normExpectedWords) {
    if (normSpokenWords.includes(expW)) {
      matched++;
    }
  }

  const accuracy = Math.round((matched / normExpectedWords.length) * 100);
  return {
    accuracy,
    isPass: accuracy >= 70,
  };
}
