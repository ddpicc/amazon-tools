CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "trackedAsinId" TEXT NOT NULL,
    "externalReviewId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "reviewerName" TEXT,
    "isVerified" BOOLEAN,
    "reviewDate" TIMESTAMP(3),
    "helpfulCount" INTEGER,
    "imageUrls" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB,
    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductReview_trackedAsinId_externalReviewId_key" ON "ProductReview"("trackedAsinId", "externalReviewId");
CREATE INDEX "ProductReview_trackedAsinId_rating_reviewDate_idx" ON "ProductReview"("trackedAsinId", "rating", "reviewDate" DESC);
CREATE INDEX "ProductReview_trackedAsinId_firstSeenAt_idx" ON "ProductReview"("trackedAsinId", "firstSeenAt" DESC);
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_trackedAsinId_fkey" FOREIGN KEY ("trackedAsinId") REFERENCES "TrackedAsin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
