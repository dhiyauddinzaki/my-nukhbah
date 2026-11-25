"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "./actions";
import { loginSchema, type LoginInput } from "./schema";

const inputStyle = "mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary";

export function LoginForm({ configured }: { configured: boolean }) {
  const [message, setMessage] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(async (values) => {
      setMessage("");
      const result = await signIn(values);
      if (result?.error) setMessage(result.error);
    })}>
      <div>
        <label htmlFor="email" className="text-sm font-semibold">Email akun</label>
        <input id="email" className={inputStyle} type="email" autoComplete="username" placeholder="nama@email.com"
          aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
        {errors.email && <p id="email-error" className="mt-2 text-sm text-red-700 dark:text-red-300">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-semibold">Kata sandi</label>
        <input id="password" className={inputStyle} type="password" autoComplete="current-password"
          aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} />
        {errors.password && <p id="password-error" className="mt-2 text-sm text-red-700 dark:text-red-300">{errors.password.message}</p>}
      </div>
      {message && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{message}</p>}
      {!configured && <p role="status" className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Layanan masuk belum dikonfigurasi.</p>}
      <Button type="submit" className="w-full justify-between" disabled={!configured || isSubmitting}>
        {isSubmitting ? "Memeriksa akun…" : "Masuk"} <ArrowRight className="size-4" aria-hidden />
      </Button>
    </form>
  );
}
