import { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";

const input = z.object({
  SEED_AUTH_USER_ID: z.uuid(),
  SEED_DISPLAY_NAME: z.string().trim().min(1).max(100),
  SEED_ROLE: z.enum(Role),
}).parse(process.env);

const db = new PrismaClient();

async function main() {
  const account = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM auth.users WHERE id = ${input.SEED_AUTH_USER_ID}::uuid
  `;
  if (!account.length) throw new Error("UUID belum terdaftar di Supabase Authentication.");

  await db.profile.upsert({
    where: { id: input.SEED_AUTH_USER_ID },
    update: {},
    create: {
      id: input.SEED_AUTH_USER_ID,
      displayName: input.SEED_DISPLAY_NAME,
      role: input.SEED_ROLE,
    },
  });
  console.log("Profil tersedia. Seed mempertahankan role profil yang sudah ada.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
