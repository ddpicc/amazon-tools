import { redirect } from "next/navigation";

export default function ProjectDiagnosisPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/listing-analysis`);
}
