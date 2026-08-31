import { redirect } from "next/navigation";

export default function ProjectKeywordAnalysisPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/listing-analysis`);
}
