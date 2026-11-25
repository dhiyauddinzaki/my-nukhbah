import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const getActiveSemester = cache(() =>
  db.semester.findFirst({
    where: { isActive: true, closedAt: null, academicYear: { isActive: true } },
    include: { academicYear: true },
  }),
);

export const semesterLabel = { GANJIL: "Ganjil", GENAP: "Genap" } as const;
