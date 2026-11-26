export const presenceStatuses = [
  { value: "H", label: "Hadir" },
  { value: "S", label: "Sakit (di UKP)" },
  { value: "I", label: "Izin (di luar pesantren)" },
  { value: "A", label: "Alpa (di luar pesantren tanpa keterangan)" },
] as const;

export type PresenceStatusValue = (typeof presenceStatuses)[number]["value"];

export const dailyActivities = [
  { value: "PAGI", label: "Pendampingan Pagi", photoLabel: "Foto kerapian pagi" },
  { value: "SORE", label: "Pendampingan Sore", photoLabel: "Foto kerapian sore" },
  { value: "MALAM", label: "Pendampingan Malam", photoLabel: "Foto kerapian malam" },
] as const;

export const adabCriteria = [
  { key: "haqLinafsih", label: "Haq Linafsih" },
  { key: "haqLisyaikhih", label: "Haq Lisyaikhih" },
  { key: "haqLizamilih", label: "Haq Lizamilih" },
  { key: "haqLilMakan", label: "Haq Lil-Makan" },
  { key: "haqLilKitab", label: "Haq Lil-Kitab" },
  { key: "haqLilIlm", label: "Haq Lil-Ilm" },
] as const;

export type AdabCriterionKey = (typeof adabCriteria)[number]["key"];
