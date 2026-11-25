-- CreateEnum
CREATE TYPE "DormSession" AS ENUM ('TAHAJJUD', 'PAGI', 'SEKOLAH', 'SORE', 'KAJIAN_ADAB', 'MALAM');

-- CreateEnum
CREATE TYPE "PrayerName" AS ENUM ('SUBUH', 'DZUHUR', 'ASHAR', 'MAGHRIB', 'ISYA');

-- CreateEnum
CREATE TYPE "PrayerStatus" AS ENUM ('MUWAFIQ', 'JT', 'MF', 'ALPHA', 'IZIN', 'SAKIT');

-- CreateTable
CREATE TABLE "DormJournal" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "semesterId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "pagiPhotoPath" VARCHAR(500),
    "sorePhotoPath" VARCHAR(500),
    "malamPhotoPath" VARCHAR(500),
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DormJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DormAttendance" (
    "journalId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "session" "DormSession" NOT NULL,
    "present" BOOLEAN NOT NULL,

    CONSTRAINT "DormAttendance_pkey" PRIMARY KEY ("journalId","studentId","session")
);

-- CreateTable
CREATE TABLE "PrayerAttendance" (
    "journalId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "prayer" "PrayerName" NOT NULL,
    "status" "PrayerStatus" NOT NULL,

    CONSTRAINT "PrayerAttendance_pkey" PRIMARY KEY ("journalId","studentId","prayer")
);

-- CreateIndex
CREATE UNIQUE INDEX "DormJournal_semesterId_roomId_date_key" ON "DormJournal"("semesterId", "roomId", "date");

-- CreateIndex
CREATE INDEX "DormJournal_semesterId_date_idx" ON "DormJournal"("semesterId", "date");

-- CreateIndex
CREATE INDEX "DormJournal_createdById_idx" ON "DormJournal"("createdById");

-- CreateIndex
CREATE INDEX "DormAttendance_studentId_session_idx" ON "DormAttendance"("studentId", "session");

-- CreateIndex
CREATE INDEX "PrayerAttendance_studentId_prayer_idx" ON "PrayerAttendance"("studentId", "prayer");

-- AddForeignKey
ALTER TABLE "DormJournal" ADD CONSTRAINT "DormJournal_academicYearId_semesterId_fkey" FOREIGN KEY ("academicYearId", "semesterId") REFERENCES "Semester"("academicYearId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DormJournal" ADD CONSTRAINT "DormJournal_semesterId_roomId_fkey" FOREIGN KEY ("semesterId", "roomId") REFERENCES "Room"("semesterId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DormJournal" ADD CONSTRAINT "DormJournal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DormJournal" ADD CONSTRAINT "DormJournal_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DormAttendance" ADD CONSTRAINT "DormAttendance_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "DormJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DormAttendance" ADD CONSTRAINT "DormAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerAttendance" ADD CONSTRAINT "PrayerAttendance_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "DormJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerAttendance" ADD CONSTRAINT "PrayerAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DormJournal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DormAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrayerAttendance" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "DormJournal", "DormAttendance", "PrayerAttendance" FROM anon, authenticated;
