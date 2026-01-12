import { execSync } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { workflow } from "workflow/vite";

export default defineConfig({
  plugins: [
    {
      name: "drizzle",
      buildStart() {
        console.log("🔄 Generating drizzle SQL...");
        execSync("bun run db:generate", { stdio: "inherit" });
        console.log("✅ Drizzle SQL generated");
      },
      closeBundle() {
        const srcDir = resolve(__dirname, "drizzle");
        const destDir = resolve(__dirname, ".output/drizzle");
        if (existsSync(srcDir)) {
          cpSync(srcDir, destDir, { recursive: true });
          console.log("✅ drizzle folder copied to .output/drizzle");
        }
      },
    },

    workflow({
      dirs: ["./server/workflows"],
    }),
    tanstackRouter(),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    devtools(),
    nitro(),
    viteReact({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
  nitro: {
    serverDir: "./server",
    modules: ["workflow/nitro"],
    externals: {
      inline: ["unique-names-generator"],
    },
  },
});
