import { Field, Hidden, Select } from "./master-fields";
import { MasterForm } from "./master-form";

type Student = { id: string; nis: string; fullName: string };
type Groups = { id: string; name: string }[];
type Assignment = { classroomId: string | null; roomId: string | null; halaqahId: string | null };

export function StudentForm({ student }: { student?: Student }) {
  return (
    <MasterForm label={student ? "Simpan identitas" : "Tambah santri"} resetOnSuccess={!student}>
      <Hidden name="operation" value="student" />
      <Hidden name="studentId" value={student?.id ?? ""} />
      <Field label="NIS" name="nis" defaultValue={student?.nis} maxLength={32} required />
      <Field label="Nama lengkap" name="fullName" defaultValue={student?.fullName} maxLength={120} required />
    </MasterForm>
  );
}

export function AssignmentForm({ studentId, semesterId, assignment, classrooms, rooms, halaqahs }: {
  studentId: string;
  semesterId: string;
  assignment?: Assignment;
  classrooms: Groups;
  rooms: Groups;
  halaqahs: Groups;
}) {
  const fields = [
    { name: "classroomId", label: "Kelas", options: classrooms, value: assignment?.classroomId },
    { name: "roomId", label: "Kamar", options: rooms, value: assignment?.roomId },
    { name: "halaqahId", label: "Halaqah", options: halaqahs, value: assignment?.halaqahId },
  ];
  return (
    <MasterForm label="Simpan penempatan">
      <Hidden name="operation" value="enroll" />
      <Hidden name="semesterId" value={semesterId} />
      <Hidden name="studentId" value={studentId} />
      {fields.map(({ name, label, options, value }) => (
        <Select key={name} label={label} name={name} defaultValue={value ?? ""}>
          <option value="">Belum ditentukan</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </Select>
      ))}
    </MasterForm>
  );
}
