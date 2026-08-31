CREATE TABLE "FeedbackFollow" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  CONSTRAINT "FeedbackFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeedbackFollow_userId_requestId_key"
  ON "FeedbackFollow"("userId", "requestId");

ALTER TABLE "FeedbackFollow"
  ADD CONSTRAINT "FeedbackFollow_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "FeedbackFollow"
  ADD CONSTRAINT "FeedbackFollow_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "FeedbackRequest"("id") ON DELETE CASCADE;
