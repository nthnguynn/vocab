import datasetRaw from "@/data/reflex-dataset.json";

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

export interface ReflexDataset {
  categories: ReflexCategory[];
  units: ReflexUnit[];
}

export const reflexDataset: ReflexDataset = datasetRaw as unknown as ReflexDataset;

export function getAllCategories(): ReflexCategory[] {
  return reflexDataset.categories;
}

export function getAllUnits(): ReflexUnit[] {
  return reflexDataset.units;
}

export function getReflexUnit(unitNumber: number): ReflexUnit | null {
  return reflexDataset.units.find((u) => u.unitNumber === unitNumber) ?? null;
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

  // Thuật toán so khớp tuần tự từ
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
        // Kiểm tra xem từ kế tiếp có khớp không
        const nextMatchInTyp = cleanTyp.indexOf(expClean, typIdx);
        const nextMatchInExp = cleanExp.indexOf(typClean, i);

        if (nextMatchInTyp !== -1 && nextMatchInTyp - typIdx <= 2) {
          // Người dùng gõ thừa từ
          while (typIdx < nextMatchInTyp) {
            resultWords.push({ word: typTokens[typIdx], status: "extra", typed: typTokens[typIdx] });
            typIdx++;
          }
          resultWords.push({ word: expRaw, status: "correct" });
          correctCount++;
          typIdx++;
        } else if (nextMatchInExp !== -1 && nextMatchInExp - i <= 2) {
          // Người dùng bỏ sót từ
          resultWords.push({ word: expRaw, status: "missing", expected: expRaw });
        } else {
          // Từ sai
          resultWords.push({ word: expRaw, status: "wrong", expected: expRaw, typed: typRaw });
          typIdx++;
        }
      }
    } else {
      resultWords.push({ word: expRaw, status: "missing", expected: expRaw });
    }
  }

  // Các từ thừa còn lại nếu có
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
    isPass: accuracy >= 70, // 70% khớp từ là đạt yêu cầu phản xạ nói
  };
}
