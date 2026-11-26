export const tahfidzTypes = [
  { value: "ZIYADAH", label: "Ziyadah" },
  { value: "MURAJAAH", label: "Murajaah" },
  { value: "JUZIYYAH", label: "Ujian / Juziyyah" },
] as const;

export const tahfidzAssessments = [
  { value: "BELUM_DINILAI", label: "Belum dinilai" },
  { value: "LANCAR", label: "Lancar" },
  { value: "PERLU_ULANG", label: "Perlu ulang" },
  { value: "LULUS", label: "Lulus" },
] as const;
