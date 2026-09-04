"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { clearSessionCookie } from "@/lib/auth";
import { ActionResult } from "@/app/actions";
import {
  isRecoveryEnabled,
  verifyRecoveryCode,
  isLocked,
  registerFailure,
  resetAttempts,
} from "@/lib/recovery";

export async function recoverPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isRecoveryEnabled()) {
    return { ok: false, error: "La recuperación está desactivada en este servidor." };
  }

  const headersList = await headers();
  const clientId = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isLocked(clientId)) {
    return { ok: false, error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." };
  }

  const code = String(formData.get("code") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!code) {
    return { ok: false, error: "Ingresa el código de recuperación." };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }

  if (!verifyRecoveryCode(code)) {
    const { locked } = registerFailure(clientId);
    return {
      ok: false,
      error: locked
        ? "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo."
        : "Código de recuperación incorrecto.",
    };
  }

  // Cuál cuenta se restaura: la indicada en RECOVERY_EMAIL, o el primer ADMIN.
  const targetEmail = (process.env.RECOVERY_EMAIL || "").trim().toLowerCase() || undefined;
  const targetUser = targetEmail
    ? await prisma.user.findUnique({ where: { email: targetEmail } })
    : await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });

  if (!targetUser) {
    return { ok: false, error: "No se encontró una cuenta de administrador para recuperar." };
  }

  try {
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
  } catch {
    return { ok: false, error: "No se pudo actualizar la contraseña. Intenta nuevamente." };
  }

  resetAttempts(clientId);
  await clearSessionCookie();
  return { ok: true };
}