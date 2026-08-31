import { auth } from "@/auth";
import { db } from "@/server/db";
import { notFound, redirect } from "next/navigation";

export default async function AsinDetailPage({
  params
}: {
  params: { projectId: string; asinId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const trackedAsin = await db.trackedAsin.findFirst({
    where: {
      id: params.asinId,
      projectId: params.projectId,
      project: { userId: session.user.id }
    },
    select: { id: true }
  });

  if (!trackedAsin) {
    notFound();
  }

  redirect(`/projects/${params.projectId}/trends?asinId=${trackedAsin.id}`);
}
