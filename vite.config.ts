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
    workflow(),
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
