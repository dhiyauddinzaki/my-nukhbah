import { Field, Hidden, Select, card } from "./master-fields";
import { MasterForm } from "./master-form";

type Program = "TAHFIZH_INTENSIF" | "TAHSIN_UMMI";
type Staff = { id: string; displayName: string };
type Student = { id: string; nis: string; fullName: string };
type Group = {
  id: string;
  name: string;
  teacher: Staff;
  members: { student: Student }[];
};

const programInfo = {
  TAHFIZH_INTENSIF: {
    title: "Tahfizh Intensif Nukhbatul Huffazh",
    min: 3,
    max: 5,
    color: "border-l-amber-500",
  },
  TAHSIN_UMMI: {
    title: "Tahsin UMMI",
    min: 6,
    max: 10,
    color: "border-l-sky-600",
  },
} as const;

function ExtraGroupForm({ semesterId, program, staff, group }: {
  semesterId: string;
  program: Program;
  staff: Staff[];
  group?: Group;
}) {
  return (
    <MasterForm label={group ? "Simpan perubahan" : "Tambah halaqah ekstra"} resetOnSuccess={!group}>
      <Hidden name="operation" value="extraGroup" />
      <Hidden name="semesterId" value={semesterId} />
      <Hidden name="groupId" value={group?.id ?? ""} />
      <Hidden name="program" value={program} />
      <Field label="Nama halaqah" name="name" defaultValue={group?.name} maxLength={80} required />
      <Select label="Muhaffizh" name="teacherId" defaultValue={group?.teacher.id} required>
        <option value="" disabled>Pilih Muhaffizh</option>
        {staff.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
      </Select>
    </MasterForm>
  );
}

function RosterForm({ semesterId, program, group, students }: {
  semesterId: string;
  program: Program;
  group: Group;
  students: Student[];
}) {
  const memberIds = new Set(group.members.map(({ student }) => student.id));
  return (
    <MasterForm label="Simpan anggota">
      <Hidden name="operation" value="extraRoster" />
      <Hidden name="semesterId" value={semesterId} />
      <Hidden name="groupId" value={group.id} />
      <Hidden name="program" value={program} />
      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="mb-1 text-sm font-semibold">Anggota halaqah ({group.members.length})</legend>
        <p className="text-xs text-muted-foreground">Satu santri hanya dapat terdaftar pada satu program ekstra di semester ini.</p>
        <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
          {students.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Belum ada data santri.</p> : (
            <ul className="divide-y divide-border">
              {students.map((student) => (
                <li key={student.id}>
                  <label className="flex min-h-11 items-center gap-3 px-3 text-sm hover:bg-muted/50">
                    <input type="checkbox" name="studentIds" value={student.id} defaultChecked={memberIds.has(student.id)} />
                    <span className="min-w-0 flex-1 truncate">{student.fullName}</span>
                    <span className="text-xs text-muted-foreground">{student.nis}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </fieldset>
    </MasterForm>
  );
}

export function ExtraGroupPanel({ semesterId, program, groups, staff, students, editable }: {
  semesterId: string;
  program: Program;
  groups: Group[];
  staff: Staff[];
  students: Student[];
  editable: boolean;
}) {
  const info = programInfo[program];
  return (
    <section className={`${card} border-l-4 ${info.color}`}>
      <header>
        <h2 className="text-lg font-bold">{info.title} <span className="text-sm font-normal text-muted-foreground">({groups.length}/{info.max})</span></h2>
        <p className="mt-1 text-xs text-muted-foreground">Disiapkan {info.min}–{info.max} halaqah, masing-masing dengan Muhaffizh berbeda.</p>
      </header>
      {editable && groups.length < info.max && (
        <details>
          <summary className="cursor-pointer rounded-xl border border-dashed border-border px-3 py-2 text-sm font-semibold">Tambah halaqah</summary>
          <div className="mt-3"><ExtraGroupForm semesterId={semesterId} program={program} staff={staff} /></div>
        </details>
      )}
      {groups.length === 0 && <p className="text-sm text-muted-foreground">Belum ada halaqah ekstra.</p>}
      <ul className="divide-y divide-border">
        {groups.map((group) => (
          <li key={group.id} className="space-y-2 py-3">
            <div>
              <p className="font-semibold">{group.name}</p>
              <p className="text-sm text-muted-foreground">{group.teacher.displayName} · {group.members.length} santri</p>
            </div>
            {editable && (
              <div className="grid gap-2">
                <details>
                  <summary className="cursor-pointer py-1 text-sm font-medium text-muted-foreground">Atur anggota</summary>
                  <div className="mt-2"><RosterForm {...{ semesterId, program, group, students }} /></div>
                </details>
                <details>
                  <summary className="cursor-pointer py-1 text-sm font-medium text-muted-foreground">Ubah kelompok</summary>
                  <div className="mt-2"><ExtraGroupForm {...{ semesterId, program, staff, group }} /></div>
                </details>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
