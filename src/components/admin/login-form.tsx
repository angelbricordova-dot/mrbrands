"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { Wordmark } from "@/components/shop/wordmark";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/admin";
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form className="login__form" action={action}>
      <Wordmark href="/" />
      <div>
        <h1>Panel de la tienda</h1>
        <p>Pedidos, productos, tasa BCV y delivery, todo en un sitio.</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <label className="a-field">
        <span>Contraseña</span>
        <input className="a-input" type="password" name="password" autoComplete="current-password" required autoFocus aria-invalid={state?.error ? true : undefined} />
      </label>
      {state?.error && (
        <p className="login__err" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="a-btn a-btn--ink" disabled={pending} aria-busy={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
