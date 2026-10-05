import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updatePassage } from "@/app/actions";
import PassageForm from "@/components/PassageForm";

export default async function EditPassagePage(props: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await props.params;
  const passageId = Number(id);

  if (isNaN(passageId)) {
    notFound();
  }

  const [passage, topics] = await Promise.all([
    prisma.passage.findUnique({ where: { id: passageId } }),
    prisma.topic.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, emoji: true },
    }),
  ]);

  if (!passage) {
    notFound();
  }

  const boundAction = updatePassage.bind(null, passage.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/passages/${passage.id}`}
          className="inline-flex size-9 items-center justify-center rounded-full bg-petal-100 text-petal-700 transition hover:bg-petal-200"
          title="Quay lại bài học"
        >
          ←
        </Link>
        <div>
          <h1 className="h-display text-2xl sm:text-3xl">Chỉnh sửa đoạn văn ✏️</h1>
          <p className="mt-0.5 text-xs text-muted">
            Cập nhật nội dung hoặc bản dịch cho “{passage.title}”.
          </p>
        </div>
      </div>

      <div className="card">
        <PassageForm
          action={boundAction}
          topics={topics}
          initialData={{
            id: passage.id,
            title: passage.title,
            content: passage.content,
            translation: passage.translation,
            level: passage.level,
            tags: passage.tags,
            topicId: passage.topicId,
          }}
        />
      </div>
    </div>
  );
}
