// =============================================================================
// seo.plugin.js — build-time SEO for the SPA
// =============================================================================
// Reads the same VITE_* env vars as the app and:
//   1. Injects JSON-LD (ExerciseGym + WebSite + FAQPage) into index.html
//   2. Puts crawlable fallback content inside #root (React replaces it on load)
//   3. Preloads the two above-the-fold font files
//   4. Writes sitemap.xml and robots.txt (with the absolute Sitemap URL) to dist
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import { FAQ, FACILITIES, CLASSES, AMENITIES, HOURS } from "./src/content/gymContent.js";

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Keep JSON-LD safe inside <script>
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

function phone(raw = "") {
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10) d = `91${d}`;
  const local = d.slice(-10);
  return { e164: `+${d}`, display: `${local.slice(0, 5)} ${local.slice(5)}` };
}

const PRIVATE_PATHS = [
  "/admin", "/profile", "/subscription", "/verify-otp",
  "/forgot-password", "/forgot-otp", "/reset-password",
];

export default function seoPlugin() {
  let env = {};
  let outDir = "dist";

  return {
    name: "hulk-gym-seo",

    configResolved(config) {
      env = loadEnv(config.mode, config.envDir || config.root, "VITE_");
      outDir = path.resolve(config.root, config.build.outDir);
    },

    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const site = (env.VITE_SITE_URL || "").replace(/\/$/, "");
        const city = env.VITE_GYM_CITY || "Kota";
        const tel = phone(env.VITE_GYM_PHONE);
        const address = env.VITE_GYM_ADDRESS || "";
        const insta = env.VITE_GYM_INSTAGRAM_URL || "";
        const email = env.VITE_GYM_EMAIL || "";
        const hours = `${HOURS.daysLabel} · ${HOURS.slots.map((s) => s.label).join(" & ")}`;
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const openingHours = HOURS.slots.map((s) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: HOURS.days.map((d) => `https://schema.org/${dayNames[d]}`),
          opens: s.open,
          closes: s.close,
        }));
        const amenities = AMENITIES.filter((a) => a.show).map((a) => ({
          "@type": "LocationFeatureSpecification",
          name: a.title,
          value: true,
        }));
        const offers = [...FACILITIES, ...CLASSES].filter((i) => i.show).map((i) => i.title);
        const faq = FAQ.filter((f) => f.show);

        const gym = {
          "@context": "https://schema.org",
          "@type": "ExerciseGym",
          name: "Hulk Gym",
          description: `Strength gym in ${city} — ${offers.join(", ").toLowerCase() || "strength training"}. Join online or at the desk.`,
          ...(site && { url: `${site}/`, image: `${site}/og-image.jpg`, logo: `${site}/icon-512.png` }),
          ...(tel && { telephone: tel.e164 }),
          ...(email && { email }),
          address: {
            "@type": "PostalAddress",
            ...(address && { streetAddress: address }),
            addressLocality: city,
            addressRegion: "Rajasthan",
            addressCountry: "IN",
          },
          openingHoursSpecification: openingHours,
          ...(amenities.length && { amenityFeature: amenities }),
          ...(env.VITE_GYM_MAPS_URL && {
            hasMap: /^https?:\/\//.test(env.VITE_GYM_MAPS_URL) ? env.VITE_GYM_MAPS_URL : `https://${env.VITE_GYM_MAPS_URL}`,
          }),
          ...(insta && { sameAs: [insta] }),
          currenciesAccepted: "INR",
          paymentAccepted: "Cash, UPI, Credit Card, Debit Card, Net Banking",
        };

        const website = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Hulk Gym",
          ...(site && { url: `${site}/` }),
          inLanguage: "en-IN",
        };

        const faqLd = faq.length && {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        };

        // Crawlable fallback — replaced by React as soon as JS runs
        const fallback = `
      <main style="max-width:720px;margin:0 auto;padding:48px 20px;font-family:system-ui,sans-serif;color:#edede8">
        <h1>Hulk Gym, ${esc(city)} — Strength training gym</h1>
        <p>${esc(gym.description)}</p>
        ${offers.length ? `<ul>${offers.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>` : ""}
        ${address ? `<p>Address: ${esc(address)}</p>` : ""}
        ${hours ? `<p>Hours: ${esc(hours)}</p>` : ""}
        ${tel ? `<p>Call: <a href="tel:${tel.e164}" style="color:#f3d400">${tel.display}</a></p>` : ""}
        <p><a href="/register" style="color:#f3d400">Join online</a> · <a href="/login" style="color:#f3d400">Member login</a></p>
      </main>`;

        const tags = [
          { tag: "script", attrs: { type: "application/ld+json" }, children: jsonLd(gym), injectTo: "head" },
          { tag: "script", attrs: { type: "application/ld+json" }, children: jsonLd(website), injectTo: "head" },
        ];
        if (faqLd) {
          tags.push({ tag: "script", attrs: { type: "application/ld+json" }, children: jsonLd(faqLd), injectTo: "head" });
        }

        // Preload the hero fonts (production build only — dev has no bundle)
        if (ctx.bundle) {
          for (const file of Object.keys(ctx.bundle)) {
            if (/big-shoulders-display-latin-900-normal.*\.woff2$|inter-tight-latin-400-normal.*\.woff2$/.test(file)) {
              tags.push({
                tag: "link",
                attrs: { rel: "preload", href: `/${file}`, as: "font", type: "font/woff2", crossorigin: "" },
                injectTo: "head-prepend",
              });
            }
          }
        }

        return { html: html.replace('<div id="root"></div>', `<div id="root">${fallback}\n    </div>`), tags };
      },
    },

    // After Vite has written dist (incl. /public), add generated files
    closeBundle() {
      const site = (env.VITE_SITE_URL || "").replace(/\/$/, "");
      if (!fs.existsSync(outDir)) return;

      const robots = [
        "User-agent: *",
        ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`),
        "Allow: /",
        ...(site ? ["", `Sitemap: ${site}/sitemap.xml`] : []),
        "",
      ].join("\n");
      fs.writeFileSync(path.join(outDir, "robots.txt"), robots);

      if (site) {
        const today = new Date().toISOString().slice(0, 10);
        const urls = [
          { loc: "/", priority: "1.0", freq: "weekly" },
          { loc: "/register", priority: "0.6", freq: "monthly" },
          { loc: "/contact", priority: "0.7", freq: "monthly" },
          { loc: "/privacy", priority: "0.2", freq: "yearly" },
          { loc: "/terms", priority: "0.2", freq: "yearly" },
          { loc: "/refund-policy", priority: "0.2", freq: "yearly" },
          { loc: "/login", priority: "0.3", freq: "yearly" },
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${site}${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`)
  .join("\n")}
</urlset>
`;
        fs.writeFileSync(path.join(outDir, "sitemap.xml"), xml);
      }
    },
  };
}
