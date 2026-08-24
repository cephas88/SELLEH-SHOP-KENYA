# Selleh Shop Kenya — Website

A fast, static website for Selleh Shop Kenya. Products update from a Google
Sheet — no coding needed after setup. Customer ratings are posted on the
site and appear immediately.

## What's in this project

```
index.html          The whole site (one page)
css/style.css        All styling (black / gold / white theme)
js/config.js          Contact info + the Google Sheet link
js/main.js             Shop behaviour (search, ratings, WhatsApp)
assets/               Logo files
robots.txt / sitemap.xml   Search engine files
netlify.toml            Hosting config
netlify/functions       Stores customer reviews
```

The catalog on the website is **only** what is in the Google Sheet. Add a
product there and it appears on the shop; remove it and it disappears.

---

## Part 1 — Site status (GitHub + Netlify + domain)

The shop is already live:

- Website: [https://sellehshopkenya.co.ke](https://sellehshopkenya.co.ke)
- GitHub: `cephas88/SELLEH-SHOP-KENYA` (Netlify auto-deploys every push to `main`)
- Catalog sheet: [Selleh Shop Kenya — Products](https://docs.google.com/spreadsheets/d/1DZjoMganpZf033Fl3NOMnoRVIz0aXtpOETaOgWSt62w/edit)

The site's canonical URLs (`index.html`, `sitemap.xml`, `robots.txt`) are set to `https://sellehshopkenya.co.ke/`.

---

## Part 2 — Update products from Google Sheets (no code)

Your live catalog sheet is already in Google Drive:

**[Selleh Shop Kenya — Products](https://docs.google.com/spreadsheets/d/1DZjoMganpZf033Fl3NOMnoRVIz0aXtpOETaOgWSt62w/edit)**

- **Category, Badge, In Stock** are dropdowns — click the cell and pick. Don't type, or you'll create duplicate category tabs on the site.
- **Photos:** do **not** use Insert → Image in cell. Upload each photo at [imgbb.com](https://imgbb.com) (no account needed), copy the **Direct link** (it ends in `.jpg` / `.png` / `.webp`), and paste it into the **Image** column. The **Preview** column then shows the photo inside the sheet so you know the link works.
- Blank rows are ignored. The EXAMPLE row is skipped by the website automatically — delete it when you start adding real products.
- To add a new category: Products tab → click a Category cell → **Data → Data validation** → add another item.

### Publish the sheet so the website can read it (one-time, 30 seconds)

1. Open the sheet above.
2. **File → Share → Publish to web**.
3. Under "Link", choose the **Products** tab.
4. Change the type to **Comma-separated values (.csv)**.
5. Click **Publish**, copy the link (`https://docs.google.com/spreadsheets/d/e/2PACX-…/pub?output=csv`).
6. Paste that link in chat — it goes into `js/config.js` as `sheetCsvUrl`. After that you never touch the code again.

Edit the sheet anytime: change a price, add a row, set In Stock to FALSE. The site picks it up on the next page load (Google's cache can take 1–5 minutes).

### What each column means

| Column | Required | How you fill it | Notes |
|---|---|---|---|
| Name | Yes | Type | Product title |
| Category | Yes | **Dropdown** | Same spelling every time = one filter tab on the site |
| Price | Yes | Number | KES, numbers only (1999 not "KES 1,999") |
| Old Price | No | Number | Leave blank if not discounted. Shows strike-through + % off |
| Image | Yes | Paste imgbb **Direct link** | Upload at imgbb.com → copy Direct link → paste here |
| Preview | Auto | Leave it | Shows the photo in the sheet. Website ignores this column |
| Rating | No | 0–5 | Leave 0 until real reviews are connected |
| Reviews | No | Number | Leave 0 until real reviews are connected |
| Badge | No | **Dropdown** | New, Hot, Best Seller, or blank |
| Description | No | Type | Short product line |
| In Stock | Yes | **Dropdown** | TRUE = orderable. FALSE = Sold Out |
| Status | Auto | Leave it | ✓ Ready means the row will appear on the site |

---

## Part 3 — Things you can change yourself in `js/config.js`

```js
whatsappNumber   // WhatsApp ordering number
phoneDisplay     // Phone number shown on the site
tiktokUrl        // Your TikTok link
address          // Shop address shown in the Location section
```

## Part 4 — Your logo

The site currently uses a stylised recreation of your logo
(`assets/logo-badge.svg` for the header/favicon, `assets/logo-full.svg` for
the footer) built to match your black-and-gold badge design, since I wasn't
able to save the exact image file you shared into this project. To use your
real logo:

1. Export/save your actual logo file as `assets/logo.png` (ideally at least
   512×512px, square, transparent background if possible).
2. Tell me and I'll swap every reference across the site to that file — it's
   a one-line change in a few places.
3. For the best WhatsApp/Facebook share preview, also save a version at
   1200×630px as `assets/og-image.jpg` — I can generate this for you too
   once I have the real logo file to work from.

## Part 5 — Customer ratings

Shoppers tap **Rate this** on any product, pick 1–5 stars, write a short
comment, and the review appears on that product and in the Reviews section
right away. No extra Google Form to set up.

Ratings live on the website, not in the product sheet. The Rating / Reviews
columns in the sheet are ignored so the shop never shows made-up scores.

## Part 6 — About showing up in Google searches

The site already includes the on-page SEO groundwork: descriptive titles,
meta descriptions, keywords aimed at "online shop Nairobi", structured data
marking this as a real store with your address and phone number, a
sitemap, and fast-loading static pages. That's necessary, but it isn't
sufficient on its own — no website "pops up" in search purely from code.
To actually rank for people searching for shops in Nairobi, plan to also:

1. **Create a free Google Business Profile** for Selleh Shop Kenya with your
   Gaborone Plaza address — this is usually the single biggest driver of
   local "near me" visibility in Kenya.
2. **Submit the site to Google Search Console** (free) and submit
   `sitemap.xml` there once the site is live on its final domain.
3. **Ask happy customers to leave Google reviews** — review count and
   rating strongly influence local ranking.
4. **Link to the site from your TikTok bio, WhatsApp Business profile, and
   any social posts** — inbound links and mentions help search engines
   trust the site faster.

I'm happy to walk through any of these with you once the site is live.

---

## Testing changes on your own computer

You don't need any special software — just double-click `index.html` and it
opens in your browser. (A few browsers block the Google Sheet fetch when
opened this way via `file://`; if that happens, ask me to start a quick
local preview server instead.)
