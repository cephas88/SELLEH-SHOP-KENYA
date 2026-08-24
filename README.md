# Selleh Shop Kenya — Website

A fast, static website for Selleh Shop Kenya. Products live in `catalog.json`
in this repo — you push the file yourself. Customer ratings are posted on the
site and appear immediately.

## What's in this project

```
index.html          The whole site (one page)
css/style.css        All styling (black / gold / white theme)
js/config.js          Contact info
js/main.js             Shop behaviour (search, ratings, WhatsApp)
catalog.json          The live product catalog — edit this, then push
assets/               Logo files
robots.txt / sitemap.xml   Search engine files
netlify.toml            Hosting config
netlify/functions       Stores customer reviews
```

The catalog on the website is **only** what is in `catalog.json`. Add a
product there, commit, and push to `main` — Netlify deploys it. Remove a
product and it disappears.

Live site: [https://sellehshopkenya.co.ke](https://sellehshopkenya.co.ke)

---

## How to add or update products

Edit `catalog.json`. Each product looks like this:

```json
{
  "name": "Ramtons Electric Pressure Cooker 6L",
  "category": "Home & Kitchen",
  "price": 8500,
  "oldPrice": 9999,
  "image": "https://example.com/photo.jpg",
  "badge": "New",
  "description": "Short line shoppers see on the product page.",
  "inStock": true,
  "slug": "ramtons-electric-pressure-cooker-6l"
}
```

| Field | Required | Notes |
|---|---|---|
| name | Yes | Product title |
| category | Yes | Same spelling every time = one filter tab |
| price | Yes | KES, numbers only (1999 not "KES 1,999") |
| oldPrice | No | Omit if not discounted. Shows strike-through + % off |
| image | Yes | Direct image URL (jpg / png / webp) |
| badge | No | New, Hot, Best Seller, or blank |
| description | No | Short product line |
| inStock | Yes | `true` = orderable. `false` = Sold Out |
| slug | Yes | URL-safe id, lowercase-with-dashes |

Then commit and push to `main`. The live shop updates in about a minute.

Use the same category names already in the file so filter tabs stay clean:
Home & Kitchen, Electronics & Gadgets, Automotive, Kids & Baby, Agriculture & Farm, Health & Wellness, Tools, Sports & Outdoor, Beauty & Personal Care, Fashion & Accessories.

---

## Things you can change yourself in `js/config.js`

```js
whatsappNumber   // WhatsApp ordering number
phoneDisplay     // Phone number shown on the site
tiktokUrl        // Your TikTok link
address          // Shop address shown in the Location section
```

---

## Customer ratings

Shoppers tap **Rate this** on any product, pick 1–5 stars, write a short
comment, and the review appears on that product and in the Reviews section
right away.

---

## About showing up in Google searches

The site already includes titles, meta descriptions, structured data, a
sitemap, and fast static pages. To actually rank in Nairobi searches:

1. Create a free Google Business Profile for Selleh Shop Kenya at Gaborone Plaza.
2. Submit `sitemap.xml` in Google Search Console.
3. Ask happy customers to leave Google reviews.
4. Link the site from TikTok, WhatsApp Business, and social posts.
