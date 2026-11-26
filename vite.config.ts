import { defineConfig } from "vite";

export default defineConfig({
  build: {
    cssMinify: true,
    assetsInlineLimit: 4096,
  },
});
