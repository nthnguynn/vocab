import { connection } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PassagePracticeStudio from "@/components/PassagePracticeStudio";

export default async function PassageDetailPage(props: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await props.params;
  const passageId = Number(id);

  if (isNaN(passageId)) {
    notFound();
  }

  const passage = await prisma.passage.findUnique({
    where: { id: passageId },
    include: {
      topic: { select: { id: true, name: true, emoji: true } },
    },
  });

  if (!passage) {
    notFound();
  }

  return <PassagePracticeStudio passage={passage} />;
}
