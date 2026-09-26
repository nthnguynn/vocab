import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { topicIds } from "@/lib/params";
import TopicPicker from "@/components/TopicPicker";
import { addDays, parseDayKey, startOfDay } from "@/lib/dates";
import Flashcards from "@/components/Flashcards";
import type { Prisma } from "@/generated/prisma/client";

export default async function ReviewPage(props: PageProps<"/review">) {
  await connection();
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const selectedTopics = topicIds(sp);
  const from = parseDayKey(one("from"));
  const to = parseDayKey(one("to"));
  // Mặc định (không lọc gì) = ôn các từ đến hạn
  const mode = one("mode") ?? (selectedTopics.length || from || to ? "all" : "due");

  const where: Prisma.WordWhereInput = {
    ...(selectedTopics.length && { topicId: { in: selectedTopics } }),
    ...((from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lt: addDays(to, 1) }) } }),
    ...(mode === "due" && { nextReviewAt: { lt: addDays(startOfDay(), 1) } }),
  };

  const [topics, words] = await Promise.all([
    prisma.topic.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, emoji: true } }),
    prisma.word.findMany({ where, include: { topic: true }, orderBy: [{ nextReviewAt: "asc" }, { createdAt: "asc" }] }),
  ]);

  const cards = words.map((w) => ({
    id: w.id,
    word: w.word,
    meaning: w.meaning,
    type: w.type,
    example: w.example,
    definition: w.definition,
    topic: `${w.topic.emoji} ${w.topic.name}`,
  }));
  const key = JSON.stringify({ topics: selectedTopics, from: one("from"), to: one("to"), mode });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-display text-3xl">Ôn tập 🔁</h1>
        <p className="mt-1 text-muted">
          Lật thẻ, tự kiểm tra trí nhớ. Nhớ rồi → thẻ quay lại sau 2, 4, 7… ngày; chưa nhớ → ôn lại ngày mai.
        </p>
      </div>

      <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end">
        <div className="sm:col-span-2 lg:col-span-full">
          <TopicPicker topics={topics} selected={selectedTopics} />
        </div>
        <div>
          <label className="label" htmlFor="from">Từ ngày</label>
          <input id="from" type="date" name="from" defaultValue={one("from")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="to">Đến ngày</label>
          <input id="to" type="date" name="to" defaultValue={one("to")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="mode">Chế độ</label>
          <select id="mode" name="mode" defaultValue={mode} className="input">
            <option value="due">Chỉ từ đến hạn ôn</option>
            <option value="all">Tất cả từ</option>
          </select>
        </div>
        <button className="btn">Bắt đầu</button>
      </form>

      {cards.length ? (
        <Flashcards key={key} cards={cards} />
      ) : (
        <div className="card mx-auto max-w-xl !p-10 text-center">
          <p className="text-5xl">🌸</p>
          <h2 className="h-display mt-3 text-xl">
            {mode === "due" ? "Không còn từ nào đến hạn ôn!" : "Không có từ nào khớp bộ lọc"}
          </h2>
          <p className="mt-1 text-muted">Bạn có thể ôn toàn bộ hoặc thêm từ mới.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href={`/review?mode=all${selectedTopics.map((t) => `&topic=${t}`).join("")}`} className="btn">Ôn tất cả</Link>
            <Link href="/words" className="btn-soft">＋ Thêm từ</Link>
          </div>
        </div>
      )}
    </div>
  );
}
