CREATE TYPE "IntensiveEntryType" AS ENUM ('ZIYADAH', 'MURAJAAH', 'TASMI');
CREATE TYPE "UmmiStage" AS ENUM ('JILID_1', 'JILID_2', 'JILID_3', 'GHARIB', 'TAJWID', 'AL_QURAN');
CREATE TYPE "UmmiEntryType" AS ENUM ('LEARNING', 'EXAM');

CREATE TABLE "ExtraHalaqah" (
    "id" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "program" "ExtraProgram" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "teacherId" UUID NOT NULL,
    CONSTRAINT "ExtraHalaqah_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExtraStudentAssignment" (
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "program" "ExtraProgram" NOT NULL,
    "groupId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    CONSTRAINT "ExtraStudentAssignment_pkey" PRIMARY KEY ("semesterId", "studentId")
);

CREATE TABLE "TahfizhIntensiveEntry" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "program" "ExtraProgram" NOT NULL DEFAULT 'TAHFIZH_INTENSIF',
    "groupId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "type" "IntensiveEntryType" NOT NULL,
    "pagesCompleted" INTEGER,
    "juzNumber" INTEGER,
    "fromPage" INTEGER,
    "toPage" INTEGER,
    "isMurajaahWeek" BOOLEAN NOT NULL DEFAULT false,
    "jadid" BOOLEAN,
    "qadim" BOOLEAN,
    "note" VARCHAR(500),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TahfizhIntensiveEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TasmiJuzScore" (
    "id" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "juzNumber" INTEGER NOT NULL,
    "grade" "TahfidzFluencyGrade" NOT NULL,
    CONSTRAINT "TasmiJuzScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UmmiWeeklyEntry" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "program" "ExtraProgram" NOT NULL DEFAULT 'TAHSIN_UMMI',
    "groupId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "type" "UmmiEntryType" NOT NULL,
    "stage" "UmmiStage",
    "fromPage" INTEGER,
    "toPage" INTEGER,
    "grade" "TahfidzFluencyGrade",
    "note" VARCHAR(500),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UmmiWeeklyEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExtraHalaqah_semesterId_program_name_key"
ON "ExtraHalaqah"("semesterId", "program", "name");
CREATE UNIQUE INDEX "ExtraHalaqah_semesterId_id_key"
ON "ExtraHalaqah"("semesterId", "id");
CREATE UNIQUE INDEX "ExtraHalaqah_semesterId_program_id_key"
ON "ExtraHalaqah"("semesterId", "program", "id");
CREATE UNIQUE INDEX "ExtraHalaqah_semesterId_program_teacherId_key"
ON "ExtraHalaqah"("semesterId", "program", "teacherId");
CREATE INDEX "ExtraHalaqah_teacherId_semesterId_program_idx"
ON "ExtraHalaqah"("teacherId", "semesterId", "program");
CREATE INDEX "ExtraStudentAssignment_semesterId_program_groupId_idx"
ON "ExtraStudentAssignment"("semesterId", "program", "groupId");
CREATE INDEX "ExtraStudentAssignment_studentId_semesterId_idx"
ON "ExtraStudentAssignment"("studentId", "semesterId");
CREATE UNIQUE INDEX "TahfizhIntensiveEntry_semesterId_groupId_studentId_weekStartDate_type_key"
ON "TahfizhIntensiveEntry"("semesterId", "groupId", "studentId", "weekStartDate", "type");
CREATE INDEX "TahfizhIntensiveEntry_semesterId_groupId_weekStartDate_type_idx"
ON "TahfizhIntensiveEntry"("semesterId", "groupId", "weekStartDate", "type");
CREATE INDEX "TahfizhIntensiveEntry_studentId_weekStartDate_idx"
ON "TahfizhIntensiveEntry"("studentId", "weekStartDate");
CREATE UNIQUE INDEX "TasmiJuzScore_entryId_juzNumber_key"
ON "TasmiJuzScore"("entryId", "juzNumber");
CREATE UNIQUE INDEX "UmmiWeeklyEntry_semesterId_groupId_studentId_weekStartDate_type_key"
ON "UmmiWeeklyEntry"("semesterId", "groupId", "studentId", "weekStartDate", "type");
CREATE INDEX "UmmiWeeklyEntry_semesterId_groupId_weekStartDate_type_idx"
ON "UmmiWeeklyEntry"("semesterId", "groupId", "weekStartDate", "type");
CREATE INDEX "UmmiWeeklyEntry_studentId_weekStartDate_idx"
ON "UmmiWeeklyEntry"("studentId", "weekStartDate");

ALTER TABLE "ExtraHalaqah"
ADD CONSTRAINT "ExtraHalaqah_semesterId_fkey"
FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ExtraHalaqah_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExtraStudentAssignment"
ADD CONSTRAINT "ExtraStudentAssignment_academicYearId_semesterId_fkey"
FOREIGN KEY ("academicYearId", "semesterId") REFERENCES "Semester"("academicYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ExtraStudentAssignment_semesterId_program_groupId_fkey"
FOREIGN KEY ("semesterId", "program", "groupId") REFERENCES "ExtraHalaqah"("semesterId", "program", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ExtraStudentAssignment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TahfizhIntensiveEntry"
ADD CONSTRAINT "TahfizhIntensiveEntry_academicYearId_semesterId_fkey"
FOREIGN KEY ("academicYearId", "semesterId") REFERENCES "Semester"("academicYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "TahfizhIntensiveEntry_semesterId_program_groupId_fkey"
FOREIGN KEY ("semesterId", "program", "groupId") REFERENCES "ExtraHalaqah"("semesterId", "program", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "TahfizhIntensiveEntry_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "TahfizhIntensiveEntry_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "TahfizhIntensiveEntry_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "TahfizhIntensiveEntry_program_fixed"
CHECK ("program" = 'TAHFIZH_INTENSIF'),
ADD CONSTRAINT "TahfizhIntensiveEntry_pages_nonnegative"
CHECK ("pagesCompleted" IS NULL OR "pagesCompleted" >= 0),
ADD CONSTRAINT "TahfizhIntensiveEntry_position_valid"
CHECK (
    ("juzNumber" IS NULL OR "juzNumber" BETWEEN 1 AND 30)
    AND ("fromPage" IS NULL OR "fromPage" > 0)
    AND ("toPage" IS NULL OR ("fromPage" IS NOT NULL AND "toPage" >= "fromPage"))
),
ADD CONSTRAINT "TahfizhIntensiveEntry_category_fields_valid"
CHECK (
    ("type" = 'ZIYADAH' AND "jadid" IS NULL AND "qadim" IS NULL)
    OR ("type" = 'MURAJAAH' AND "pagesCompleted" IS NULL AND "juzNumber" IS NULL
        AND "fromPage" IS NULL AND "toPage" IS NULL AND "jadid" IS NOT NULL AND "qadim" IS NOT NULL
        AND "isMurajaahWeek" = false)
    OR ("type" = 'TASMI' AND "pagesCompleted" IS NULL AND "juzNumber" IS NULL
        AND "fromPage" IS NULL AND "toPage" IS NULL AND "jadid" IS NULL AND "qadim" IS NULL
        AND "isMurajaahWeek" = false)
);

ALTER TABLE "TasmiJuzScore"
ADD CONSTRAINT "TasmiJuzScore_entryId_fkey"
FOREIGN KEY ("entryId") REFERENCES "TahfizhIntensiveEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "TasmiJuzScore_juz_range"
CHECK ("juzNumber" BETWEEN 1 AND 30);

ALTER TABLE "UmmiWeeklyEntry"
ADD CONSTRAINT "UmmiWeeklyEntry_academicYearId_semesterId_fkey"
FOREIGN KEY ("academicYearId", "semesterId") REFERENCES "Semester"("academicYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "UmmiWeeklyEntry_semesterId_program_groupId_fkey"
FOREIGN KEY ("semesterId", "program", "groupId") REFERENCES "ExtraHalaqah"("semesterId", "program", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "UmmiWeeklyEntry_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "UmmiWeeklyEntry_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "UmmiWeeklyEntry_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "UmmiWeeklyEntry_program_fixed"
CHECK ("program" = 'TAHSIN_UMMI'),
ADD CONSTRAINT "UmmiWeeklyEntry_page_range"
CHECK ("fromPage" IS NULL OR ("fromPage" > 0 AND "toPage" IS NOT NULL AND "toPage" >= "fromPage")),
ADD CONSTRAINT "UmmiWeeklyEntry_category_fields_valid"
CHECK (
    ("type" = 'LEARNING' AND "stage" IS NOT NULL AND "fromPage" IS NOT NULL
        AND "toPage" IS NOT NULL AND "grade" IS NOT NULL
        AND ("grade" = 'A' OR length(trim(coalesce("note", ''))) > 0))
    OR ("type" = 'EXAM' AND "stage" IS NOT NULL AND "fromPage" IS NULL
        AND "toPage" IS NULL AND "grade" IS NOT NULL)
);

ALTER TABLE "ExtraHalaqah" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtraStudentAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TahfizhIntensiveEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TasmiJuzScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UmmiWeeklyEntry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ExtraHalaqah", "ExtraStudentAssignment", "TahfizhIntensiveEntry", "TasmiJuzScore", "UmmiWeeklyEntry" FROM anon, authenticated;
