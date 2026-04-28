const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outDir = path.join(root, "installers");

const patterns = [
  { dir: "dist-electron", exts: [".dmg", ".zip", ".AppImage", ".msi"], fileNameIncludes: [] },
  { dir: "dist-electron", exts: [".exe"], fileNameIncludes: ["Setup"] },
  { dir: "android/app/build/outputs/apk", exts: [".apk"], fileNameIncludes: [] },
  { dir: "android/app/build/outputs/bundle", exts: [".aab"], fileNameIncludes: [] },
  { dir: "ios", exts: [".ipa"], fileNameIncludes: [] },
];

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function walk(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(full));
    } else {
      result.push(full);
    }
  }
  return result;
}

function copyUnique(srcFile) {
  const fileName = path.basename(srcFile);
  const target = path.join(outDir, fileName);
  fs.copyFileSync(srcFile, target);
  return target;
}

ensureDir(outDir);

let copied = 0;
for (const group of patterns) {
  const absDir = path.join(root, group.dir);
  const files = walk(absDir).filter((f) => {
    const extMatch = group.exts.includes(path.extname(f));
    if (!extMatch) return false;

    if (!group.fileNameIncludes || group.fileNameIncludes.length === 0) {
      return true;
    }

    const base = path.basename(f);
    return group.fileNameIncludes.some((token) => base.includes(token));
  });
  for (const file of files) {
    copyUnique(file);
    copied += 1;
  }
}

if (copied === 0) {
  console.log("No se encontraron instaladores aun. Generalos y vuelve a ejecutar este script.");
} else {
  console.log(`Instaladores reunidos en ${outDir}. Total: ${copied}`);
}
