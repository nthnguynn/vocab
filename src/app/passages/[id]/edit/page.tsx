import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updatePassage, deletePassageAndRedirect } from "@/app/actions";
import PassageForm from "@/components/PassageForm";
import DeleteButton from "@/components/DeleteButton";

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
      <div className="flex flex-wrap items-center justify-between gap-4">
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

        <DeleteButton
          onDelete={deletePassageAndRedirect.bind(null, passage.id)}
          confirmText={`Bạn có chắc muốn xoá vĩnh viễn đoạn văn “${passage.title}”?`}
          label="🗑️ Xoá đoạn văn này"
          className="btn-ghost !px-3 !py-1.5 text-xs hover:!text-berry hover:bg-berry/10"
        />
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
