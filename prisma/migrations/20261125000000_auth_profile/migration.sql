CREATE TYPE "Role" AS ENUM ('ADMIN', 'KEPALA_ASRAMA', 'MUSYRIF', 'WALI_SANTRI');

CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Profile" FROM anon, authenticated;
