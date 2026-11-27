CREATE TABLE "GuardianStudent" (
    "id" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuardianStudent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortfolioNarrative" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "monthStart" DATE NOT NULL,
    "strengths" VARCHAR(1500) NOT NULL DEFAULT '',
    "growthAreas" VARCHAR(1500) NOT NULL DEFAULT '',
    "recommendation" VARCHAR(1500) NOT NULL DEFAULT '',
    "authorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortfolioNarrative_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuardianStudent_guardianId_studentId_key"
ON "GuardianStudent"("guardianId", "studentId");
CREATE INDEX "GuardianStudent_guardianId_isActive_idx"
ON "GuardianStudent"("guardianId", "isActive");
CREATE INDEX "GuardianStudent_studentId_isActive_idx"
ON "GuardianStudent"("studentId", "isActive");
CREATE UNIQUE INDEX "PortfolioNarrative_semesterId_studentId_monthStart_key"
ON "PortfolioNarrative"("semesterId", "studentId", "monthStart");
CREATE INDEX "PortfolioNarrative_studentId_monthStart_idx"
ON "PortfolioNarrative"("studentId", "monthStart");

ALTER TABLE "GuardianStudent"
ADD CONSTRAINT "GuardianStudent_guardianId_fkey"
FOREIGN KEY ("guardianId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "GuardianStudent_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortfolioNarrative"
ADD CONSTRAINT "PortfolioNarrative_academicYearId_semesterId_fkey"
FOREIGN KEY ("academicYearId", "semesterId") REFERENCES "Semester"("academicYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "PortfolioNarrative_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "PortfolioNarrative_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GuardianStudent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GuardianStudent" FROM anon, authenticated;
ALTER TABLE "PortfolioNarrative" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PortfolioNarrative" FROM anon, authenticated;
