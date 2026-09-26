import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWord, deleteTopic } from "@/app/actions";
import WordForm from "@/components/WordForm";
import WordTable from "@/components/WordTable";
import DeleteButton from "@/components/DeleteButton";

export default async function TopicDetail(props: PageProps<"/topics/[id]">) {
  await connection();
  const { id } = await props.params;
  const topicId = Number(id);
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { words: { orderBy: { createdAt: "desc" } } },
  });
  if (!topic) notFound();
  const topics = await prisma.topic.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, emoji: true } });

  return (
    <div className="space-y-6">
      <Link href="/topics" className="btn-ghost -ml-3">← Tất cả chủ đề</Link>

      <section className="card flex flex-col gap-5 !p-7 sm:flex-row sm:items-center">
        <span className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-petal-100 to-petal-300 text-5xl shadow-soft">{topic.emoji}</span>
        <div className="flex-1">
          <h1 className="h-display text-3xl">{topic.name}</h1>
          <p className="text-muted">{topic.words.length} từ vựng</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/review?topic=${topic.id}`} className="btn">🃏 Học flashcard</Link>
          <Link href={`/test?topic=${topic.id}`} className="btn-soft">✍️ Làm test</Link>
          <DeleteButton
            onDelete={deleteTopic.bind(null, topic.id)}
            confirmText={`Xoá chủ đề “${topic.name}” và toàn bộ ${topic.words.length} từ bên trong?`}
            label="Xoá chủ đề"
          />
        </div>
      </section>

      <section className="card">
        <h2 className="h-display mb-4 text-lg">＋ Thêm từ vào “{topic.name}”</h2>
        <WordForm action={createWord} topics={topics} initial={{ topicId: topic.id }} compact />
      </section>

      <WordTable words={topic.words.map((w) => ({ ...w, topic: { id: topic.id, name: topic.name, emoji: topic.emoji } }))} showTopic={false} />
    </div>
  );
}
