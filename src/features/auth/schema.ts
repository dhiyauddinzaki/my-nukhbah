import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Masukkan alamat email yang valid.").max(254),
  password: z.string().min(1, "Masukkan kata sandi.").max(256),
});

export type LoginInput = z.infer<typeof loginSchema>;
