-- CreateEnum
CREATE TYPE "SemesterName" AS ENUM ('GANJIL', 'GENAP');

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" UUID NOT NULL,
    "name" VARCHAR(9) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "name" "SemesterName" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" UUID NOT NULL,
    "nis" VARCHAR(32) NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "supervisorId" UUID,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Halaqah" (
    "id" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "teacherId" UUID,

    CONSTRAINT "Halaqah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "studentId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "classroomId" UUID,
    "roomId" UUID,
    "halaqahId" UUID,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("semesterId","studentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_name_key" ON "AcademicYear"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_academicYearId_name_key" ON "Semester"("academicYearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_academicYearId_id_key" ON "Semester"("academicYearId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Student_nis_key" ON "Student"("nis");

-- CreateIndex
CREATE INDEX "Student_fullName_id_idx" ON "Student"("fullName", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_semesterId_name_key" ON "Classroom"("semesterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_semesterId_id_key" ON "Classroom"("semesterId", "id");

-- CreateIndex
CREATE INDEX "Room_supervisorId_semesterId_idx" ON "Room"("supervisorId", "semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_semesterId_name_key" ON "Room"("semesterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Room_semesterId_id_key" ON "Room"("semesterId", "id");

-- CreateIndex
CREATE INDEX "Halaqah_teacherId_semesterId_idx" ON "Halaqah"("teacherId", "semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "Halaqah_semesterId_name_key" ON "Halaqah"("semesterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Halaqah_semesterId_id_key" ON "Halaqah"("semesterId", "id");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_semesterId_idx" ON "Enrollment"("studentId", "semesterId");

-- CreateIndex
CREATE INDEX "Enrollment_semesterId_classroomId_idx" ON "Enrollment"("semesterId", "classroomId");

-- CreateIndex
CREATE INDEX "Enrollment_semesterId_roomId_idx" ON "Enrollment"("semesterId", "roomId");

-- CreateIndex
CREATE INDEX "Enrollment_semesterId_halaqahId_idx" ON "Enrollment"("semesterId", "halaqahId");

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halaqah" ADD CONSTRAINT "Halaqah_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Halaqah" ADD CONSTRAINT "Halaqah_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_academicYearId_semesterId_fkey" FOREIGN KEY ("academicYearId", "semesterId") REFERENCES "Semester"("academicYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_semesterId_classroomId_fkey" FOREIGN KEY ("semesterId", "classroomId") REFERENCES "Classroom"("semesterId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_semesterId_roomId_fkey" FOREIGN KEY ("semesterId", "roomId") REFERENCES "Room"("semesterId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_semesterId_halaqahId_fkey" FOREIGN KEY ("semesterId", "halaqahId") REFERENCES "Halaqah"("semesterId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- The singleton indexes also protect activation from concurrent writes.
CREATE UNIQUE INDEX "AcademicYear_one_active" ON "AcademicYear" ("isActive") WHERE "isActive";
CREATE UNIQUE INDEX "Semester_one_active" ON "Semester" ("isActive") WHERE "isActive";

ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_valid_dates" CHECK ("startDate" <= "endDate");
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_valid_dates" CHECK ("startDate" <= "endDate");
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_closed_inactive" CHECK ("closedAt" IS NULL OR NOT "isActive");

ALTER TABLE "AcademicYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Semester" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Classroom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Halaqah" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AcademicYear", "Semester", "Student", "Classroom", "Room", "Halaqah", "Enrollment" FROM anon, authenticated;
