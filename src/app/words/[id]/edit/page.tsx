import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWord } from "@/app/actions";
import WordForm from "@/components/WordForm";

export default async function EditWordPage(props: PageProps<"/words/[id]/edit">) {
  await connection();
  const { id } = await props.params;
  const [word, topics] = await Promise.all([
    prisma.word.findUnique({ where: { id: Number(id) } }),
    prisma.topic.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, emoji: true } }),
  ]);
  if (!word) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/topics/${word.topicId}`} className="btn-ghost -ml-3">← Quay lại</Link>
      <section className="card !p-7">
        <h1 className="h-display mb-6 text-2xl">Sửa từ “{word.word}” ✏️</h1>
        <WordForm action={updateWord.bind(null, word.id)} topics={topics} initial={word} submitLabel="Lưu thay đổi" />
      </section>
    </div>
  );
}
