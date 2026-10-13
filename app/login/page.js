"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Pagina /login del cancello (prompt A8): un solo campo password, invia a
// /api/auth/login. Non passa dal layout con la barra di navigazione: è
// intenzionalmente una schermata a sé, indipendente dal resto della dashboard.
export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState(null);
  const [inviando, setInviando] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setInviando(true);
    setErrore(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrore(json.error || "Password errata");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setErrore("Errore di rete");
    } finally {
      setInviando(false);
    }
  }

  return (
    <div className="login-schermo">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Il mio assistente</h1>
        <p className="login-sottotitolo">Inserisci la password per continuare</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        {errore && <p className="login-errore">{errore}</p>}
        <button type="submit" disabled={inviando || !password}>
          {inviando ? "Verifico..." : "Entra"}
        </button>
      </form>
    </div>
  );
}
