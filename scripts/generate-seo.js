/**
 * Build-time SEO snapshot: read catalog.json and write product URLs
 * into sitemap.xml so Google can discover items by name.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://sellehshopkenya.co.ke";

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&#38;")
    .replace(/</g, "&#60;")
    .replace(/>/g, "&#62;")
    .replace(/"/g, "&#34;");
}

function main() {
  let products = [];
  const catalogPath = path.join(ROOT, "catalog.json");
  try {
    const raw = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    products = (raw.products || []).filter((p) => p && p.name);
  } catch (err) {
    console.warn("generate-seo: catalog.json missing or invalid:", err.message);
  }

  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: SITE + "/", priority: "1.0", changefreq: "daily" },
    { loc: SITE + "/#shop", priority: "0.9", changefreq: "daily" },
    { loc: SITE + "/#location", priority: "0.7", changefreq: "monthly" },
    { loc: SITE + "/#contact", priority: "0.6", changefreq: "monthly" },
  ];

  const seen = new Set();
  products.forEach((p) => {
    const slug = p.slug || slugify(p.name);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    urls.push({
      loc: SITE + "/?product=" + encodeURIComponent(slug),
      priority: "0.8",
      changefreq: "daily",
    });
  });

  const body = urls
    .map(
      (u) =>
        "  <url>\n" +
        "    <loc>" +
        xmlEscape(u.loc) +
        "</loc>\n" +
        "    <lastmod>" +
        today +
        "</lastmod>\n" +
        "    <changefreq>" +
        u.changefreq +
        "</changefreq>\n" +
        "    <priority>" +
        u.priority +
        "</priority>\n" +
        "  </url>"
    )
    .join("\n");

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    "\n</urlset>\n";

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml);
  console.log("generate-seo: wrote sitemap.xml with", urls.length, "URLs from", products.length, "catalog products");
}

try {
  main();
} catch (err) {
  console.warn("generate-seo failed (deploy continues):", err.message);
  process.exit(0);
}
