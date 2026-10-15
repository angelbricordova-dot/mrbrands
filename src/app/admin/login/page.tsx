import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="admin login">
      <div className="login__art" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/story/tienda-llena.webp" alt="" width={720} height={900} />
      </div>
      <Suspense fallback={<div className="login__form" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
