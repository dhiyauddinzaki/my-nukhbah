import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <h1 className="text-2xl font-bold">Halaman tidak tersedia</h1>
      <Button asChild className="mt-5"><Link href="/">Kembali ke halaman utama</Link></Button>
    </main>
  );
}
