CREATE TYPE "PresenceStatus" AS ENUM ('H', 'S', 'I', 'A');
CREATE TYPE "DormActivity" AS ENUM ('PAGI', 'SORE', 'MALAM');

ALTER TABLE "DormJournal"
ADD COLUMN "tahajjudPhotoPath" VARCHAR(500),
ADD COLUMN "presenceSubmittedAt" TIMESTAMP(3),
ADD COLUMN "tahajjudSubmittedAt" TIMESTAMP(3),
ADD COLUMN "pagiSubmittedAt" TIMESTAMP(3),
ADD COLUMN "soreSubmittedAt" TIMESTAMP(3),
ADD COLUMN "malamSubmittedAt" TIMESTAMP(3);

CREATE TABLE "DormDailyPresence" (
    "journalId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "status" "PresenceStatus" NOT NULL,
    "note" VARCHAR(500),
    CONSTRAINT "DormDailyPresence_pkey" PRIMARY KEY ("journalId", "studentId")
);

CREATE TABLE "DormTahajjudAssessment" (
    "journalId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "completed" BOOLEAN NOT NULL,
    CONSTRAINT "DormTahajjudAssessment_pkey" PRIMARY KEY ("journalId", "studentId")
);

CREATE TABLE "DormActivityAttendance" (
    "journalId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "activity" "DormActivity" NOT NULL,
    "status" "PresenceStatus" NOT NULL,
    CONSTRAINT "DormActivityAttendance_pkey" PRIMARY KEY ("journalId", "studentId", "activity")
);

CREATE TABLE "DormWeeklyReview" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "adabSubmittedAt" TIMESTAMP(3),
    "violationsSubmittedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DormWeeklyReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DormWeeklyAdabScore" (
    "reviewId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "haqLinafsih" INTEGER NOT NULL,
    "haqLinafsihNote" VARCHAR(500),
    "haqLisyaikhih" INTEGER NOT NULL,
    "haqLisyaikhihNote" VARCHAR(500),
    "haqLizamilih" INTEGER NOT NULL,
    "haqLizamilihNote" VARCHAR(500),
    "haqLilMakan" INTEGER NOT NULL,
    "haqLilMakanNote" VARCHAR(500),
    "haqLilKitab" INTEGER NOT NULL,
    "haqLilKitabNote" VARCHAR(500),
    "haqLilIlm" INTEGER NOT NULL,
    "haqLilIlmNote" VARCHAR(500),
    CONSTRAINT "DormWeeklyAdabScore_pkey" PRIMARY KEY ("reviewId", "studentId")
);

CREATE TABLE "DormViolation" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "violationType" VARCHAR(160) NOT NULL,
    "repetitions" INTEGER NOT NULL,
    "pointsPerOccurrence" INTEGER NOT NULL,
    CONSTRAINT "DormViolation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DormWeeklyReview_semesterId_roomId_weekStartDate_key"
ON "DormWeeklyReview"("semesterId", "roomId", "weekStartDate");
CREATE UNIQUE INDEX "DormWeeklyReview_id_semesterId_key"
ON "DormWeeklyReview"("id", "semesterId");
CREATE INDEX "DormWeeklyReview_semesterId_weekStartDate_idx"
ON "DormWeeklyReview"("semesterId", "weekStartDate");
CREATE INDEX "DormDailyPresence_studentId_status_idx"
ON "DormDailyPresence"("studentId", "status");
CREATE INDEX "DormActivityAttendance_studentId_activity_status_idx"
ON "DormActivityAttendance"("studentId", "activity", "status");
CREATE INDEX "DormWeeklyAdabScore_studentId_reviewId_idx"
ON "DormWeeklyAdabScore"("studentId", "reviewId");
CREATE INDEX "DormViolation_studentId_reviewId_idx"
ON "DormViolation"("studentId", "reviewId");
CREATE INDEX "DormViolation_reviewId_idx"
ON "DormViolation"("reviewId");

ALTER TABLE "DormDailyPresence"
ADD CONSTRAINT "DormDailyPresence_journalId_fkey"
FOREIGN KEY ("journalId") REFERENCES "DormJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DormDailyPresence_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DormTahajjudAssessment"
ADD CONSTRAINT "DormTahajjudAssessment_journalId_fkey"
FOREIGN KEY ("journalId") REFERENCES "DormJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DormTahajjudAssessment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DormActivityAttendance"
ADD CONSTRAINT "DormActivityAttendance_journalId_fkey"
FOREIGN KEY ("journalId") REFERENCES "DormJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DormActivityAttendance_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DormWeeklyReview"
ADD CONSTRAINT "DormWeeklyReview_academicYearId_semesterId_fkey"
FOREIGN KEY ("academicYearId", "semesterId") REFERENCES "Semester"("academicYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "DormWeeklyReview_semesterId_roomId_fkey"
FOREIGN KEY ("semesterId", "roomId") REFERENCES "Room"("semesterId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "DormWeeklyReview_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "DormWeeklyReview_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DormWeeklyAdabScore"
ADD CONSTRAINT "DormWeeklyAdabScore_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "DormWeeklyReview"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DormWeeklyAdabScore_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "DormWeeklyAdabScore_score_range"
CHECK (
    "haqLinafsih" BETWEEN 1 AND 10 AND
    "haqLisyaikhih" BETWEEN 1 AND 10 AND
    "haqLizamilih" BETWEEN 1 AND 10 AND
    "haqLilMakan" BETWEEN 1 AND 10 AND
    "haqLilKitab" BETWEEN 1 AND 10 AND
    "haqLilIlm" BETWEEN 1 AND 10
);

ALTER TABLE "DormViolation"
ADD CONSTRAINT "DormViolation_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "DormWeeklyReview"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "DormViolation_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "DormViolation_repetitions_positive" CHECK ("repetitions" > 0),
ADD CONSTRAINT "DormViolation_points_nonnegative" CHECK ("pointsPerOccurrence" >= 0);

ALTER TABLE "DormDailyPresence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DormTahajjudAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DormActivityAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DormWeeklyReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DormWeeklyAdabScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DormViolation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "DormDailyPresence", "DormTahajjudAssessment", "DormActivityAttendance",
"DormWeeklyReview", "DormWeeklyAdabScore", "DormViolation" FROM anon, authenticated;
