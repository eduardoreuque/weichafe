import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.weichafe.app",
  appName: "Weichafe",
  webDir: "out",
  server: {
    androidScheme: "http",
    iosScheme: "http",
    url: "http://54.226.22.80:3000",
    cleartext: true,
  },
};

export default config;
