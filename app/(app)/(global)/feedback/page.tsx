import { auth } from "@/auth";
import { FeedbackWall } from "@/components/feedback/feedback-wall";

export default async function FeedbackPage() {
  const session = await auth();
  return (
    <div className="mx-auto max-w-6xl py-2">
      <FeedbackWall loggedIn={Boolean(session?.user?.id)} />
    </div>
  );
}
