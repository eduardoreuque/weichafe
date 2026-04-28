"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ActionResult } from "@/app/actions";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function createUserAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { ok: false, error: "No autorizado" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!name || !email || !password) {
    return { ok: false, error: "Nombre, correo y contraseña son requeridos" };
  }
  if (password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres" };
  }
  if (!["ADMIN", "STAFF"].includes(role)) {
    return { ok: false, error: "Rol inválido" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Ya existe un usuario con ese correo" };
  }

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role,
      },
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo crear el usuario. Intenta nuevamente." };
  }
}

export async function deleteUserAction(userId: string): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }
  if (session.id === userId) {
    return; // no puede eliminarse a sí mismo
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}

export async function changePasswordAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { ok: false, error: "No autorizado" };
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!userId || !newPassword) {
    return { ok: false, error: "Datos requeridos" };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo cambiar la contraseña." };
  }
}
