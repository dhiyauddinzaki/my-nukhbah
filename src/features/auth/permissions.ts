export const roles = ["ADMIN", "KEPALA_ASRAMA", "MUSYRIF", "WALI_SANTRI"] as const;
export type AppRole = (typeof roles)[number];

export const roleLabel: Record<AppRole, string> = {
  ADMIN: "Admin",
  KEPALA_ASRAMA: "Kepala Asrama",
  MUSYRIF: "Musyrif / Guru Pengampu Quran",
  WALI_SANTRI: "Wali Santri",
};

export const sections = {
  admin: { label: "Dashboard", title: "Dashboard Admin", roles: ["ADMIN"] },
  asrama: { label: "Asrama", title: "Rekap Asrama", roles: ["ADMIN", "KEPALA_ASRAMA", "MUSYRIF"] },
  pembinaan: { label: "Pembinaan", title: "Ruang Pembinaan", roles: ["ADMIN", "MUSYRIF"] },
  ekstra: { label: "Ekstra", title: "Jurnal Ekstra", roles: ["ADMIN", "MUSYRIF"] },
  portfolio: { label: "Portfolio", title: "Portfolio Santri", roles: ["ADMIN", "MUSYRIF", "WALI_SANTRI"] },
  kalender: { label: "Kalender", title: "Kalender Akademik", roles: ["ADMIN", "MUSYRIF", "WALI_SANTRI"] },
  "rekap-admin": { label: "Rekap Admin", title: "Rekap Admin", roles: ["ADMIN", "KEPALA_ASRAMA"] },
} satisfies Record<string, { label: string; title: string; roles: AppRole[] }>;

export type Section = keyof typeof sections;

export function canAccess(role: AppRole, section: Section) {
  return (sections[section].roles as AppRole[]).includes(role);
}

export const home: Record<AppRole, string> = {
  ADMIN: "/admin",
  KEPALA_ASRAMA: "/asrama",
  MUSYRIF: "/pembinaan",
  WALI_SANTRI: "/portfolio",
};
