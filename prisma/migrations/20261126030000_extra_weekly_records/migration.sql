CREATE TYPE "ExtraProgram" AS ENUM ('TAHFIZH_INTENSIF', 'TAHSIN_UMMI');
CREATE TYPE "UmmiLevel" AS ENUM (
    'PRA_TAHSIN',
    'JILID_1',
    'JILID_2',
    'JILID_3',
    'JILID_4',
    'JILID_5',
    'JILID_6',
    'GHARIB',
    'TAJWID',
    'AL_QURAN'
);

CREATE TABLE "ExtraWeeklyEntry" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "halaqahId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "program" "ExtraProgram" NOT NULL,
    "targetPages" INTEGER,
    "pagesCompleted" INTEGER,
    "ummiLevel" "UmmiLevel",
    "fromPage" INTEGER,
    "toPage" INTEGER,
    "fluencyGrade" "TahfidzFluencyGrade",
    "note" VARCHAR(500),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExtraWeeklyEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExtraWeeklyEntry_semesterId_halaqahId_studentId_weekStartDate_program_key"
ON "ExtraWeeklyEntry"("semesterId", "halaqahId", "studentId", "weekStartDate", "program");
CREATE INDEX "ExtraWeeklyEntry_semesterId_halaqahId_weekStartDate_program_idx"
ON "ExtraWeeklyEntry"("semesterId", "halaqahId", "weekStartDate", "program");
CREATE INDEX "ExtraWeeklyEntry_studentId_weekStartDate_idx"
ON "ExtraWeeklyEntry"("studentId", "weekStartDate");

ALTER TABLE "ExtraWeeklyEntry"
ADD CONSTRAINT "ExtraWeeklyEntry_academicYearId_semesterId_fkey"
FOREIGN KEY ("academicYearId", "semesterId") REFERENCES "Semester"("academicYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ExtraWeeklyEntry_semesterId_halaqahId_fkey"
FOREIGN KEY ("semesterId", "halaqahId") REFERENCES "Halaqah"("semesterId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ExtraWeeklyEntry_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ExtraWeeklyEntry_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ExtraWeeklyEntry_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ExtraWeeklyEntry_targetPages_positive"
CHECK ("targetPages" IS NULL OR "targetPages" > 0),
ADD CONSTRAINT "ExtraWeeklyEntry_pagesCompleted_nonnegative"
CHECK ("pagesCompleted" IS NULL OR "pagesCompleted" >= 0),
ADD CONSTRAINT "ExtraWeeklyEntry_page_range_positive"
CHECK (("fromPage" IS NULL OR "fromPage" > 0) AND ("toPage" IS NULL OR "toPage" > 0)),
ADD CONSTRAINT "ExtraWeeklyEntry_program_fields_valid"
CHECK (
    ("program" = 'TAHFIZH_INTENSIF' AND "targetPages" IS NOT NULL AND "pagesCompleted" IS NOT NULL
        AND "ummiLevel" IS NULL AND "fromPage" IS NULL AND "toPage" IS NULL AND "fluencyGrade" IS NULL)
    OR
    ("program" = 'TAHSIN_UMMI' AND "targetPages" IS NULL AND "pagesCompleted" IS NULL
        AND "ummiLevel" IS NOT NULL AND "fromPage" IS NOT NULL AND "toPage" IS NOT NULL AND "fluencyGrade" IS NOT NULL)
),
ADD CONSTRAINT "ExtraWeeklyEntry_page_order"
CHECK ("fromPage" IS NULL OR "toPage" >= "fromPage");

ALTER TABLE "ExtraWeeklyEntry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ExtraWeeklyEntry" FROM anon, authenticated;
