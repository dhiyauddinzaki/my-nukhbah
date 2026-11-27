CREATE TABLE "DormAchievement" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DormAchievement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DormAchievement_reviewId_studentId_idx"
ON "DormAchievement"("reviewId", "studentId");
CREATE INDEX "DormAchievement_studentId_createdAt_idx"
ON "DormAchievement"("studentId", "createdAt");

ALTER TABLE "DormAchievement"
ADD CONSTRAINT "DormAchievement_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "DormWeeklyReview"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DormAchievement_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DormAchievement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "DormAchievement" FROM anon, authenticated;
