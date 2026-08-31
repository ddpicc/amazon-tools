import { redirect } from "next/navigation";

export default function LegacyCompetitorPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/trends`);
}
