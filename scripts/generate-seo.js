/**
 * Build-time SEO snapshot: pull the live catalog and write product URLs
 * into sitemap.xml so Google can discover items by name.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://sellehshopkenya.co.ke";
const SHEET =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS9E155mSDJImVmnI48IfC7GZP5bAOhzWpAZ6EZfk00ktdxKkydzbPDcg1KIK7FW8NDPjvByCE_NLDR/pub?gid=2109747360&single=true&output=csv";

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
  });
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (!lines.length) return [];
  const parseLine = (line) => {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (c === "," && !inQ) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => {
      row[h] = (cols[j] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

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

async function main() {
  let products = [];
  try {
    const csv = await fetchText(SHEET);
    products = parseCsv(csv)
      .map((r) => ({
        name: r.Name || r.name || "",
        category: r.Category || r.category || "",
        price: r.Price || r.price || "",
        image: r.Image || r.image || "",
        description: r.Description || r.description || "",
      }))
      .filter((p) => p.name && !/^example\b/i.test(p.name));
  } catch (err) {
    console.warn("generate-seo: catalog fetch skipped:", err.message);
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
    const slug = slugify(p.name);
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
  fs.writeFileSync(
    path.join(ROOT, "catalog.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        products: products.map((p) => ({
          name: p.name,
          category: p.category,
          price: p.price,
          image: p.image,
          description: p.description,
          slug: slugify(p.name),
        })),
      },
      null,
      2
    )
  );
  console.log("generate-seo: wrote sitemap.xml with", urls.length, "URLs and", products.length, "products");
}

main().catch((err) => {
  console.warn("generate-seo failed (deploy continues):", err.message);
  process.exit(0);
});
