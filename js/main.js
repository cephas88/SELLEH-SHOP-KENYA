/**
 * SELLEH SHOP KENYA — site behaviour
 * Loads products from catalog.json, customer ratings from /api/reviews,
 * and wires up search, filters, product pages, and WhatsApp ordering.
 */
(function () {
  "use strict";

  const qs = (sel, ctx) => (ctx || document).querySelector(sel);
  const qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const SITE = (CONFIG.siteUrl || "https://sellehshopkenya.co.ke/").replace(/\/?$/, "/");

  const state = {
    products: [],
    category: "All",
    search: "",
    sort: "featured",
    usingLiveSheet: false,
    reviews: [],
    reviewStats: new Map(),
    activeProduct: null,
  };

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
      "🛍️ " +
      product.name +
      "\n" +
      "💰 " +
      formatKES(product.price) +
      "\n\nIs it available?";
    return "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(msg);
  }

  function slugify(str) {
    return String(str)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function productSlug(name) {
    return String(name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function productKey(name) {
    return String(name || "").trim().toLowerCase();
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str || "")
      .replace(/&/g, "&#38;")
      .replace(/"/g, "&#34;")
      .replace(/</g, "&#60;");
  }

  function reviewsApi() {
    return (CONFIG.reviewsApiUrl || "/api/reviews").trim();
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

    const falseValues = [
      "false",
      "no",
      "0",
      "outofstock",
      "out of stock",
      "soldout",
      "sold out",
      "n",
    ];
    const inStockRaw = String(row.instock || "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .trim();
    const inStock = inStockRaw === "" ? true : !falseValues.includes(inStockRaw);

    const name = String(row.name || "").trim();
    if (!name) return null;

    return {
      id: productSlug(name) || name,
      name: name,
      slug: productSlug(name),
      category: row.category || "General",
      price: parsePrice(row.price) || 0,
      oldPrice: parsePrice(row.oldprice),
      image: row.image || "https://placehold.co/600x600/141414/d4af37?text=Selleh+Shop",
      badge: row.badge || "",
      description: row.description || "",
      inStock: inStock,
    };
  }

  function setCatalogEmpty(isEmpty, message) {
    const grid = qs("#productGrid");
    const empty = qs("#emptyState");
    const catalogEmpty = qs("#catalogEmpty");
    if (isEmpty) {
      if (grid) grid.innerHTML = "";
      if (empty) empty.hidden = true;
      if (catalogEmpty) {
        catalogEmpty.hidden = false;
        const p = qs("p", catalogEmpty);
        if (p && message) p.textContent = message;
      }
    } else if (catalogEmpty) {
      catalogEmpty.hidden = true;
    }
  }

  function productsFromCatalogJson(data) {
    return (data.products || [])
      .map((p) => {
        const name = String(p.name || "").trim();
        if (!name) return null;
        const parsePrice = (v) => {
          if (v === undefined || v === null || v === "") return "";
          const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
          return isNaN(n) ? "" : n;
        };
        return {
          id: p.slug || productSlug(name),
          name: name,
          slug: p.slug || productSlug(name),
          category: p.category || "General",
          price: parsePrice(p.price) || 0,
          oldPrice: parsePrice(p.oldPrice),
          image: p.image || "",
          badge: p.badge || "",
          description: p.description || "",
          inStock: p.inStock !== false,
        };
      })
      .filter(Boolean);
  }

  function loadCatalogSnapshot() {
    const url = (CONFIG.catalogUrl || "catalog.json") + "?t=" + Date.now();
    fetch(url)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data) => {
        state.products = productsFromCatalogJson(data);
        onProductsReady();
      })
      .catch(() => {
        state.products = [];
        onProductsReady();
      });
  }

  function loadProducts() {
    loadCatalogSnapshot();
  }

  function onProductsReady() {
    renderCategoryPills();
    applyFilters();
    updateStats();
    injectProductSchema();
    renderSeoProductList();
    openProductFromUrl();
  }

  // ── Reviews ──────────────────────────────────────────────────────

  function onReviewsReady(reviews) {
    state.reviews = reviews;
    state.reviewStats = new Map();
    reviews.forEach((r) => {
      const key = productKey(r.product);
      const s = state.reviewStats.get(key) || { total: 0, count: 0 };
      s.total += Number(r.rating) || 0;
      s.count += 1;
      state.reviewStats.set(key, s);
    });
    renderReviewsSection();
    applyFilters();
    if (state.activeProduct) fillProductModal(state.activeProduct);
    injectProductSchema();
  }

  function loadReviews() {
    fetch(reviewsApi() + (reviewsApi().includes("?") ? "&" : "?") + "t=" + Date.now(), { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : { reviews: [] }))
      .then((data) => {
        const list = Array.isArray(data.reviews) ? data.reviews : Array.isArray(data) ? data : [];
        onReviewsReady(
          list.filter((r) => r && r.product && Number(r.rating) >= 1 && Number(r.rating) <= 5)
        );
      })
      .catch(() => onReviewsReady([]));
  }

  function reviewsForProduct(name) {
    const key = productKey(name);
    return state.reviews.filter((r) => productKey(r.product) === key);
  }

  function ratingFor(product) {
    const stats = state.reviewStats.get(productKey(product.name));
    if (stats && stats.count > 0) {
      return { avg: stats.total / stats.count, count: stats.count };
    }
    return { avg: 0, count: 0 };
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
          escapeAttr(c) +
          '">' +
          escapeHTML(c) +
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
    if (productsEl) {
      productsEl.dataset.count = String(state.products.length);
      productsEl.textContent = state.products.length.toLocaleString("en-KE") + (productsEl.dataset.suffix || "");
    }
    if (categoriesEl) {
      const cats = new Set(state.products.map((p) => p.category));
      categoriesEl.dataset.count = String(cats.size);
      categoriesEl.textContent = String(cats.size);
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
        list.sort((a, b) => ratingFor(b).avg - ratingFor(a).avg);
        break;
      default:
        break;
    }

    return list;
  }

  function ratingHTML(p) {
    const { avg, count } = ratingFor(p);
    if (count > 0) {
      return (
        starsHTML(avg) +
        '<span class="rating-num">' +
        avg.toFixed(1) +
        "</span>" +
        '<span class="rating-count">(' +
        count +
        (count === 1 ? " review" : " reviews") +
        ")</span>" +
        '<button type="button" class="rate-link" data-rate="' +
        escapeAttr(p.slug) +
        '">Rate</button>'
      );
    }
    return (
      '<span class="no-reviews">No reviews yet</span>' +
      '<button type="button" class="rate-link" data-rate="' +
      escapeAttr(p.slug) +
      '">Rate this</button>'
    );
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

    return (
      '<article class="product-card reveal' +
      (!p.inStock ? " is-soldout" : "") +
      '" data-slug="' +
      escapeAttr(p.slug) +
      '">' +
      (badge ? '<span class="' + badgeClass + '">' + escapeHTML(badge) + "</span>" : "") +
      (hasDiscount ? '<span class="badge badge-sale">-' + discountPct + "%</span>" : "") +
      '<button type="button" class="product-open" data-open="' +
      escapeAttr(p.slug) +
      '" aria-label="View ' +
      escapeAttr(p.name) +
      '">' +
      '<div class="product-img">' +
      '<img src="' +
      escapeAttr(p.image) +
      '" alt="' +
      escapeAttr(p.name) +
      ' for sale in Nairobi at Selleh Shop Kenya" loading="lazy" width="600" height="600">' +
      "</div>" +
      '<div class="product-body">' +
      '<p class="product-cat">' +
      escapeHTML(p.category) +
      "</p>" +
      '<h3 class="product-name">' +
      escapeHTML(p.name) +
      "</h3>" +
      "</div>" +
      "</button>" +
      '<div class="product-body product-body-rest">' +
      '<div class="product-rating">' +
      ratingHTML(p) +
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

  function bindProductCardEvents(root) {
    qsa("[data-open]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = state.products.find((x) => x.slug === btn.getAttribute("data-open"));
        if (p) openProduct(p, false);
      });
    });
    qsa("[data-rate]", root).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const p = state.products.find((x) => x.slug === btn.getAttribute("data-rate"));
        if (p) openProduct(p, true);
      });
    });
  }

  function renderProducts() {
    const grid = qs("#productGrid");
    const empty = qs("#emptyState");
    if (!grid) return;

    if (!state.products.length) {
      setCatalogEmpty(
        true,
        "New stock is being added. WhatsApp us for what's available today, or check back shortly."
      );
      const countEl = qs("#resultCount");
      if (countEl) countEl.textContent = "";
      return;
    }

    setCatalogEmpty(false);
    const list = getFiltered();

    if (!list.length) {
      grid.innerHTML = "";
      if (empty) empty.hidden = false;
      const countEl = qs("#resultCount");
      if (countEl) countEl.textContent = "0 items";
      return;
    }
    if (empty) empty.hidden = true;

    grid.innerHTML = list.map(productCardHTML).join("");
    observeReveal(qsa(".reveal", grid));
    bindProductCardEvents(grid);

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
      '<p class="testimonial-quote">"' +
      escapeHTML(r.comment) +
      '"</p>' +
      '<div class="testimonial-person">' +
      '<span class="testimonial-avatar">' +
      escapeHTML(initial) +
      "</span>" +
      "<span>" +
      '<span class="testimonial-name">' +
      escapeHTML(r.name) +
      "</span><br>" +
      '<span class="testimonial-loc">' +
      escapeHTML(r.product) +
      "</span>" +
      "</span>" +
      "</div>" +
      "</div>"
    );
  }

  function renderReviewsSection() {
    const dynamic = qs("#reviewsDynamic");
    const empty = qs("#reviewsEmpty");
    if (!dynamic) return;

    if (!state.reviews.length) {
      dynamic.innerHTML = "";
      dynamic.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    dynamic.hidden = false;
    const recent = state.reviews.slice(0, 9);
    dynamic.innerHTML = recent.map(reviewCardHTML).join("");
    observeReveal(qsa(".reveal", dynamic));
  }

  // ── Product modal + shareable URL ────────────────────────────────

  function setMeta(name, content, attr) {
    if (!content) return;
    const sel = attr === "property" ? 'meta[property="' + name + '"]' : 'meta[name="' + name + '"]';
    let el = qs(sel);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr || "name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function setCanonical(url) {
    let link = qs('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
  }

  function resetDocumentMeta() {
    const title = "Selleh Shop Kenya | Buy Online or In-Store in Nairobi";
    document.title = title;
    setMeta(
      "description",
      "Selleh Shop Kenya at Gaborone Plaza, Nairobi. Shop electronics, fashion, home & kitchen, beauty and more. Honest prices, WhatsApp ordering, delivery across Nairobi. Call +254 721 213 672."
    );
    setMeta("og:title", title, "property");
    setMeta(
      "og:description",
      "Shop electronics, fashion, home and beauty at Gaborone Plaza, Nairobi — or order on WhatsApp for delivery.",
      "property"
    );
    setMeta("og:url", SITE, "property");
    setCanonical(SITE);
  }

  function applyProductMeta(p) {
    const url = SITE + "?product=" + encodeURIComponent(p.slug);
    const title = p.name + " in Nairobi | Selleh Shop Kenya";
    const desc = (
      p.description ||
      "Buy " + p.name + " at Selleh Shop Kenya, Gaborone Plaza, Nairobi. " + formatKES(p.price) + ". Order on WhatsApp or visit the shop."
    ).slice(0, 160);
    document.title = title;
    setMeta("description", desc);
    setMeta("og:title", title, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:url", url, "property");
    setMeta("og:image", p.image, "property");
    setCanonical(url);
  }

  function fillProductModal(p, focusForm) {
    const modal = qs("#productModal");
    if (!modal) return;
    const { avg, count } = ratingFor(p);
    qs("#pmImage").src = p.image;
    qs("#pmImage").alt = p.name + " — Selleh Shop Kenya, Nairobi";
    qs("#pmCategory").textContent = p.category;
    qs("#pmName").textContent = p.name;
    qs("#pmPrice").textContent = formatKES(p.price);
    const old = qs("#pmOldPrice");
    if (p.oldPrice && Number(p.oldPrice) > Number(p.price)) {
      old.hidden = false;
      old.textContent = formatKES(p.oldPrice);
    } else {
      old.hidden = true;
    }
    qs("#pmDesc").textContent =
      p.description || "Available at Selleh Shop Kenya, Gaborone Plaza, Nairobi. Order on WhatsApp or visit the shop.";
    qs("#pmRating").innerHTML =
      count > 0
        ? starsHTML(avg) +
          '<span class="rating-num">' +
          avg.toFixed(1) +
          "</span><span class=\"rating-count\">(" +
          count +
          ")</span>"
        : '<span class="no-reviews">No reviews yet — be the first</span>';
    qs("#pmOrder").href = whatsappOrderLink(p);
    qs("#reviewFormError").textContent = "";
    qs("#reviewFormSuccess").hidden = true;
    qs("#reviewForm").hidden = false;
    qs("#reviewForm").reset();
    qs("#reviewProduct").value = p.name;
    qs("#reviewRating").value = "";
    qsa("#starPicker [data-star]").forEach((b) => b.classList.remove("on"));

    const list = qs("#pmReviewList");
    const mine = reviewsForProduct(p.name);
    list.innerHTML = mine.length
      ? mine
          .slice(0, 8)
          .map(
            (r) =>
              '<div class="pm-review">' +
              starsHTML(r.rating) +
              "<strong>" +
              escapeHTML(r.name) +
              "</strong>" +
              "<p>" +
              escapeHTML(r.comment) +
              "</p></div>"
          )
          .join("")
      : "";

    if (focusForm) {
      const firstStar = qs('#starPicker [data-star="5"]');
      if (firstStar) firstStar.focus();
    }
  }

  function openProduct(p, focusForm) {
    state.activeProduct = p;
    const modal = qs("#productModal");
    if (!modal) return;
    fillProductModal(p, focusForm);
    modal.hidden = false;
    document.body.classList.add("no-scroll");
    applyProductMeta(p);
    const url = "?product=" + encodeURIComponent(p.slug);
    if (location.search !== url) {
      history.pushState({ product: p.slug }, p.name, url);
    }
    injectProductSchema();
  }

  function closeProduct() {
    const modal = qs("#productModal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("no-scroll");
    state.activeProduct = null;
    resetDocumentMeta();
    if (/\?product=/.test(location.search)) {
      history.pushState({}, "", location.pathname);
    }
    injectProductSchema();
  }

  function openProductFromUrl() {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (q) {
      state.search = q;
      const input = qs("#searchInput");
      if (input) input.value = q;
    }
    const slug = params.get("product");
    if (!slug) return;
    const p = state.products.find((x) => x.slug === slug);
    if (p) openProduct(p, false);
  }

  function setupProductModal() {
    const modal = qs("#productModal");
    if (!modal) return;
    qsa("[data-close-modal]", modal).forEach((el) => el.addEventListener("click", closeProduct));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeProduct();
    });
    window.addEventListener("popstate", () => {
      const slug = new URLSearchParams(location.search).get("product");
      if (!slug) {
        modal.hidden = true;
        document.body.classList.remove("no-scroll");
        state.activeProduct = null;
        resetDocumentMeta();
        return;
      }
      const p = state.products.find((x) => x.slug === slug);
      if (p) openProduct(p, false);
    });

    const picker = qs("#starPicker");
    const ratingInput = qs("#reviewRating");
    if (picker && ratingInput) {
      qsa("[data-star]", picker).forEach((btn) => {
        btn.addEventListener("click", () => {
          const n = parseInt(btn.getAttribute("data-star"), 10);
          ratingInput.value = String(n);
          qsa("[data-star]", picker).forEach((b) => {
            b.classList.toggle("on", parseInt(b.getAttribute("data-star"), 10) <= n);
          });
        });
      });
    }

    const form = qs("#reviewForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        submitReview(form);
      });
    }
  }

  function submitReview(form) {
    const err = qs("#reviewFormError");
    const ok = qs("#reviewFormSuccess");
    err.textContent = "";
    const payload = {
      name: qs("#reviewName").value,
      product: qs("#reviewProduct").value,
      comment: qs("#reviewComment").value,
      rating: qs("#reviewRating").value,
      website: qs("#reviewWebsite").value,
    };
    if (!payload.rating) {
      err.textContent = "Please tap a star rating.";
      return;
    }
    const btn = qs('button[type="submit"]', form);
    btn.disabled = true;
    fetch(reviewsApi(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        btn.disabled = false;
        if (!res.ok) {
          err.textContent = data.error || "Could not post your review. Please try again.";
          return;
        }
        form.reset();
        qs("#reviewRating").value = "";
        qsa("#starPicker [data-star]").forEach((b) => b.classList.remove("on"));
        form.hidden = true;
        ok.hidden = false;
        if (data.review) {
          state.reviews.unshift(data.review);
          onReviewsReady(state.reviews);
        } else {
          loadReviews();
        }
      })
      .catch(() => {
        btn.disabled = false;
        err.textContent = "Could not post your review right now. Please try again in a moment.";
      });
  }

  // ── SEO: product list + JSON-LD ──────────────────────────────────

  function renderSeoProductList() {
    const wrap = qs("#seoProductList");
    const section = qs("#inStockSeo");
    if (!wrap || !section) return;
    if (!state.products.length) {
      section.hidden = true;
      wrap.innerHTML = "";
      return;
    }
    section.hidden = false;
    wrap.innerHTML = state.products
      .map(
        (p) =>
          '<li><a href="?product=' +
          encodeURIComponent(p.slug) +
          '">' +
          escapeHTML(p.name) +
          "</a> — " +
          escapeHTML(p.category) +
          " · " +
          formatKES(p.price) +
          "</li>"
      )
      .join("");
    qsa("a", wrap).forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const slug = new URL(a.href, location.href).searchParams.get("product");
        const p = state.products.find((x) => x.slug === slug);
        if (p) {
          openProduct(p, false);
          qs("#shop") && qs("#shop").scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }

  function injectProductSchema() {
    let tag = qs("#productJsonLd");
    if (!tag) {
      tag = document.createElement("script");
      tag.type = "application/ld+json";
      tag.id = "productJsonLd";
      document.head.appendChild(tag);
    }

    const toProduct = (p) => {
      const { avg, count } = ratingFor(p);
      const node = {
        "@type": "Product",
        name: p.name,
        image: p.image,
        description: p.description || p.name + " available at Selleh Shop Kenya, Nairobi",
        sku: p.slug,
        brand: { "@type": "Brand", name: "Selleh Shop Kenya" },
        category: p.category,
        offers: {
          "@type": "Offer",
          url: SITE + "?product=" + encodeURIComponent(p.slug),
          priceCurrency: "KES",
          price: String(p.price),
          availability: p.inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          seller: { "@type": "Store", name: "Selleh Shop Kenya" },
          itemCondition: "https://schema.org/NewCondition",
        },
      };
      if (count > 0) {
        node.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: avg.toFixed(1),
          reviewCount: String(count),
          bestRating: "5",
          worstRating: "1",
        };
        const mine = reviewsForProduct(p.name).slice(0, 5);
        if (mine.length) {
          node.review = mine.map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5" },
            author: { "@type": "Person", name: r.name },
            reviewBody: r.comment,
          }));
        }
      }
      return node;
    };

    if (state.activeProduct) {
      tag.textContent = JSON.stringify({
        "@context": "https://schema.org",
        ...toProduct(state.activeProduct),
      });
      return;
    }

    if (!state.products.length) {
      tag.textContent = "";
      return;
    }

    tag.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Selleh Shop Kenya catalog",
      itemListElement: state.products.slice(0, 50).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: SITE + "?product=" + encodeURIComponent(p.slug),
        item: toProduct(p),
      })),
    });
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
    const year = qs("#year");
    if (year) year.textContent = new Date().getFullYear();
  }

  function init() {
    setupHeader();
    setupMobileNav();
    setupBackToTop();
    setupSearchAndSort();
    setupContactLinks();
    setupProductModal();
    observeReveal(qsa(".reveal"));
    loadProducts();
    loadReviews();
    animateCounters();

    if (CONFIG.refreshMinutes > 0) {
      setInterval(loadReviews, CONFIG.refreshMinutes * 60 * 1000);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
