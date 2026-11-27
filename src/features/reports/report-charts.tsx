"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartDatum = { name: string; value: number; fill?: string };

export function BarReport({ data, dataKey = "value", label = "Jumlah" }: {
  data: ChartDatum[];
  dataKey?: "value";
  label?: string;
}) {
  return (
    <div className="h-72 w-full" aria-label={`Grafik ${label}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 4, left: -18, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} interval={0} angle={-18} textAnchor="end" />
          <YAxis tick={{ fontSize: 11, fill: "currentColor" }} allowDecimals={false} />
          <Tooltip cursor={{ fill: "rgba(15,118,110,.08)" }} />
          <Legend />
          <Bar dataKey={dataKey} name={label} fill="#0f766e" radius={[8, 8, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PieReport({ data }: { data: ChartDatum[] }) {
  return (
    <div className="h-64 w-full" aria-label="Grafik komposisi kehadiran">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={3}>
            {data.map((item) => <Cell key={item.name} fill={item.fill ?? "#0f766e"} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
