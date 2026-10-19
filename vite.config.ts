import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const appBase = env.VITE_APP_BASE ?? "/";

  return {
    base: appBase,
    plugins: [react()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          // Structure des fichiers de sortie
          entryFileNames: "assets/js/[name]-[hash].js",
          chunkFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: (assetInfo) => {
            if (!assetInfo || !assetInfo.name) {
              return "assets/[name]-[hash][extname]";
            }
            const info = assetInfo.name.split(".");
            const ext = info[info.length - 1];
            if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            return `assets/${ext}/[name]-[hash][extname]`;
          },
        },
      },
    },
    resolve: {
      preserveSymlinks: true,
      alias: {
        // Force tout le monde à utiliser le même React
        "@": resolve(__dirname, "src"),
        react: resolve(__dirname, "node_modules/react"),
        "react-dom": resolve(__dirname, "node_modules/react-dom"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/shared/styles/variables" as *;`,
        },
      },
    },
    server: {
      watch: {
        // Surveille les changements dans ton module lié
        followSymlinks: true,
        ignored: ["!**/node_modules/@uvcdr/**"],
      },
    },
  };
});
