"use client";

import { Document, Image, Page, PDFDownloadLink, StyleSheet, Text, View } from "@react-pdf/renderer";

export type PortfolioPdfData = {
  appName: string;
  pesantrenName: string;
  studentName: string;
  nis: string;
  room: string;
  classroom: string;
  halaqah: string;
  month: string;
  academicYear: string;
  portraitUrl: string | null;
  attendance: { present: number; sick: number; permission: number; absent: number; total: number };
  tahfidz: string[];
  tahfidzProgress: number;
  tahfidzTutor: string;
  adab: { label: string; value: number; tutor: string }[];
  achievements: string[];
  violations: { title: string; points: number }[];
  totalPoints: number;
  conclusion: { good: string[]; support: string[]; hasData: boolean };
  narrative: {
    openingNote: string;
    strengths: string;
    growthAreas: string;
    recommendation: string;
    developmentNote: string;
  };
  signers: { role: string; name: string; signatureUrl: string | null }[];
};

const colors = {
  navy: "#14344a",
  teal: "#0f766e",
  muted: "#5c7280",
  border: "#dce7e8",
  green: "#159570",
  blue: "#3987c9",
  amber: "#d99316",
  red: "#cf5963",
};

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 9, color: colors.navy, fontFamily: "Helvetica", backgroundColor: "#ffffff" },
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 12, backgroundColor: colors.navy, color: "#ffffff" },
  heroBrand: { flexDirection: "row", alignItems: "center" },
  logo: { width: 42, height: 42, objectFit: "contain", marginRight: 10, backgroundColor: "#ffffff", borderRadius: 8, padding: 3 },
  school: { fontSize: 15, fontWeight: 700, color: "#ffffff" },
  product: { fontSize: 8, marginTop: 4, color: "#c5e5e3" },
  monthBox: { textAlign: "right", padding: 8, borderRadius: 8, backgroundColor: colors.teal },
  monthLabel: { fontSize: 7, color: "#d7f4ed", textTransform: "uppercase" },
  month: { fontSize: 12, fontWeight: 700, marginTop: 3, color: "#ffffff" },
  profile: { flexDirection: "row", alignItems: "center", marginTop: 13, padding: 12, border: `1 solid ${colors.border}`, borderRadius: 12 },
  portrait: { width: 72, height: 72, objectFit: "cover", borderRadius: 10, backgroundColor: "#e8f1f0", marginRight: 13 },
  portraitFallback: { width: 72, height: 72, borderRadius: 10, backgroundColor: "#e8f1f0", marginRight: 13 },
  studentName: { fontSize: 16, fontWeight: 700, marginBottom: 6 },
  detail: { fontSize: 8, lineHeight: 1.5, color: colors.muted },
  section: { marginTop: 11, padding: 11, border: `1 solid ${colors.border}`, borderRadius: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  sectionBadge: { width: 19, height: 19, borderRadius: 7, justifyContent: "center", alignItems: "center", backgroundColor: colors.teal, marginRight: 7 },
  sectionBadgeText: { color: "#ffffff", fontSize: 8, fontWeight: 700 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: colors.navy },
  sectionCaption: { fontSize: 7, color: colors.muted, marginTop: 2 },
  line: { marginBottom: 4, lineHeight: 1.35 },
  stats: { flexDirection: "row", flexWrap: "wrap", marginTop: 7 },
  stat: { width: "25%", paddingRight: 6 },
  statValue: { fontSize: 12, fontWeight: 700 },
  statLabel: { fontSize: 7, color: colors.muted, marginTop: 2 },
  chart: { flexDirection: "row", overflow: "hidden", height: 8, borderRadius: 5, marginTop: 5 },
  legend: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  legendItem: { width: "50%", flexDirection: "row", alignItems: "center", marginBottom: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  legendText: { fontSize: 7, color: colors.muted },
  meterRow: { marginTop: 5 },
  meterMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  meterLabel: { fontSize: 8, fontWeight: 600 },
  meterValue: { fontSize: 8, color: colors.muted },
  meterTrack: { height: 5, borderRadius: 4, backgroundColor: "#e8eff0", overflow: "hidden" },
  summaryRow: { flexDirection: "row", marginTop: 7 },
  summaryBox: { width: "50%", padding: 8, borderRadius: 8, backgroundColor: "#eaf6f1", marginRight: 5 },
  supportBox: { width: "50%", padding: 8, borderRadius: 8, backgroundColor: "#fff4e2", marginLeft: 5 },
  summaryTitle: { fontSize: 8, fontWeight: 700, marginBottom: 4 },
  summaryText: { fontSize: 7.5, lineHeight: 1.4 },
  signatureArea: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 12 },
  signer: { width: "31%", minHeight: 90, padding: 8, border: `1 solid ${colors.border}`, borderRadius: 9, alignItems: "center" },
  signerRole: { fontSize: 7, color: colors.muted, textAlign: "center" },
  signerName: { fontSize: 8, fontWeight: 700, marginTop: 3, textAlign: "center" },
  signature: { width: 70, height: 34, objectFit: "contain", marginTop: 5 },
  signatureLine: { width: 70, height: 34, borderBottom: `1 solid ${colors.border}`, marginTop: 5 },
});

function Section({ badge, title, caption, children }: {
  badge: string;
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{badge}</Text></View>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {caption && <Text style={styles.sectionCaption}>{caption}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

function Meter({ label, value, color = colors.teal }: { label: string; value: number; color?: string }) {
  const width = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <View style={styles.meterRow}>
      <View style={styles.meterMeta}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>{value}%</Text>
      </View>
      <View style={styles.meterTrack}><View style={{ width, height: "100%", backgroundColor: color }} /></View>
    </View>
  );
}

function PortfolioDocument({ data }: { data: PortfolioPdfData }) {
  const attendanceSegments = [
    { label: "Hadir", value: data.attendance.present, color: colors.green },
    { label: "Sakit", value: data.attendance.sick, color: colors.blue },
    { label: "Izin", value: data.attendance.permission, color: colors.amber },
    { label: "Alpa", value: data.attendance.absent, color: colors.red },
  ];

  return (
    <Document title={`Portfolio ${data.studentName} ${data.month}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroBrand}>
            <Image src="/logo-pesantren.png" style={styles.logo} />
            <View>
              <Text style={styles.school}>{data.pesantrenName}</Text>
              <Text style={styles.product}>{data.appName.toUpperCase()} · PORTFOLIO SANTRI</Text>
            </View>
          </View>
          <View style={styles.monthBox}>
            <Text style={styles.monthLabel}>Periode laporan</Text>
            <Text style={styles.month}>{data.month}</Text>
          </View>
        </View>

        <View style={styles.profile}>
          {data.portraitUrl
            ? <Image src={data.portraitUrl} style={styles.portrait} />
            : <View style={styles.portraitFallback} />}
          <View>
            <Text style={styles.studentName}>{data.studentName}</Text>
            <Text style={styles.detail}>NIS {data.nis} · Kelas {data.classroom} · Kamar {data.room}</Text>
            <Text style={styles.detail}>Halaqah {data.halaqah}</Text>
            <Text style={styles.detail}>Tahun ajaran {data.academicYear}</Text>
          </View>
        </View>

        <Section badge="K" title="Kehadiran" caption={`Rekap ${data.attendance.total} hari tercatat · Murabbi: ${data.signers.find((signer) => signer.role === "Murabbi")?.name ?? "Belum ditentukan"}`}>
          <View style={styles.chart}>
            {attendanceSegments.map((segment) => (
              <View key={segment.label} style={{ width: `${segment.value}%`, height: "100%", backgroundColor: segment.color }} />
            ))}
          </View>
          <View style={styles.legend}>
            {attendanceSegments.map((segment) => (
              <View key={segment.label} style={styles.legendItem}>
                <View style={{ ...styles.dot, backgroundColor: segment.color }} />
                <Text style={styles.legendText}>{segment.label} {segment.value}%</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section badge="Q" title="Tahfizh" caption={`Muhaffizh: ${data.tahfidzTutor}`}>
          <Meter label="Capaian Ziyadah" value={data.tahfidzProgress} />
          <View style={styles.stats}>
            {data.tahfidz.map((line) => (
              <View key={line} style={{ width: "50%", paddingRight: 7, marginTop: 6 }}>
                <Text style={styles.line}>{line}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section badge="A" title="Huquq Sittah" caption="Rata-rata penilaian adab per kriteria">
          {data.adab.length
            ? data.adab.map(({ label, value, tutor }) => (
                <View key={label}>
                  <Meter label={label} value={value} color={colors.amber} />
                  <Text style={styles.sectionCaption}>Dinilai oleh {tutor}</Text>
                </View>
              ))
            : <Text style={styles.line}>Belum ada penilaian pada bulan ini.</Text>}
        </Section>

        <Section badge="P" title="Prestasi & pembinaan" caption={`Total pelanggaran: ${data.totalPoints} poin`}>
          <Text style={styles.line}>Prestasi: {data.achievements.length ? data.achievements.join(" · ") : "Belum ada catatan."}</Text>
          <Text style={styles.line}>Pelanggaran: {data.violations.length ? data.violations.map((item) => `${item.title} (${item.points} poin)`).join(" · ") : "Tidak ada catatan pada periode ini."}</Text>
        </Section>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Alhamdulillah, yang sudah baik</Text>
            <Text style={styles.summaryText}>
              {data.conclusion.hasData ? data.conclusion.good.join(", ") || "Terus jaga konsistensi dan kebiasaan baik." : "Belum cukup catatan untuk menyusun kesimpulan otomatis."}
            </Text>
          </View>
          <View style={styles.supportBox}>
            <Text style={styles.summaryTitle}>Pendampingan bersama</Text>
            <Text style={styles.summaryText}>
              {data.conclusion.hasData ? data.conclusion.support.join(", ") || "Pertahankan perkembangan positif bersama." : "Lengkapi catatan agar kebutuhan pendampingan dapat terlihat."}
            </Text>
          </View>
        </View>

        <Section badge="C" title="Catatan perkembangan">
          {data.narrative.openingNote && <Text style={styles.line}>{data.narrative.openingNote}</Text>}
          <Text style={styles.line}>Hal yang berkembang baik: {data.narrative.strengths || "—"}</Text>
          <Text style={styles.line}>Area penguatan: {data.narrative.growthAreas || "—"}</Text>
          <Text style={styles.line}>Arahan bulan berikutnya: {data.narrative.recommendation || "—"}</Text>
          {data.narrative.developmentNote && <Text style={styles.line}>{data.narrative.developmentNote}</Text>}
        </Section>

        <View style={styles.signatureArea}>
          {data.signers.map((signer) => (
            <View key={`${signer.role}-${signer.name}`} style={styles.signer}>
              <Text style={styles.signerRole}>{signer.role}</Text>
              {signer.signatureUrl
                ? <Image src={signer.signatureUrl} style={styles.signature} />
                : <View style={styles.signatureLine} />}
              <Text style={styles.signerName}>{signer.name}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export function PortfolioPdfDownload({ data }: { data: PortfolioPdfData }) {
  const filename = `portfolio-${data.nis}-${data.month}.pdf`;
  return (
    <PDFDownloadLink document={<PortfolioDocument data={data} />} fileName={filename}>
      {({ loading }) => (
        <span
          aria-disabled={loading}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold shadow-sm hover:bg-muted"
        >
          {loading ? "Menyiapkan PDF…" : "Unduh PDF"}
        </span>
      )}
    </PDFDownloadLink>
  );
}
