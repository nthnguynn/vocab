import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllUnits, type ReflexSentence, type ReflexUnit } from "@/lib/reflex";
import ReflexPracticeStudio from "@/components/ReflexPracticeStudio";

export const metadata = {
  title: "Thử Thách Phản Xạ Ngẫu Nhiên — Vocab",
  description: "Luyện ngẫu nhiên 30 câu phản xạ tổng hợp từ toàn bộ 50 chủ đề.",
};

export default async function ReflexMixedPage() {
  await connection();
  const allUnits = getAllUnits();

  // Collect all sentences across 50 units
  const allSentences: (ReflexSentence & { unitNumber: number })[] = [];
  for (const u of allUnits) {
    for (const s of u.sentences) {
      allSentences.push({
        ...s,
        unitNumber: u.unitNumber,
      });
    }
  }

  // Shuffle and pick 30 random sentences
  const shuffled = allSentences.sort(() => Math.random() - 0.5).slice(0, 30);
  const renumbered: ReflexSentence[] = shuffled.map((s, idx) => ({
    order: idx + 1,
    vi: s.vi,
    en: s.en,
    hints: s.hints,
  }));

  const customUnit: ReflexUnit = {
    unitNumber: 0,
    title: "🎲 Thử Thách Phản Xạ Ngẫu Nhiên",
    engTitle: "Mixed Reflex Challenge",
    viTitle: "30 câu tổng hợp ngẫu nhiên từ 50 Unit",
    categoryId: 0,
    sentencesCount: renumbered.length,
    sentences: renumbered,
  };

  return (
    <ReflexPracticeStudio
      unit={customUnit}
      initialProgress={[]}
      categoryName="Thử thách tổng hợp"
      isCustomSet={true}
    />
  );
}
