const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;
const PORT = process.env.ELECTRON_PORT || "3210";
const HOST = "127.0.0.1";
const devUrl = process.env.ELECTRON_START_URL || "http://localhost:3000";

let nextServer;

function ensureDesktopDatabase() {
  const sourceDb = path.join(process.resourcesPath, "app", "prisma", "dev.db");
  const targetDir = app.getPath("userData");
  const targetDb = path.join(targetDir, "weichafe.db");

  if (!fs.existsSync(targetDb)) {
    fs.mkdirSync(targetDir, { recursive: true });
    if (fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, targetDb);
    } else {
      fs.closeSync(fs.openSync(targetDb, "a"));
    }
  }

  return `file:${targetDb}`;
}

function waitForServer(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tryConnect = async () => {
      try {
        const response = await fetch(url);
        if (response.ok || response.status === 404) {
          resolve();
          return;
        }
      } catch {
        // Retry until timeout.
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error("Next server did not start in time"));
        return;
      }

      setTimeout(tryConnect, 500);
    };

    tryConnect();
  });
}

function ensureDesktopSecret() {
  const crypto = require("crypto");
  const dir = app.getPath("userData");
  fs.mkdirSync(dir, { recursive: true });
  const secretFile = path.join(dir, "auth-secret");
  if (!fs.existsSync(secretFile)) {
    fs.writeFileSync(secretFile, crypto.randomBytes(32).toString("hex"));
  }
  return fs.readFileSync(secretFile, "utf-8").trim();
}

function startPackagedServer() {
  if (isDev) {
    return Promise.resolve();
  }

  const serverPath = path.join(process.resourcesPath, "app", ".next", "standalone", "server.js");
  const databaseUrl = ensureDesktopDatabase();
  const authSecret = ensureDesktopSecret();

  nextServer = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: authSecret,
      NODE_ENV: "production",
      HOSTNAME: HOST,
      PORT,
    },
    stdio: "inherit",
  });

  return waitForServer(`http://${HOST}:${PORT}`);
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    icon: path.join(__dirname, "..", "public", "weichafe.jpg"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (isDev) {
    await win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadURL(`http://${HOST}:${PORT}`);
  }
}

app.whenReady().then(async () => {
  try {
    await startPackagedServer();
    await createWindow();
  } catch (error) {
    console.error(error);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (nextServer && !nextServer.killed) {
    nextServer.kill("SIGTERM");
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});
