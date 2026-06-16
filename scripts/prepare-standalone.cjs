const fs = require("fs");
const path = require("path");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const publicDir = path.join(root, "public");
const staticDir = path.join(root, ".next", "static");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) {
    return;
  }

  ensureDir(path.dirname(to));
  fs.cpSync(from, to, { recursive: true });
}

if (!fs.existsSync(standaloneDir)) {
  throw new Error("No se encontro .next/standalone. Ejecuta npm run build primero.");
}

copyDir(publicDir, path.join(standaloneDir, "public"));
copyDir(staticDir, path.join(standaloneDir, ".next", "static"));
// Incluir las migraciones y schema de Prisma en el standalone para poder aplicar migraciones en el servidor
copyDir(path.join(root, "prisma"), path.join(standaloneDir, "prisma"));

// Crear directorio uploads vacío en el standalone (en prod se usa UPLOAD_DIR externo)
ensureDir(path.join(standaloneDir, "public", "uploads"));

// Agregar .gitkeep para que el directorio se mantenga
fs.writeFileSync(path.join(standaloneDir, "public", "uploads", ".gitkeep"), "");

console.log("Standalone listo para Electron/EC2.");
