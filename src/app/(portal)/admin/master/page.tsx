import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Hidden, Select, card } from "@/features/academic/master-fields";
import { MasterForm } from "@/features/academic/master-form";
import { GroupPanel } from "@/features/academic/master-groups";
import { ExtraGroupPanel } from "@/features/academic/extra-groups";
import { getActiveSemester, semesterLabel } from "@/features/academic/period";
import { AssignmentForm, StudentForm } from "@/features/academic/student-forms";
import { PortfolioMediaForm } from "@/features/portfolio/media-form";
import { requireProfile } from "@/features/auth/session";
import { db } from "@/lib/db";

const pageSize = 20;
const route = "/admin/master";

export default async function MasterPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if ((await requireProfile()).role !== "ADMIN") notFound();

  const { semester: selected, q, page } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 120) : "";
  const requestedPage = typeof page === "string" ? Number(page) : 1;
  const [periods, active] = await Promise.all([
    db.semester.findMany({ include: { academicYear: true }, orderBy: { startDate: "desc" } }),
    getActiveSemester(),
  ]);

  const current = selected === undefined || selected === ""
    ? active ?? periods.find((period) => period.academicYearId === periods[0]?.academicYearId && period.name === "GANJIL") ?? periods[0]
    : periods.find(({ id }) => z.uuid().safeParse(selected).success && id === selected);
  if (selected && !current) notFound();

  const semesterId = current?.id;
  const editable = !!active && semesterId === active.id;
  const firstActivation = !active && periods.every((period) => !period.closedAt && !period.isActive && !period.academicYear.isActive);
  const enrollmentFilter = semesterId ? { semesterId } : undefined;
  const where: Prisma.StudentWhereInput = {
    ...(!editable && enrollmentFilter && { enrollments: { some: enrollmentFilter } }),
    ...(query && {
      OR: [
        { nis: { contains: query, mode: "insensitive" } },
        { fullName: { contains: query, mode: "insensitive" } },
      ],
    }),
  };
  const [total, classrooms, rooms, halaqahs, staff, extraGroups, extraStudents, guardians, guardianLinks, signers] = await Promise.all([
    db.student.count({ where }),
    semesterId ? db.classroom.findMany({ where: { semesterId }, orderBy: { name: "asc" } }) : [],
    semesterId ? db.room.findMany({ where: { semesterId }, include: { supervisor: { select: { id: true, displayName: true } } }, orderBy: { name: "asc" } }) : [],
    semesterId ? db.halaqah.findMany({ where: { semesterId }, include: { teacher: { select: { id: true, displayName: true } } }, orderBy: { name: "asc" } }) : [],
    editable ? db.profile.findMany({
      where: { role: "MUSYRIF", isActive: true },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }) : [],
    semesterId ? db.extraHalaqah.findMany({
      where: { semesterId },
      include: {
        teacher: { select: { id: true, displayName: true } },
        members: { include: { student: { select: { id: true, nis: true, fullName: true } } } },
      },
      orderBy: [{ program: "asc" }, { name: "asc" }],
    }) : [],
    db.student.findMany({
      select: { id: true, nis: true, fullName: true },
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      take: 2000,
    }),
    db.profile.findMany({
      where: { role: "WALI_SANTRI", isActive: true },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    db.guardianStudent.findMany({
      where: { isActive: true },
      select: { guardianId: true, studentId: true },
    }),
    db.profile.findMany({
      where: { role: { in: ["MUSYRIF", "KEPALA_ASRAMA"] }, isActive: true },
      select: { id: true, displayName: true, role: true, signaturePath: true },
      orderBy: { displayName: "asc" },
    }),
  ]);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const pageNumber = Number.isSafeInteger(requestedPage) ? Math.min(lastPage, Math.max(1, requestedPage)) : 1;
  const students = await db.student.findMany({
    where,
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    skip: (pageNumber - 1) * pageSize,
    take: pageSize,
    include: {
      enrollments: {
        where: semesterId ? { semesterId } : { OR: [] },
        include: { classroom: true, room: true, halaqah: true },
      },
      extraAssignments: {
        where: semesterId ? { semesterId } : { OR: [] },
        include: { group: true },
      },
    },
  });

  function pageLink(target: number) {
    return route + "?" + new URLSearchParams({ semester: semesterId ?? "", q: query, page: String(target) });
  }

  return (
    <div className="space-y-5">
      <header>
        <Link href="/admin" className="text-sm font-semibold text-muted-foreground">← Dashboard Admin</Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Master data</h1>
        <p className="mt-2 text-sm text-muted-foreground">Kelola periode akademik dan penempatan santri.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-lg font-bold">Tahun ajaran dan semester</h2>
          {periods.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada tahun ajaran.</p> : (
            <>
              <form action={route} method="get" className="flex flex-wrap items-end gap-2">
                <Select label="Periode yang ditampilkan" name="semester" defaultValue={semesterId}>
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.academicYear.name} · {semesterLabel[period.name]}{period.id === active?.id ? " (aktif)" : ""}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="outline">Tampilkan</Button>
              </form>
              {current && (
                <p className="text-sm text-muted-foreground">
                  {current.startDate.toISOString().slice(0, 10)} – {current.endDate.toISOString().slice(0, 10)}
                  {" · "}{editable ? "Aktif" : current.closedAt ? "Arsip · hanya lihat" : "Nonaktif · hanya lihat"}
                </p>
              )}
              {firstActivation && semesterId && (
                <MasterForm label="Aktifkan semester ini">
                  <Hidden name="operation" value="activate" />
                  <Hidden name="semesterId" value={semesterId} />
                  <p className="text-sm text-muted-foreground sm:col-span-2">Aktivasi awal membuka pengisian kelompok dan penempatan untuk periode ini.</p>
                </MasterForm>
              )}
            </>
          )}
        </section>
        <section className={`${card} lg:col-span-2`}>
          <div>
            <h2 className="text-xl font-bold">Foto santri & tanda tangan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Unggah foto close-up pada detail santri di bawah. Tanda tangan Murabbi, Muhaffizh, dan Kepala Asrama dikelola di sini.
              Berkas privat di Storage; format JPG, PNG, atau WebP, maksimal 5 MB.
            </p>
          </div>
          {signers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada Murabbi, Muhaffizh, atau Kepala Asrama aktif.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {signers.map((signer) => (
                <div key={signer.id} className="space-y-2 rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">
                    {signer.displayName} · {signer.role === "KEPALA_ASRAMA" ? "Kepala Asrama" : "Murabbi / Muhaffizh"}
                  </p>
                  <p className="text-xs text-muted-foreground">{signer.signaturePath ? "Tanda tangan sudah diunggah." : "Belum ada tanda tangan."}</p>
                  <PortfolioMediaForm kind="profileSignature" targetId={signer.id} label="Gambar tanda tangan" />
                </div>
              ))}
            </div>
          )}
        </section>
        <section className={card}>
          <h2 className="text-lg font-bold">Tambah tahun ajaran</h2>
          <MasterForm label="Buat tahun ajaran" resetOnSuccess>
            <Hidden name="operation" value="year" />
            <Field label="Nama tahun ajaran" name="name" placeholder="2026/2027" pattern="[0-9]{4}/[0-9]{4}" maxLength={9} required />
            <Field label="Awal semester Ganjil" name="startDate" type="date" required />
            <Field label="Akhir semester Ganjil" name="oddEnd" type="date" required />
            <Field label="Akhir semester Genap" name="endDate" type="date" required />
          </MasterForm>
        </section>
      </div>
      {semesterId && (
        <div className="grid gap-4 lg:grid-cols-3">
          <GroupPanel kind="classroom" groups={classrooms} {...{ semesterId, staff, editable }} />
          <GroupPanel kind="room" groups={rooms.map((room) => ({ ...room, staff: room.supervisor }))} {...{ semesterId, staff, editable }} />
          <GroupPanel kind="halaqah" groups={halaqahs.map((halaqah) => ({ ...halaqah, staff: halaqah.teacher }))} {...{ semesterId, staff, editable }} />
        </div>
      )}
      {semesterId && (
        <section className={card}>
          <div>
            <h2 className="text-xl font-bold">Program ekstra dan anggota</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Atur halaqah khusus, Muhaffizh, dan roster santri secara terpisah dari halaqah reguler.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ExtraGroupPanel
              semesterId={semesterId}
              program="TAHFIZH_INTENSIF"
              groups={extraGroups.filter((group) => group.program === "TAHFIZH_INTENSIF")}
              staff={staff}
              students={extraStudents}
              editable={editable}
            />
            <ExtraGroupPanel
              semesterId={semesterId}
              program="TAHSIN_UMMI"
              groups={extraGroups.filter((group) => group.program === "TAHSIN_UMMI")}
              staff={staff}
              students={extraStudents}
              editable={editable}
            />
          </div>
        </section>
      )}
      <section className={card}>
        <div>
          <h2 className="text-xl font-bold">Akses portfolio wali</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kaitkan akun Wali Santri dengan anaknya. Setiap penyimpanan mengganti daftar aktif untuk wali yang dipilih.
          </p>
        </div>
        {guardians.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada profil Wali Santri aktif. Buat profil dengan role WALI_SANTRI terlebih dahulu.</p>
        ) : extraStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data santri untuk ditautkan.</p>
        ) : (
          <div className="space-y-4">
            {guardians.map((guardian) => (
              <details key={guardian.id} className="rounded-xl border border-border p-3">
                <summary className="cursor-pointer font-semibold">{guardian.displayName}</summary>
                <div className="pt-3">
                  <MasterForm label="Simpan relasi wali–santri">
                    <Hidden name="operation" value="guardianRoster" />
                    <Hidden name="guardianId" value={guardian.id} />
                    <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
                      Santri yang dapat dilihat
                      <select
                        name="studentIds"
                        multiple
                        size={Math.min(10, Math.max(4, extraStudents.length))}
                        className="min-h-28 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        {extraStudents.map((student) => (
                          <option
                            key={student.id}
                            value={student.id}
                            selected={guardianLinks.some((link) => link.guardianId === guardian.id && link.studentId === student.id)}
                          >
                            {student.fullName} · NIS {student.nis}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs font-normal text-muted-foreground">
                        Gunakan Ctrl (Windows) atau Command (Mac) untuk memilih beberapa santri. Simpan mengganti daftar aktif.
                      </span>
                    </label>
                  </MasterForm>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
      <section className={card}>
        <h2 className="text-lg font-bold">Santri dan penempatan <span className="text-sm font-normal text-muted-foreground">({total})</span></h2>
        {(editable || !semesterId) && (
          <details>
            <summary className="cursor-pointer py-2 text-sm font-semibold">Tambah santri</summary>
            <StudentForm />
          </details>
        )}
        <form action={route} method="get" className="flex flex-wrap items-end gap-2">
          <Hidden name="semester" value={semesterId ?? ""} />
          <Field label="Cari santri" name="q" type="search" placeholder="Nama atau NIS" defaultValue={query} maxLength={120} />
          <Button type="submit" variant="outline">Cari</Button>
        </form>
        {students.length === 0 && <p className="text-sm text-muted-foreground">Belum ada santri untuk ditampilkan.</p>}
        <ul className="divide-y divide-border">
          {students.map((student) => {
            const assignment = student.enrollments[0];
            const extraAssignment = student.extraAssignments[0];
            return (
              <li key={student.id} className="space-y-2 py-4">
                <p className="font-semibold">{student.fullName}</p>
                <p className="text-sm text-muted-foreground">NIS {student.nis}{assignment
                  ? ` · Kelas ${assignment.classroom?.name ?? "—"} · Kamar ${assignment.room?.name ?? "—"} · Halaqah ${assignment.halaqah?.name ?? "—"}`
                  : " · Belum ada penempatan"}{extraAssignment ? ` · Ekstra ${extraAssignment.group.name}` : ""}</p>
                {(editable || !semesterId) && (
                  <details>
                    <summary className="cursor-pointer py-1 text-sm text-muted-foreground">Ubah identitas</summary>
                    <StudentForm student={student} />
                  </details>
                )}
                <details>
                  <summary className="cursor-pointer py-1 text-sm text-muted-foreground">
                    Foto close-up · {student.portraitPath ? "sudah tersedia" : "belum diunggah"}
                  </summary>
                  <div className="pt-2">
                    <PortfolioMediaForm kind="studentPortrait" targetId={student.id} label="Foto santri" />
                  </div>
                </details>
                {semesterId && editable && (
                  <details>
                    <summary className="cursor-pointer py-1 text-sm text-muted-foreground">Atur penempatan</summary>
                    <AssignmentForm studentId={student.id} {...{ semesterId, assignment, classrooms, rooms, halaqahs }} />
                  </details>
                )}
              </li>
            );
          })}
        </ul>
        {lastPage > 1 && (
          <nav aria-label="Halaman daftar santri" className="flex flex-wrap items-center gap-3 text-sm">
            {pageNumber > 1 && <Button variant="outline" asChild><Link href={pageLink(pageNumber - 1)}>Sebelumnya</Link></Button>}
            <span>Halaman {pageNumber} dari {lastPage}</span>
            {pageNumber < lastPage && <Button variant="outline" asChild><Link href={pageLink(pageNumber + 1)}>Berikutnya</Link></Button>}
          </nav>
        )}
      </section>
    </div>
  );
}
