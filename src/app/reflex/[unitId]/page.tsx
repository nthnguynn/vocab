import { connection } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getReflexUnit, getAllCategories } from "@/lib/reflex";
import ReflexPracticeStudio from "@/components/ReflexPracticeStudio";

export async function generateMetadata(props: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await props.params;
  const num = Number(unitId);
  const unit = getReflexUnit(num);
  if (!unit) return { title: "Unit không tồn tại — Vocab" };

  return {
    title: `${unit.title} — Luyện Phản Xạ Vocab`,
    description: `Luyện ${unit.sentencesCount} câu phản xạ viết và nói chủ đề ${unit.engTitle} với audio bản xứ.`,
  };
}

export default async function ReflexUnitPage(props: { params: Promise<{ unitId: string }> }) {
  await connection();
  const { unitId } = await props.params;
  const num = Number(unitId);

  if (isNaN(num) || num < 1) {
    notFound();
  }

  const unit = getReflexUnit(num);
  if (!unit) {
    notFound();
  }

  const categories = getAllCategories(unit.bookId ?? "1500");
  const category = categories.find((c) => c.id === unit.categoryId);

  // Load progress from SQLite
  const progressRows = await prisma.reflexSentenceProgress.findMany({
    where: { unitNumber: num },
  });

  const initialProgress = progressRows.map((r: { orderNumber: number; isBookmarked: boolean; timesPracticed: number; lastScore: number | null }) => ({
    orderNumber: r.orderNumber,
    isBookmarked: r.isBookmarked,
    timesPracticed: r.timesPracticed,
    lastScore: r.lastScore,
  }));

  return (
    <ReflexPracticeStudio
      unit={unit}
      initialProgress={initialProgress}
      categoryName={category?.name}
    />
  );
}
