/**
 * SELLEH SHOP KENYA — Site configuration
 * Edit the values below to control contact info, socials, and the
 * live product feed. See README.md for full setup instructions.
 */
const CONFIG = {
  // WhatsApp number in international format, NO plus sign, NO spaces.
  whatsappNumber: "254721213672",

  // How the phone number is displayed on the site.
  phoneDisplay: "+254 721 213 672",

  // tel: link uses the plus-sign format.
  phoneTel: "+254721213672",

  tiktokUrl: "https://www.tiktok.com/@sellehshopkenya",

  // Physical shop location.
  address: {
    line1: "Gaborone Plaza, 6th Floor, Shop C2",
    line2: "Nairobi, Kenya",
    mapsQuery: "Gaborone Plaza Nairobi",
  },

  // ── LIVE PRODUCT FEED ────────────────────────────────────────────
  // Leave this EMPTY ("") to use the sample products in
  // js/products-data.js. Once you publish your Google Sheet
  // (File → Share → Publish to web → CSV), paste that link below
  // and the website will start pulling products straight from your
  // sheet automatically — no code changes, no redeploy needed.
  //
  // Full step-by-step instructions are in README.md.
  sheetCsvUrl: "",

  // How often (in minutes) the page re-checks the sheet for changes
  // while a visitor is browsing, in addition to loading fresh data
  // on every page visit/refresh.
  refreshMinutes: 5,

  // ── REAL CUSTOMER REVIEWS (5-star + comment) ────────────────────
  // Leave both EMPTY to keep showing the honest "no fake reviews yet"
  // section. Once set up (see README.md Part 3):
  //
  // reviewFormUrl: your Google Form's pre-filled link, generated with
  // the literal text PRODUCT_NAME_HERE typed into the Product Name
  // field before copying the link — the site swaps that placeholder
  // for the real product name automatically.
  reviewFormUrl: "",
  //
  // reviewsCsvUrl: the published-to-web CSV link for the Sheet that
  // collects Form responses (same "Publish to web" steps as products).
  // Only rows where you've typed TRUE in the Approved column are ever
  // shown on the site.
  reviewsCsvUrl: "",

  storeName: "Selleh Shop Kenya",
  tagline: "Nairobi's Trusted Online Shop",
};
