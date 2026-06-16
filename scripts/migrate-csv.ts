/**
 * Script para migrar datos desde el CSV del sistema antiguo a la base de datos Weichafe.
 * 
 * Uso:
 *   npx tsx scripts/migrate-csv.ts <ruta-del-csv>
 * 
 * Ejemplo:
 *   npx tsx scripts/migrate-csv.ts "C:\Users\Perro-Guaton\Downloads\Hoja de cálculo sin título - Listado_de_clientes---09_Jun_2026_18_00_23 (1).csv"
 */

import { PrismaClient, Discipline } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const prisma = new PrismaClient();

interface CsvRow {
  id: string;
  rut: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  birthDate: string;
  receivesEmail: string;
  isActive: string;
  hasFingerprint: string;
  isDebtor: string;
  debtReason: string;
  balance: string;
  registeredAt: string;
  notes: string;
  emergencyContact: string;
  emergencyPhone: string;
  company: string;
  sede: string;
  department: string;
  lastPlan: string;
  inactivityDays: string;
  daysSinceLastAttendance: string;
  totalAttendancesLastMonth: string;
  daysAttendedLastMonth: string;
  failedAttemptsLastMonth: string;
  daysFailedAttemptsLastMonth: string;
  totalAttendancesCurrentMonth: string;
  daysAttendedCurrentMonth: string;
  failedAttemptsCurrentMonth: string;
  daysFailedAttemptsCurrentMonth: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(raw: string): Date | null {
  if (!raw || raw.trim() === "" || raw === "1111-11-11") return null;
  // Try different formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})\s*(\d{2}:\d{2}:\d{2})?$/,
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
  ];

  for (const fmt of formats) {
    const match = raw.match(fmt);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        return date;
      }
    }
  }
  return null;
}

function parseRut(raw: string): string | null {
  if (!raw || raw.trim() === "" || raw.length < 3) return null;
  // Clean RUT: remove dots, spaces
  let cleaned = raw.trim().replace(/\./g, "").replace(/\s/g, "");
  // If it has letters but doesn't look like a valid RUT, skip
  if (/^[A-Z]{2,}$/i.test(cleaned)) return null;
  if (cleaned.length < 3 || cleaned.length > 15) return null;
  // Skip if it's all X's or obviously fake
  if (/^X+$/i.test(cleaned)) return null;
  if (/^\d+$/.test(cleaned) && cleaned.length < 4) return null;
  return cleaned.toUpperCase();
}

function parsePhone(raw: string): string | null {
  if (!raw || raw.trim() === "") return null;
  let cleaned = raw.trim();
  // Remove leading + if present
  cleaned = cleaned.replace(/^\+/, "");
  // Remove spaces
  cleaned = cleaned.replace(/\s/g, "");
  if (cleaned.length < 6) return null;
  // Skip obviously fake numbers
  if (/^1+$/.test(cleaned)) return null;
  if (/^0+$/.test(cleaned)) return null;
  if (cleaned === "+56") return null;
  return cleaned;
}

function parseNotes(raw: string, lastPlan: string, observations: string): string {
  const parts: string[] = [];
  if (observations && observations.trim() && observations !== "XXXX") {
    parts.push(observations.trim());
  }
  if (lastPlan && lastPlan.trim()) {
    parts.push(`Plan: ${lastPlan.trim()}`);
  }
  return parts.join(" | ");
}

function parseFullName(raw: string): string {
  if (!raw) return "";
  // Capitalize properly
  return raw
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 2) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

async function importRow(row: CsvRow, index: number): Promise<void> {
  const birthDate = parseDate(row.birthDate);
  if (!birthDate) {
    console.log(`  [${index}] Saltado (sin fecha nacimiento válida): ${row.fullName}`);
    return;
  }

  const rut = parseRut(row.rut);
  const fullName = parseFullName(row.fullName);
  const whatsapp = parsePhone(row.phone);
  const email = row.email && row.email.trim() && !row.email.includes("XXXX") && !row.email.includes("XXXXX")
    ? row.email.trim().toLowerCase()
    : null;
  const address = row.address && !row.address.includes("XXXX")
    ? row.address.trim()
    : null;
  const district = row.address && !row.address.includes("XXXX")
    ? extractDistrict(row.address)
    : null;
  const emergencyContact = row.emergencyContact && !row.emergencyContact.includes("XXXX")
    ? parseFullName(row.emergencyContact)
    : null;
  const emergencyPhone = parsePhone(row.emergencyPhone);
  const notes = parseNotes(row.notes, row.lastPlan, row.notes);
  const isActive = row.isActive?.toLowerCase() === "si";
  const registeredAt = parseDate(row.registeredAt);

  try {
    // Check if student already exists by RUT or name+phone
    const existing = rut
      ? await prisma.student.findFirst({ where: { rut } })
      : null;

    if (existing) {
      console.log(`  [${index}] Ya existe (RUT ${rut}): ${fullName}`);
      return;
    }

    await prisma.student.create({
      data: {
        fullName,
        rut,
        birthDate,
        email,
        whatsapp,
        address,
        district,
        emergencyContact,
        emergencyPhone,
        notes: notes || null,
        isActive,
        createdAt: registeredAt || undefined,
      },
    });
    console.log(`  [${index}] ✓ Importado: ${fullName}${rut ? ` (RUT: ${rut})` : ""}`);
  } catch (error) {
    console.error(`  [${index}] ✗ Error importando ${fullName}:`, error);
  }
}

function extractDistrict(address: string): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  const districts = [
    "la florida", "puente alto", "la granja", "san bernardo",
    "macul", "peñalolén", "la pintana", "el bosque",
    "santiago", "maipú", "buin", "pirque",
    "san josé de maipo", "la cisterna", "quinta normal",
  ];
  for (const d of districts) {
    if (lower.includes(d)) {
      return d.charAt(0).toUpperCase() + d.slice(1);
    }
  }
  return null;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Uso: npx tsx scripts/migrate-csv.ts <ruta-del-csv>");
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`Archivo no encontrado: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📂 Leyendo CSV: ${csvPath}`);
  console.log("");

  const fileStream = fs.createReadStream(csvPath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headerLine = true;
  const headers: string[] = [];
  let index = 0;
  let imported = 0;
  let skipped = 0;

  for await (const line of rl) {
    if (headerLine) {
      headers.push(...parseCSVLine(line));
      headerLine = false;
      console.log(`📋 Columnas encontradas: ${headers.length}`);
      continue;
    }

    index++;
    const values = parseCSVLine(line);

    const row: CsvRow = {
      id: values[0] || "",
      rut: values[1] || "",
      fullName: values[2] || "",
      phone: values[3] || "",
      email: values[4] || "",
      address: values[5] || "",
      birthDate: values[6] || "",
      receivesEmail: values[7] || "",
      isActive: values[8] || "",
      hasFingerprint: values[9] || "",
      isDebtor: values[10] || "",
      debtReason: values[11] || "",
      balance: values[12] || "",
      registeredAt: values[13] || "",
      notes: values[14] || "",
      emergencyContact: values[15] || "",
      emergencyPhone: values[16] || "",
      company: values[17] || "",
      sede: values[18] || "",
      department: values[19] || "",
      lastPlan: values[20] || "",
      inactivityDays: values[21] || "",
      daysSinceLastAttendance: values[22] || "",
      totalAttendancesLastMonth: values[23] || "",
      daysAttendedLastMonth: values[24] || "",
      failedAttemptsLastMonth: values[25] || "",
      daysFailedAttemptsLastMonth: values[26] || "",
      totalAttendancesCurrentMonth: values[27] || "",
      daysAttendedCurrentMonth: values[28] || "",
      failedAttemptsCurrentMonth: values[29] || "",
      daysFailedAttemptsCurrentMonth: values[30] || "",
    };

    if (row.fullName && row.fullName.trim()) {
      await importRow(row, index);
      imported++;
    } else {
      skipped++;
    }
  }

  console.log("");
  console.log("========================================");
  console.log(`📊 Resumen de importación:`);
  console.log(`   Total filas procesadas: ${index}`);
  console.log(`   Importados: ${imported}`);
  console.log(`   Saltados (sin nombre): ${skipped}`);
  console.log("========================================");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error en migración:", error);
  prisma.$disconnect();
  process.exit(1);
});