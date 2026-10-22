"use client";

import { useRouter } from "next/navigation";
import { IconBack } from "./Icons";

// Volver: regresa a la pantalla anterior (mismo día del calendario, misma posición).
// Si se llegó directo (desde una notificación), va al inicio.
export default function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className={`inline-flex items-center rounded-full bg-card p-2 ${className}`}
      aria-label="Retour / Volver"
    >
      <IconBack className="h-5 w-5" />
    </button>
  );
}
