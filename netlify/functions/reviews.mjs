import { getStore } from "@netlify/blobs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ALL_KEY = "all-reviews";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...cors,
    },
  });
}

function clean(value, max) {
  return String(value || "")
    .replace(/[\u0000-\u001f]/g, " ")
    .trim()
    .slice(0, max);
}

async function readAll(store) {
  const data = await store.get(ALL_KEY, { type: "json" });
  return Array.isArray(data) ? data : [];
}

export default async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("", { status: 204, headers: cors });
    }

    const store = getStore("selleh-reviews");

    if (req.method === "GET") {
      const reviews = await readAll(store);
      return json({ reviews });
    }

    if (req.method === "POST") {
      let body = {};
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid request." }, 400);
      }

      if (clean(body.website, 80)) return json({ ok: true, review: null });

      const name = clean(body.name, 40);
      const product = clean(body.product, 80);
      const comment = clean(body.comment, 400);
      const rating = parseInt(body.rating, 10);

      if (name.length < 2) return json({ error: "Please enter your name." }, 400);
      if (product.length < 2) return json({ error: "Missing product." }, 400);
      if (comment.length < 8) {
        return json({ error: "Please write a short review (at least 8 characters)." }, 400);
      }
      if (!(rating >= 1 && rating <= 5)) {
        return json({ error: "Please choose a star rating." }, 400);
      }

      const ip =
        req.headers.get("x-nf-client-connection-ip") ||
        (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
        "unknown";
      const rlKey = "rl:" + ip.replace(/[^a-zA-Z0-9:.]/g, "_").slice(0, 64);
      const rl = (await store.get(rlKey, { type: "json" })) || { n: 0, t: 0 };
      const now = Date.now();
      const hour = 60 * 60 * 1000;
      if (now - Number(rl.t || 0) < hour && Number(rl.n || 0) >= 5) {
        return json({ error: "Please wait a bit before posting another review." }, 429);
      }
      await store.setJSON(rlKey, {
        n: now - Number(rl.t || 0) < hour ? Number(rl.n || 0) + 1 : 1,
        t: now,
      });

      const review = {
        id: now.toString(36) + Math.random().toString(36).slice(2, 8),
        name,
        product,
        comment,
        rating,
        createdAt: new Date().toISOString(),
      };
      const reviews = await readAll(store);
      reviews.unshift(review);
      await store.setJSON(ALL_KEY, reviews.slice(0, 500));
      return json({ ok: true, review }, 201);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: "Reviews are temporarily unavailable." }, 500);
  }
};

export const config = { path: "/api/reviews" };
