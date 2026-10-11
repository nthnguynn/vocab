import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAllUnits, type ReflexSentence, type ReflexUnit } from "@/lib/reflex";
import ReflexPracticeStudio from "@/components/ReflexPracticeStudio";

export const metadata = {
  title: "Câu Phản Xạ Đã Đánh Dấu — Vocab",
  description: "Luyện các câu phản xạ khó đã được đánh dấu sao để ghi nhớ sâu.",
};

export default async function ReflexBookmarkedPage() {
  await connection();

  const bookmarkedRows = await prisma.reflexSentenceProgress.findMany({
    where: { isBookmarked: true },
  });

  if (bookmarkedRows.length === 0) {
    return (
      <div className="card mx-auto max-w-lg text-center !p-10">
        <div className="text-5xl mb-3">⭐</div>
        <h2 className="h-display text-2xl font-bold text-slate-800">
          Chưa có câu nào được đánh dấu
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Khi đang luyện tập bất kỳ Unit nào, bạn có thể bấm biểu tượng ngôi sao ⭐ trên mỗi câu để gom các câu khó vào danh sách này và ôn tập riêng.
        </p>
        <Link href="/reflex" className="btn mt-6 inline-flex">
          📋 Khám phá 50 Unit Phản Xạ
        </Link>
      </div>
    );
  }

  const allUnits = getAllUnits();
  const bookmarkedSentences: ReflexSentence[] = [];

  for (const b of bookmarkedRows) {
    const u = allUnits.find((x) => x.unitNumber === b.unitNumber);
    if (u) {
      const s = u.sentences.find((x) => x.order === b.orderNumber);
      if (s) {
        bookmarkedSentences.push({
          order: bookmarkedSentences.length + 1,
          vi: `[U${b.unitNumber}] ${s.vi}`,
          en: s.en,
          hints: s.hints,
        });
      }
    }
  }

  const customUnit: ReflexUnit = {
    unitNumber: 0,
    title: "⭐ Các Câu Phản Xạ Đã Đánh Dấu",
    engTitle: "Bookmarked Sentences",
    viTitle: `${bookmarkedSentences.length} câu cần ôn tập kỹ`,
    categoryId: 0,
    sentencesCount: bookmarkedSentences.length,
    sentences: bookmarkedSentences,
  };

  const initialProgress = bookmarkedSentences.map((s) => ({
    orderNumber: s.order,
    isBookmarked: true,
    timesPracticed: 1,
    lastScore: null,
  }));

  return (
    <ReflexPracticeStudio
      unit={customUnit}
      initialProgress={initialProgress}
      categoryName="Câu khó đã đánh dấu"
      isCustomSet={true}
    />
  );
}
