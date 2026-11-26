export const extraPrograms = [
  { value: "TAHFIZH_INTENSIF", label: "Tahfizh Intensif Nukhbatul Huffazh" },
  { value: "TAHSIN_UMMI", label: "Tahsin UMMI" },
] as const;

export const ummiLevels = [
  { value: "JILID_1", label: "Jilid 1" },
  { value: "JILID_2", label: "Jilid 2" },
  { value: "JILID_3", label: "Jilid 3" },
  { value: "GHARIB", label: "Gharib" },
  { value: "TAJWID", label: "Tajwid" },
  { value: "AL_QURAN", label: "Al-Qur'an" },
] as const;

export const intensiveEntryTypes = [
  { value: "ZIYADAH", label: "Ziyadah" },
  { value: "MURAJAAH", label: "Murajaah" },
  { value: "TASMI", label: "Ujian Tasmi'" },
] as const;

export const ummiEntryTypes = [
  { value: "LEARNING", label: "Pembelajaran" },
  { value: "EXAM", label: "Ujian" },
] as const;
