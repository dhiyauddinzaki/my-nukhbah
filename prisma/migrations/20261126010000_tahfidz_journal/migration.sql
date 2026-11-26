CREATE TYPE "TahfidzType" AS ENUM ('ZIYADAH', 'MURAJAAH', 'JUZIYYAH');
CREATE TYPE "TahfidzAssessment" AS ENUM ('BELUM_DINILAI', 'LANCAR', 'PERLU_ULANG', 'LULUS');

CREATE TABLE "TahfidzEntry" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "halaqahId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" "TahfidzType" NOT NULL,
    "fromSurah" VARCHAR(80),
    "fromAyat" INTEGER,
    "toSurah" VARCHAR(80),
    "toAyat" INTEGER,
    "lineCount" INTEGER,
    "juzNumber" INTEGER,
    "assessment" "TahfidzAssessment" NOT NULL DEFAULT 'BELUM_DINILAI',
    "score" INTEGER,
    "note" VARCHAR(500),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TahfidzEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TahfidzEntry_semesterId_halaqahId_studentId_date_type_key"
ON "TahfidzEntry"("semesterId", "halaqahId", "studentId", "date", "type");
CREATE INDEX "TahfidzEntry_semesterId_halaqahId_date_idx"
ON "TahfidzEntry"("semesterId", "halaqahId", "date");
CREATE INDEX "TahfidzEntry_studentId_date_idx"
ON "TahfidzEntry"("studentId", "date");
CREATE INDEX "TahfidzEntry_type_assessment_idx"
ON "TahfidzEntry"("type", "assessment");

ALTER TABLE "TahfidzEntry"
ADD CONSTRAINT "TahfidzEntry_academicYearId_semesterId_fkey"
FOREIGN KEY ("academicYearId", "semesterId") REFERENCES "Semester"("academicYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "TahfidzEntry_semesterId_halaqahId_fkey"
FOREIGN KEY ("semesterId", "halaqahId") REFERENCES "Halaqah"("semesterId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "TahfidzEntry_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "TahfidzEntry_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "TahfidzEntry_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "TahfidzEntry_ayat_positive"
CHECK ("fromAyat" IS NULL OR "fromAyat" > 0),
ADD CONSTRAINT "TahfidzEntry_to_ayat_positive"
CHECK ("toAyat" IS NULL OR "toAyat" > 0),
ADD CONSTRAINT "TahfidzEntry_line_positive"
CHECK ("lineCount" IS NULL OR "lineCount" > 0),
ADD CONSTRAINT "TahfidzEntry_juz_range"
CHECK ("juzNumber" IS NULL OR "juzNumber" BETWEEN 1 AND 30),
ADD CONSTRAINT "TahfidzEntry_score_range"
CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);

ALTER TABLE "TahfidzEntry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "TahfidzEntry" FROM anon, authenticated;
