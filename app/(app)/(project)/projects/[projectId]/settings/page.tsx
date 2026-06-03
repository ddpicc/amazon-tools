import { auth } from "@/auth";
import { ProjectSettingsPanel } from "@/components/projects/project-settings-panel";
import { db } from "@/server/db";
import { ensureProjectNotificationChannels } from "@/server/services/notification-channels";

export default async function ProjectSettingsPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await db.project.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      marketplace: true,
      notificationEmail: true,
      notificationChannels: { orderBy: { createdAt: "asc" } }
    }
  });
  if (!project) return null;

  const channels = await ensureProjectNotificationChannels(project.id, project.notificationEmail);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <ProjectSettingsPanel
        projectId={project.id}
        projectName={project.name}
        marketplace={project.marketplace}
        channels={channels}
      />
    </div>
  );
}
