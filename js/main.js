/**
 * SELLEH SHOP KENYA — site behaviour
 * Loads products (Google Sheet or local fallback), renders the
 * catalog, and wires up all interactive UI.
 */
(function () {
  "use strict";

  const qs = (sel, ctx) => (ctx || document).querySelector(sel);
  const qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const state = {
    products: [],
    category: "All",
    search: "",
    sort: "featured",
    usingLiveSheet: false,
    reviews: [],
    reviewStats: new Map(),
  };

  // ── Helpers ──────────────────────────────────────────────────────

  function formatKES(amount) {
    const n = Number(amount) || 0;
    return "KES " + n.toLocaleString("en-KE", { maximumFractionDigits: 0 });
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function starsHTML(rating) {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    const pct = (r / 5) * 100;
    return (
      '<span class="stars" aria-hidden="true">' +
      '<span class="stars-bg">★★★★★</span>' +
      '<span class="stars-fg" style="width:' +
      pct +
      '%">★★★★★</span>' +
      "</span>"
    );
  }

  function whatsappOrderLink(product) {
    const msg =
      "Hi Selleh Shop Kenya! I'd like to order:\n\n" +
      "🛍️ " + product.name + "\n" +
      "💰 " + formatKES(product.price) +
      "\n\nIs it available?";
    return "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(msg);
  }

  function slugify(str) {
    return String(str)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function productKey(name) {
    return String(name || "").trim().toLowerCase();
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function rateProductLink(productName) {
    const url = (CONFIG.reviewFormUrl || "").trim();
    if (!url) return "";
    return url.replace("PRODUCT_NAME_HERE", encodeURIComponent(productName || ""));
  }

  // ── Product loading ──────────────────────────────────────────────

  function normalizeRow(raw) {
    const row = {};
    Object.keys(raw).forEach((k) => {
      row[slugify(k)] = typeof raw[k] === "string" ? raw[k].trim() : raw[k];
    });

    const parsePrice = (v) => {
      if (v === undefined || v === null || v === "") return "";
      const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
      return isNaN(n) ? "" : n;
    };

    const falseValues = ["false", "no", "0", "outofstock", "soldout", "no"];
    const inStockRaw = (row.instock || "").toLowerCase();
    const inStock = inStockRaw === "" ? true : !falseValues.includes(inStockRaw);

    const rating = Math.max(0, Math.min(5, parseFloat(row.rating) || 0));
    const reviews = parseInt(row.reviews, 10) || 0;

    return {
      id: row.id || row.name || Math.random().toString(36).slice(2),
      name: row.name || "Unnamed product",
      category: row.category || "General",
      price: parsePrice(row.price) || 0,
      oldPrice: parsePrice(row.oldprice),
      image: row.image || "https://placehold.co/600x600/141414/d4af37?text=Selleh+Shop",
      rating: rating,
      reviews: reviews,
      badge: row.badge || "",
      description: row.description || "",
      inStock: inStock,
    };
  }

  function loadFallback() {
    state.products = (window.FALLBACK_PRODUCTS || []).map((p) => ({ ...p }));
    state.usingLiveSheet = false;
    onProductsReady();
  }

  function loadProducts() {
    const url = (CONFIG.sheetCsvUrl || "").trim();
    if (!url) {
      loadFallback();
      return;
    }

    if (typeof Papa === "undefined") {
      loadFallback();
      return;
    }

    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const rows = (results.data || []).filter((r) => Object.keys(r).length > 1);
        if (!rows.length) {
          loadFallback();
          return;
        }
        state.products = rows.map(normalizeRow).filter((p) => p.name);
        state.usingLiveSheet = true;
        onProductsReady();
      },
      error: function () {
        console.warn("Selleh Shop: could not load live sheet, showing sample products instead.");
        loadFallback();
      },
    });
  }

  function onProductsReady() {
    renderCategoryPills();
    applyFilters();
    updateStats();
    console.info(
      state.usingLiveSheet
        ? "Selleh Shop: showing LIVE products from Google Sheet."
        : "Selleh Shop: showing SAMPLE placeholder products. Connect your Google Sheet in js/config.js to go live."
    );
  }

  // ── Reviews: real customer ratings + comments, via Google Form → Sheet ──

  function normalizeReviewRow(raw) {
    const row = {};
    Object.keys(raw).forEach((k) => {
      row[slugify(k)] = typeof raw[k] === "string" ? raw[k].trim() : raw[k];
    });

    const approvedRaw = String(row.approved || "").trim().toLowerCase();
    const approved = ["true", "yes", "1", "approved"].includes(approvedRaw);
    const rating = Math.max(0, Math.min(5, parseFloat(row.rating) || 0));

    return {
      product: row.productname || "",
      name: row.yourname || "Anonymous",
      rating: rating,
      comment: row.review || "",
      approved: approved,
    };
  }

  function loadReviews() {
    const url = (CONFIG.reviewsCsvUrl || "").trim();
    if (!url || typeof Papa === "undefined") {
      onReviewsReady([]);
      return;
    }
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const rows = (results.data || []).filter((r) => Object.keys(r).length > 1);
        const reviews = rows
          .map(normalizeReviewRow)
          .filter((r) => r.approved && r.product && r.comment && r.rating > 0);
        onReviewsReady(reviews);
      },
      error: function () {
        console.warn("Selleh Shop: could not load reviews sheet.");
        onReviewsReady([]);
      },
    });
  }

  function onReviewsReady(reviews) {
    state.reviews = reviews;
    state.reviewStats = new Map();
    reviews.forEach((r) => {
      const key = productKey(r.product);
      const s = state.reviewStats.get(key) || { total: 0, count: 0 };
      s.total += r.rating;
      s.count += 1;
      state.reviewStats.set(key, s);
    });
    renderReviewsSection();
    applyFilters(); // re-render product cards now that real ratings may be available
  }

  // ── Rendering ────────────────────────────────────────────────────

  function renderCategoryPills() {
    const wrap = qs("#categoryPills");
    if (!wrap) return;
    const cats = Array.from(new Set(state.products.map((p) => p.category))).sort();
    const pills = ["All", ...cats];

    wrap.innerHTML = pills
      .map(
        (c) =>
          '<button type="button" class="pill' +
          (c === state.category ? " active" : "") +
          '" data-cat="' +
          c.replace(/"/g, "&quot;") +
          '">' +
          c +
          "</button>"
      )
      .join("");

    qsa(".pill", wrap).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.category = btn.dataset.cat;
        qsa(".pill", wrap).forEach((b) => b.classList.toggle("active", b === btn));
        applyFilters();
      });
    });
  }

  function updateStats() {
    const productsEl = qs("#statProducts");
    const categoriesEl = qs("#statCategories");
    if (productsEl) productsEl.dataset.count = String(state.products.length);
    if (categoriesEl) {
      const cats = new Set(state.products.map((p) => p.category));
      categoriesEl.dataset.count = String(cats.size);
    }
  }

  function getFiltered() {
    let list = state.products.slice();

    if (state.category !== "All") {
      list = list.filter((p) => p.category === state.category);
    }

    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }

    switch (state.sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break; // featured = sheet order
    }

    return list;
  }

  function productCardHTML(p) {
    const hasDiscount = p.oldPrice && Number(p.oldPrice) > Number(p.price);
    const discountPct = hasDiscount
      ? Math.round((1 - Number(p.price) / Number(p.oldPrice)) * 100)
      : 0;

    const badge = !p.inStock ? "Sold Out" : p.badge;
    const badgeClass = !p.inStock
      ? "badge badge-soldout"
      : badge
      ? "badge badge-" + slugify(badge)
      : "";

    const reviewsEnabled = !!(CONFIG.reviewsCsvUrl || "").trim();
    const stats = reviewsEnabled ? state.reviewStats.get(productKey(p.name)) : null;
    const hasRealReviews = !!(stats && stats.count > 0);
    const rateLink = rateProductLink(p.name);

    let ratingHTML;
    if (hasRealReviews) {
      const avg = stats.total / stats.count;
      ratingHTML =
        starsHTML(avg) +
        '<span class="rating-num">' + avg.toFixed(1) + "</span>" +
        '<span class="rating-count">(' + stats.count + " real)</span>" +
        (rateLink ? '<a class="rate-link" target="_blank" rel="noopener" href="' + rateLink + '">Rate this</a>' : "");
    } else if (!reviewsEnabled && p.rating > 0) {
      ratingHTML =
        starsHTML(p.rating) +
        '<span class="rating-num">' + p.rating.toFixed(1) + "</span>" +
        '<span class="rating-count">(' + p.reviews + ")</span>";
    } else {
      ratingHTML =
        '<span class="no-reviews">No reviews yet</span>' +
        (rateLink ? '<a class="rate-link" target="_blank" rel="noopener" href="' + rateLink + '">Be the first to rate it</a>' : "");
    }

    return (
      '<article class="product-card reveal' + (!p.inStock ? " is-soldout" : "") + '">' +
      (badge ? '<span class="' + badgeClass + '">' + escapeHTML(badge) + "</span>" : "") +
      (hasDiscount ? '<span class="badge badge-sale">-' + discountPct + "%</span>" : "") +
      '<div class="product-img">' +
      '<img src="' +
      p.image +
      '" alt="' +
      p.name.replace(/"/g, "&quot;") +
      '" loading="lazy">' +
      "</div>" +
      '<div class="product-body">' +
      '<p class="product-cat">' +
      escapeHTML(p.category) +
      "</p>" +
      '<h3 class="product-name">' +
      escapeHTML(p.name) +
      "</h3>" +
      '<div class="product-rating">' +
      ratingHTML +
      "</div>" +
      '<div class="product-price">' +
      '<span class="price-now">' +
      formatKES(p.price) +
      "</span>" +
      (hasDiscount ? '<span class="price-old">' + formatKES(p.oldPrice) + "</span>" : "") +
      "</div>" +
      '<div class="product-actions">' +
      (p.inStock
        ? '<a class="btn btn-order" target="_blank" rel="noopener" href="' +
          whatsappOrderLink(p) +
          '"><svg viewBox="0 0 24 24" class="icon"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5C10.4 9 9.9 7.7 9.7 7.2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.1-1.4-.1-.1-.3-.2-.5-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.1L2 22l5.1-1.3c1.4.8 3.1 1.2 4.9 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.1c-1.7 0-3.3-.5-4.6-1.3l-.3-.2-3.1.8.8-3-.2-.3C3.8 14 3.3 12.5 3.3 12c0-4.8 3.9-8.7 8.7-8.7s8.7 3.9 8.7 8.7-3.9 8.7-8.7 8.7z"/></svg>Order on WhatsApp</a>' +
          '<a class="btn btn-call" href="tel:' +
          CONFIG.phoneTel +
          '" aria-label="Call to order"><svg viewBox="0 0 24 24" class="icon"><path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.5 21 3 13.5 3 4.5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.3 0 .7-.2 1l-2.3 2.3z"/></svg></a>'
        : '<a class="btn btn-order btn-disabled" target="_blank" rel="noopener" href="' +
          whatsappOrderLink({ ...p, name: p.name + " (please notify me when back in stock)" }) +
          '">Notify Me on WhatsApp</a>') +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function renderProducts() {
    const grid = qs("#productGrid");
    const empty = qs("#emptyState");
    if (!grid) return;

    const list = getFiltered();

    if (!list.length) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    grid.innerHTML = list.map(productCardHTML).join("");
    observeReveal(qsa(".reveal", grid));

    const countEl = qs("#resultCount");
    if (countEl) {
      countEl.textContent = list.length + (list.length === 1 ? " item" : " items");
    }
  }

  function applyFilters() {
    renderProducts();
  }

  function reviewCardHTML(r) {
    const initial = (r.name || "A").trim().charAt(0).toUpperCase() || "A";
    return (
      '<div class="testimonial-card reveal">' +
      starsHTML(r.rating) +
      '<p class="testimonial-quote">"' + escapeHTML(r.comment) + '"</p>' +
      '<div class="testimonial-person">' +
      '<span class="testimonial-avatar">' + escapeHTML(initial) + "</span>" +
      "<span>" +
      '<span class="testimonial-name">' + escapeHTML(r.name) + "</span><br>" +
      '<span class="testimonial-loc">' + escapeHTML(r.product) + "</span>" +
      "</span>" +
      "</div>" +
      "</div>"
    );
  }

  function renderReviewsSection() {
    const dynamic = qs("#reviewsDynamic");
    const fallback = qs("#reviewsFallback");
    const eyebrow = qs("#reviewsEyebrow");
    const heading = qs("#reviewsHeading");
    const subhead = qs("#reviewsSubhead");
    if (!dynamic || !fallback) return;

    if (!state.reviews.length) {
      dynamic.hidden = true;
      fallback.hidden = false;
      return;
    }

    fallback.hidden = true;
    dynamic.hidden = false;
    const recent = state.reviews.slice(-9).reverse();
    dynamic.innerHTML = recent.map(reviewCardHTML).join("");
    observeReveal(qsa(".reveal", dynamic));

    if (eyebrow) eyebrow.textContent = "Verified Customer Reviews";
    if (heading) heading.textContent = "What Real Customers Say";
    if (subhead) {
      subhead.textContent =
        "Genuine ratings and comments from people who've actually shopped with us — nothing invented.";
    }
  }

  // ── Scroll reveal ────────────────────────────────────────────────

  let revealObserver;
  function observeReveal(nodes) {
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("in-view"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in-view");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
    }
    nodes.forEach((n) => revealObserver.observe(n));
  }

  // ── Counters ─────────────────────────────────────────────────────

  function animateCounters() {
    const counters = qsa("[data-count]");
    if (!counters.length) return;

    const run = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      const duration = 1200;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased).toLocaleString("en-KE");
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString("en-KE") + (el.dataset.suffix || "");
      }
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      counters.forEach(run);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => obs.observe(c));
  }

  // ── Chrome: header, nav, back-to-top ────────────────────────────

  function setupHeader() {
    const header = qs(".site-header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function setupMobileNav() {
    const toggle = qs("#navToggle");
    const menu = qs("#navMenu");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("no-scroll", isOpen);
    });
    qsa("a", menu).forEach((a) =>
      a.addEventListener("click", () => {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("no-scroll");
      })
    );
  }

  function setupBackToTop() {
    const btn = qs("#backToTop");
    if (!btn) return;
    const onScroll = () => btn.classList.toggle("visible", window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function setupSearchAndSort() {
    const search = qs("#searchInput");
    if (search) {
      search.addEventListener(
        "input",
        debounce((e) => {
          state.search = e.target.value.trim();
          applyFilters();
        }, 200)
      );
    }
    const sort = qs("#sortSelect");
    if (sort) {
      sort.addEventListener("change", (e) => {
        state.sort = e.target.value;
        applyFilters();
      });
    }
  }

  function setupContactLinks() {
    qsa("[data-whatsapp-link]").forEach((el) => {
      const msg = "Hi Selleh Shop Kenya! I'd like to know more about your products.";
      el.href = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(msg);
    });
    qsa("[data-call-link]").forEach((el) => {
      el.href = "tel:" + CONFIG.phoneTel;
    });
    qsa("[data-tiktok-link]").forEach((el) => {
      el.href = CONFIG.tiktokUrl;
    });
    qsa("[data-phone-display]").forEach((el) => {
      el.textContent = CONFIG.phoneDisplay;
    });
    qsa("[data-maps-link]").forEach((el) => {
      el.href =
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(CONFIG.address.mapsQuery);
    });
    const rateCta = qs("#rateProductCta");
    if (rateCta) {
      const link = rateProductLink("");
      if (link) {
        rateCta.href = link;
        rateCta.hidden = false;
      }
    }
    const year = qs("#year");
    if (year) year.textContent = new Date().getFullYear();
  }

  // ── Init ─────────────────────────────────────────────────────────

  function init() {
    setupHeader();
    setupMobileNav();
    setupBackToTop();
    setupSearchAndSort();
    setupContactLinks();
    observeReveal(qsa(".reveal"));
    loadProducts();
    loadReviews();
    animateCounters();

    if (CONFIG.sheetCsvUrl && CONFIG.refreshMinutes > 0) {
      setInterval(loadProducts, CONFIG.refreshMinutes * 60 * 1000);
    }
    if (CONFIG.reviewsCsvUrl && CONFIG.refreshMinutes > 0) {
      setInterval(loadReviews, CONFIG.refreshMinutes * 60 * 1000);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
