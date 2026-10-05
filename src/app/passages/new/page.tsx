import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createPassage } from "@/app/actions";
import PassageForm from "@/components/PassageForm";

export default async function NewPassagePage() {
  await connection();
  const topics = await prisma.topic.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, emoji: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/passages"
          className="inline-flex size-9 items-center justify-center rounded-full bg-petal-100 text-petal-700 transition hover:bg-petal-200"
          title="Quay lại danh sách"
        >
          ←
        </Link>
        <div>
          <h1 className="h-display text-2xl sm:text-3xl">Thêm đoạn văn mới 🌸</h1>
          <p className="mt-0.5 text-xs text-muted">
            Tạo đoạn văn tiếng Anh để bắt đầu hành trình luyện học thuộc.
          </p>
        </div>
      </div>

      <div className="card">
        <PassageForm action={createPassage} topics={topics} />
      </div>
    </div>
  );
}
