import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteCompression from "vite-plugin-compression";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { workflow } from "workflow/vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // 合并小 chunk，减少文件数量

        manualChunks(id: string) {
          // React 核心
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/")
          ) {
            return "vendor-react";
          }
          // TanStack 系列
          if (
            id.includes("node_modules/@tanstack/react-query") ||
            id.includes("node_modules/@tanstack/react-router")
          ) {
            return "vendor-tanstack";
          }
          // CodeMirror 编辑器
          if (
            id.includes("node_modules/@codemirror") ||
            id.includes("node_modules/codemirror") ||
            id.includes("node_modules/@replit/codemirror")
          ) {
            return "vendor-codemirror";
          }

          // UI 组件库
          if (
            id.includes("node_modules/@radix-ui") ||
            id.includes("node_modules/@base-ui") ||
            id.includes("node_modules/radix-ui") ||
            id.includes("node_modules/cmdk") ||
            id.includes("node_modules/sonner")
          ) {
            return "vendor-ui";
          }
          // 图标库
          if (
            id.includes("node_modules/lucide-react") ||
            id.includes("node_modules/@tabler/icons-react") ||
            id.includes("node_modules/@react-symbols")
          ) {
            return "vendor-icons";
          }
          // AI 相关
          if (
            id.includes("node_modules/ai") ||
            id.includes("node_modules/@ai-sdk")
          ) {
            return "vendor-ai";
          }
          // KaTeX 数学公式
          if (id.includes("node_modules/katex")) {
            return "vendor-katex";
          }
        },
      },
    },
    cssCodeSplit: true,
    minify: "esbuild",
  },
  plugins: [
    {
      name: "drizzle",
      // buildStart() {
      //   if (generated) {
      //     return;
      //   }
      //   console.log("🔄 Generating drizzle SQL...");
      //   execSync("bun run db:generate", { stdio: "inherit" });
      //   generated = true;
      //   console.log("✅ Drizzle SQL generated");
      // },
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
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 10240, // 大于 10KB 才压缩
      deleteOriginFile: false, // 保留原文件
    }),
  ],
  nitro: {
    preset: "bun",
    serverDir: "./server",
    modules: ["workflow/nitro"],
    externals: {
      inline: ["unique-names-generator"],
    },
  },
});
