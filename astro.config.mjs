// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel/serverless";

import { template } from "./src/settings";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
    integrations: [react(), tailwind(), sitemap()],
    site: template.website_url,
    base: template.base,
    output: "server",
    adapter: vercel({
      includeFiles: ['./public/pdfs/**/*']
    }),
    vite: {
        server: {
            hmr: {
                timeout: 10000,
                overlay: false,
            },
            watch: {
                usePolling: true,
                interval: 1000,
            },
        },
    },
});
