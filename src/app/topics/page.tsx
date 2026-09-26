import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import TopicForm from "@/components/TopicForm";

export default async function TopicsPage() {
  await connection();
  const topics = await prisma.topic.findMany({
    orderBy: { createdAt: "asc" },
    include: { words: { select: { stage: true, nextReviewAt: true } } },
  });
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-display text-3xl">Chủ đề 🌷</h1>
        <p className="mt-1 text-muted">Học từ vựng theo từng chủ đề — mỗi chủ đề có flashcard và bài test riêng.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {topics.map((t) => {
            const mastered = t.words.filter((w) => w.stage >= 3).length;
            const due = t.words.filter((w) => w.nextReviewAt <= now).length;
            const pct = t.words.length ? Math.round((mastered / t.words.length) * 100) : 0;
            return (
              <div key={t.id} className="card flex flex-col transition hover:-translate-y-1 hover:shadow-pop">
                <Link href={`/topics/${t.id}`} className="flex items-center gap-4">
                  <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-petal-100 to-petal-200 text-3xl">{t.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold">{t.name}</p>
                    <p className="text-sm text-muted">
                      {t.words.length} từ · {due} từ cần ôn
                    </p>
                  </div>
                  <Ring pct={pct} />
                </Link>
                <div className="mt-5 flex gap-2">
                  <Link href={`/review?topic=${t.id}`} className="btn-soft flex-1 !px-3">🃏 Flashcard</Link>
                  <Link href={`/test?topic=${t.id}`} className="btn-soft flex-1 !px-3">✍️ Test</Link>
                </div>
              </div>
            );
          })}
          {topics.length === 0 && (
            <div className="card col-span-full text-center text-muted">Chưa có chủ đề nào. Tạo chủ đề đầu tiên nhé!</div>
          )}
        </div>

        <aside className="card h-fit lg:sticky lg:top-24">
          <h2 className="h-display text-lg">Tạo chủ đề mới</h2>
          <p className="mb-4 text-sm text-muted">Chọn biểu tượng và đặt tên cho chủ đề.</p>
          <TopicForm />
        </aside>
      </div>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-12 shrink-0 place-items-center" title={`Đã thuộc ${pct}%`}>
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" className="stroke-petal-100" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="stroke-petal-500"
        />
      </svg>
      <span className="text-[11px] font-bold text-petal-700">{pct}%</span>
    </div>
  );
}
