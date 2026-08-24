# Selleh Shop Kenya — Website

A fast, static website for Selleh Shop Kenya. No hosting fees required to
start, and products can be updated from a Google Sheet — no coding needed
after initial setup.

## What's in this project

```
index.html          The whole site (one page)
css/style.css        All styling (black / gold / white theme)
js/config.js          Your contact info + the Google Sheet link
js/products-data.js   Sample placeholder products (used until your Sheet is connected)
js/main.js             Site behaviour (search, filters, WhatsApp links, etc.)
assets/               Logo files
robots.txt / sitemap.xml   Search engine files
netlify.toml            Optional hosting config for Netlify
```

Right now the shop is full of **sample placeholder products** (clearly
generic items with placeholder images) so you can see exactly how the real
site will look and behave. Follow **Part 2** below whenever you're ready to
switch to your real catalog — nothing else on the site needs to change.

---

## Part 1 — Put the site online: GitHub + Netlify + your domain

This project is set up to deploy via **Netlify's GitHub integration**: push
code to GitHub, Netlify auto-deploys every change, and `sellehshopkenya.co.ke`
points at it. Full walkthrough below in the chat — short version:

1. Push this folder to a new GitHub repository.
2. In Netlify: **Add new site → Import an existing project → GitHub** →
   pick the repo. Build command: none. Publish directory: `.` (the repo
   root) — `netlify.toml` already has this set.
3. In Netlify **Domain settings**, add `sellehshopkenya.co.ke`, then update
   your DNS at your domain registrar with the records Netlify shows you.
4. From then on, every `git push` auto-deploys — including product changes
   if you ever move off the Google Sheet, and any future design changes.

The site's canonical URLs (`index.html`, `sitemap.xml`, `robots.txt`) are
already set to `https://sellehshopkenya.co.ke/`.

*(If you'd rather not use GitHub, the fastest alternative is dragging this
folder onto [app.netlify.com/drop](https://app.netlify.com/drop) — but then
updates require re-dragging the folder each time instead of just `git push`.)*

---

## Part 2 — Update products from Google Sheets (no code)

This is the "base" you asked about: a Google Sheet becomes your product
database. Edit the sheet, and the website picks up the changes automatically
— no redeploying, no developer needed.

### Step 1 — Create the sheet

The fastest way to start: open [products-template.csv](products-template.csv)
in this project, then in Google Sheets go to **File → Import → Upload**,
choose that file, and select "Replace current sheet". You'll get a sheet
with the right headers and three example rows already filled in correctly
— edit or delete those rows and add your real products below them.

(Or start from scratch — create a new Google Sheet with exactly these
column headers in row 1:)

| Column | Required | Example | Notes |
|---|---|---|---|
| Name | Yes | Wireless Bluetooth Earbuds | Product title |
| Category | Yes | Electronics & Gadgets | Products with the same category get grouped into a filter tab automatically |
| Price | Yes | 1999 | Numbers only, in KES |
| Old Price | No | 3500 | Leave blank if not discounted. Adding this shows a strikethrough + "% off" badge |
| Image | Yes | (see Step 2) | Direct link to a product photo |
| Rating | No | 4.6 | A number from 0–5. Leave blank to default to 0 |
| Reviews | No | 128 | Number of reviews, just for display |
| Badge | No | Best Seller | Any short label — e.g. New, Hot, Best Seller. Leave blank for none |
| Description | No | Crisp sound, long battery life | Not shown on the card yet, reserved for future use |
| In Stock | No | TRUE | Write FALSE (or "No") to mark sold out — the button changes to "Notify Me" automatically |

You can add as many rows (products) and as many different Category values as
you like — new categories appear on the site automatically as filter tabs.

**Optional but recommended — turn Category / Badge / In Stock into
dropdowns**, so you (or anyone helping you) click a choice instead of typing
and risking a typo that creates a duplicate category by accident:

1. Click the column letter to select the whole column (**B** for Category,
   **H** for Badge, **J** for In Stock).
2. **Data → Data validation → Add rule.**
3. Criteria: **Dropdown** → add each option as its own item:
   - **Category:** your list of categories (start with Electronics &
     Gadgets, Fashion & Accessories, Home & Kitchen, Beauty & Personal
     Care, Kids & Baby, Sports & Outdoor — edit anytime).
   - **Badge:** leave blank, New, Hot, Best Seller (these three get their
     own color on the site; anything else still works, just shows in the
     default gold badge style).
   - **In Stock:** TRUE, FALSE.
4. Under "Advanced options," choose **Reject input** so a typo can't sneak
   through.
5. Click Done. This only changes how you *enter* data in Sheets — the
   website reads the same plain text either way, so nothing else changes.

### Step 2 — Upload each product photo (via imgbb)

Google Sheets' own "insert image in cell" doesn't work here — an image
inserted that way is locked inside the spreadsheet with no public web
address, so the website would just show a blank box. The site needs a real
link to point to, so the workflow is upload-once-get-a-link, not typing:

1. Go to **[imgbb.com](https://imgbb.com)** (no account needed).
2. Drag your product photo in (or click to browse).
3. Once it's uploaded, copy the **"Direct link"** it gives you (ends in
   `.jpg`/`.png`).
4. Paste that link into the Image column for that product.

That's it — repeat per product. Avoid pasting a normal Google Drive share
link instead; it usually won't display correctly on the site.

### Step 3 — Publish the sheet so the website can read it

1. In Google Sheets: **File → Share → Publish to web**.
2. Under "Link", choose the specific sheet/tab your products are on.
3. Under "Embed", change it to **Comma-separated values (.csv)**.
4. Click **Publish**, confirm, and copy the link it gives you (it will look
   like `https://docs.google.com/spreadsheets/d/e/2PACX-xxxxx/pub?output=csv`).

### Step 4 — Connect it to the website

Open `js/config.js` and paste that link as the value of `sheetCsvUrl`:

```js
sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-xxxxx/pub?output=csv",
```

Save the file and redeploy (drag the folder into Netlify again, or push to
GitHub if that's connected). From this point on, **you never need to touch
the code again** — just edit the Google Sheet:

- Change a price → it updates on the site.
- Add a new row → a new product appears.
- Set "In Stock" to FALSE → the item shows "Sold Out" automatically.

The site re-reads the sheet every time someone opens the page, and also
re-checks every 5 minutes for visitors who leave a tab open (you can change
this in `config.js` via `refreshMinutes`). Note: Google's "Publish to web"
cache can take a few minutes to reflect your latest edit — that delay is on
Google's side, not the website.

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

## Part 5 — Reviews: real 5-star ratings + comments, no fakes

The "Reviews" section deliberately does **not** show invented customer
quotes — a brand-new shop has no real reviews yet, and fabricating them
(fake names, fake stars) is the kind of thing that destroys trust the
moment someone notices. Until you set this up, that section keeps showing
three honest promises instead, and product cards show "No reviews yet."

Once set up: a "Rate This Product" link appears on every product card (and
a general "Rate A Product You've Bought" button above the Reviews section).
Customers pick 1–5 stars and write a comment, you approve genuine ones, and
the site automatically starts showing the **real** average rating on that
product's card and the comment in the Reviews section — nothing invented,
nothing typed in by you.

### Step 1 — Build the Google Form

Create a new Google Form with these questions, **using these exact titles**
(the site matches columns by name, so exact spelling matters):

| Question | Type | Required |
|---|---|---|
| Product Name | Short answer | Yes |
| Your Name | Short answer | No |
| Rating | Linear scale, 1 to 5 | Yes |
| Review | Paragraph | Yes |

### Step 2 — Get a pre-filled link

1. Open the live form (Preview — the eye icon, top right).
2. Type exactly `PRODUCT_NAME_HERE` into the **Product Name** field. Leave
   everything else blank.
3. Click **⋮ (More) → Get pre-filled link**, then **Get link** and copy it.
4. Paste that link into `js/config.js` as `reviewFormUrl`.

The site replaces `PRODUCT_NAME_HERE` with the real product name whenever
someone clicks "Rate This Product" on a specific item — so their form opens
with the right product already filled in.

### Step 3 — Connect a Sheet and add moderation

1. Back in the Form editor, go to the **Responses** tab → click the green
   Sheets icon → **Create a new spreadsheet**.
2. In that new sheet, add one more column header after the last one:
   **Approved**.
3. **File → Share → Publish to web** → select that sheet → format **CSV** →
   Publish → copy the link.
4. Paste it into `js/config.js` as `reviewsCsvUrl`.

### Step 4 — Your day-to-day moderation

Every new review lands as a new row with **Approved** blank — it stays
completely invisible on the site until you type **TRUE** next to it. Read
each one, delete anything spammy or fake, and approve the genuine ones.
Nothing else to do — the site re-checks automatically.

Product ratings entered manually in the *Products* sheet (the Rating/
Reviews columns from Part 2) are only ever shown as a fallback before this
system is connected — once `reviewsCsvUrl` is set, real customer reviews
take over completely, per product.

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
