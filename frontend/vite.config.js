import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import seoPlugin from "./seo.plugin.js";

export default defineConfig({
  plugins: [react(), tailwindcss(), seoPlugin()],
});
