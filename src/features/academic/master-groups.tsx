import { Field, Hidden, Select, card } from "./master-fields";
import { MasterForm } from "./master-form";

const groupLabels = { classroom: "Kelas", room: "Kamar", halaqah: "Halaqah" } as const;
type Kind = keyof typeof groupLabels;
type Staff = { id: string; displayName: string };
type Group = { id: string; name: string; staff?: Staff | null };

function GroupForm({ kind, semesterId, staff, group }: {
  kind: Kind;
  semesterId: string;
  staff: Staff[];
  group?: Group;
}) {
  return (
    <MasterForm label={group ? "Simpan perubahan" : "Tambah " + groupLabels[kind].toLowerCase()} resetOnSuccess={!group}>
      <Hidden name="operation" value="group" />
      <Hidden name="semesterId" value={semesterId} />
      <Hidden name="groupId" value={group?.id ?? ""} />
      <Hidden name="kind" value={kind} />
      <Field label="Nama" name="name" defaultValue={group?.name} maxLength={80} required />
      {kind === "classroom" ? <Hidden name="staffId" value="" /> : (
        <Select label={kind === "room" ? "Murabbi" : "Muhaffizh"} name="staffId" defaultValue={staff.find(({ id }) => id === group?.staff?.id)?.id ?? ""}>
          <option value="">Belum ditentukan</option>
          {group?.staff && !staff.some(({ id }) => id === group.staff?.id) && (
            <option value={group.staff.id} disabled>{group.staff.displayName} (tidak aktif)</option>
          )}
          {staff.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
        </Select>
      )}
    </MasterForm>
  );
}

export function GroupPanel({ kind, semesterId, groups, staff, editable }: {
  kind: Kind;
  semesterId: string;
  groups: Group[];
  staff: Staff[];
  editable: boolean;
}) {
  return (
    <section className={card}>
      <h2 className="text-lg font-bold">{groupLabels[kind]} <span className="text-sm font-normal text-muted-foreground">({groups.length})</span></h2>
      {editable && <GroupForm kind={kind} semesterId={semesterId} staff={staff} />}
      {groups.length === 0 && <p className="text-sm text-muted-foreground">Belum ada data.</p>}
      <ul className="divide-y divide-border">
        {groups.map((group) => (
          <li key={group.id} className="py-2 text-sm">
            <p className="font-semibold">{group.name}</p>
            {group.staff && <p className="text-muted-foreground">{group.staff.displayName}</p>}
            {editable && (
              <details className="mt-1">
                <summary className="cursor-pointer py-1 text-muted-foreground">Ubah kelompok</summary>
                <GroupForm kind={kind} semesterId={semesterId} staff={staff} group={group} />
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
