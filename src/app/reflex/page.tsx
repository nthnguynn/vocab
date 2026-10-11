import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllCategories, getAllUnits } from "@/lib/reflex";
import ReflexHubClient from "./ReflexHubClient";

export const metadata = {
  title: "Luyện Phản Xạ Viết - Nói — Vocab",
  description: "Bộ 1.500 câu phản xạ viết và nói chia theo 50 chủ đề thiết thực với audio người bản xứ.",
};

export default async function ReflexPage() {
  await connection();

  const categories = getAllCategories();
  const units = getAllUnits();

  // Load progress from Prisma SQLite
  const [progressRows, totalPracticedSentences, totalBookmarkedSentences] = await Promise.all([
    prisma.reflexSentenceProgress.findMany(),
    prisma.reflexSentenceProgress.count({
      where: { timesPracticed: { gt: 0 } },
    }),
    prisma.reflexSentenceProgress.count({
      where: { isBookmarked: true },
    }),
  ]);

  // Aggregate progress map by unitNumber
  const progressMap: Record<
    number,
    {
      unitNumber: number;
      completedCount: number;
      bookmarkedCount: number;
      lastPracticedAt: string | null;
      bestScore: number | null;
    }
  > = {};

  for (const row of progressRows) {
    if (!progressMap[row.unitNumber]) {
      progressMap[row.unitNumber] = {
        unitNumber: row.unitNumber,
        completedCount: 0,
        bookmarkedCount: 0,
        lastPracticedAt: null,
        bestScore: null,
      };
    }
    const item = progressMap[row.unitNumber];
    if (row.timesPracticed > 0) {
      item.completedCount += 1;
    }
    if (row.isBookmarked) {
      item.bookmarkedCount += 1;
    }
    if (row.lastScore !== null) {
      item.bestScore = Math.max(item.bestScore ?? 0, row.lastScore);
    }
    if (row.lastPracticedAt) {
      if (!item.lastPracticedAt || new Date(row.lastPracticedAt) > new Date(item.lastPracticedAt)) {
        item.lastPracticedAt = row.lastPracticedAt.toISOString();
      }
    }
  }

  return (
    <ReflexHubClient
      categories={categories}
      units={units}
      progressMap={progressMap}
      totalPracticedSentences={totalPracticedSentences}
      totalBookmarkedSentences={totalBookmarkedSentences}
    />
  );
}
