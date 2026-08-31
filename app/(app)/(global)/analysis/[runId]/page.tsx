import { auth } from "@/auth";
import { AnalysisRunDetail } from "@/components/analysis/analysis-run-detail";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import { ReviewInsightsResult } from "@/components/analysis/review-insights-result";
import { ListingDiagnosisResult } from "@/components/analysis/listing-diagnosis-result";
import { KeywordResearchResult } from "@/components/analysis/keyword-research-result";

export default async function AnalysisRunPage({ params }: { params: { runId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [run, projects] = await Promise.all([db.analysisRun.findFirst({ where: { id: params.runId, userId: session.user.id }, select: { id: true, toolKey: true, analysisType: true, marketplace: true, status: true, requestedAt: true, sourceAsOf: true, provider: true, errorCode: true, errorMessage: true, attemptCount: true, projectId: true, resultJson: true } }), db.project.findMany({ where: { userId: session.user.id }, select: { id: true, name: true, marketplace: true }, orderBy: { name: "asc" } })]);
  if (!run) notFound();
  const reviewResult = run.analysisType === "REVIEW_INSIGHTS" && run.resultJson && typeof run.resultJson === "object" && !Array.isArray(run.resultJson) ? run.resultJson as Record<string, unknown> : null;
  const diagnosisResult = run.analysisType === "LISTING_DIAGNOSIS" && run.resultJson && typeof run.resultJson === "object" && !Array.isArray(run.resultJson) ? run.resultJson as Record<string, unknown> : null;
  const keywordResult = run.analysisType === "KEYWORD_RESEARCH" && run.resultJson && typeof run.resultJson === "object" && !Array.isArray(run.resultJson) ? run.resultJson as Record<string, unknown> : null;
  return <>{reviewResult ? <div className="mx-auto max-w-4xl pt-8"><ReviewInsightsResult result={reviewResult} /></div> : null}{diagnosisResult ? <div className="pt-8"><ListingDiagnosisResult result={diagnosisResult} /></div> : null}{keywordResult ? <div className="pt-8"><KeywordResearchResult result={keywordResult} /></div> : null}<AnalysisRunDetail run={run} projects={projects} /></>;
}
