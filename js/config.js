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
    latitude: -1.286389,
    longitude: 36.817223,
  },

  // ── LIVE PRODUCT FEED ────────────────────────────────────────────
  // Catalog Google Sheet (edit in Drive):
  // https://docs.google.com/spreadsheets/d/1DZjoMganpZf033Fl3NOMnoRVIz0aXtpOETaOgWSt62w/edit
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS9E155mSDJImVmnI48IfC7GZP5bAOhzWpAZ6EZfk00ktdxKkydzbPDcg1KIK7FW8NDPjvByCE_NLDR/pub?gid=2109747360&single=true&output=csv",

  // How often (in minutes) the page re-checks the sheet for changes
  // while a visitor is browsing, in addition to loading fresh data
  // on every page visit/refresh.
  refreshMinutes: 5,

  // Customer ratings are stored on the site (not in the product sheet).
  reviewsApiUrl: "/api/reviews",

  siteUrl: "https://sellehshopkenya.co.ke/",
  storeName: "Selleh Shop Kenya",
  tagline: "Shop online or in-store at Gaborone Plaza, Nairobi",
};
