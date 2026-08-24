/**
 * SELLEH SHOP KENYA — Site configuration
 * Edit the values below to control contact info and socials.
 * Products live in catalog.json — push that file to update the shop.
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

  // Catalog is catalog.json in this repo. Push a new file to update products.
  catalogUrl: "catalog.json",

  // How often (in minutes) the page re-checks customer reviews
  // while a visitor is browsing.
  refreshMinutes: 1,

  // Customer ratings are stored on the site.
  reviewsApiUrl: "/api/reviews",

  siteUrl: "https://sellehshopkenya.co.ke/",
  storeName: "Selleh Shop Kenya",
  tagline: "Shop online or in-store at Gaborone Plaza, Nairobi",
};
