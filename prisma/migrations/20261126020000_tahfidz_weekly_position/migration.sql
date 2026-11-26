CREATE TYPE "TahfidzFluencyGrade" AS ENUM ('A', 'B', 'C', 'D');

ALTER TABLE "TahfidzEntry"
ADD COLUMN "fromPage" INTEGER,
ADD COLUMN "toPage" INTEGER,
ADD COLUMN "fluencyGrade" "TahfidzFluencyGrade";

ALTER TABLE "TahfidzEntry"
ADD CONSTRAINT "TahfidzEntry_page_positive"
CHECK (("fromPage" IS NULL OR "fromPage" > 0) AND ("toPage" IS NULL OR "toPage" > 0));
