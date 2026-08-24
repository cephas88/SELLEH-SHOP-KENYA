/**
 * Build-time catalog prep for Selleh Shop Kenya
 * - Charm pricing (25000 -> 24999, 4500 -> 4499, etc.)
 * - Force every item inStock: true (no "Notify Me on WhatsApp")
 * - Expand catalog with creative similar products to >= 500 items
 * Writes catalog.json, then generate-seo.js can run.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CATALOG = path.join(ROOT, "catalog.json");

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Psychological / charm pricing */
function charmPrice(n) {
  const p = Math.round(Number(n) || 0);
  if (p <= 0) return 999;
  if (p < 100) return p;
  // Already charm (ends 99 or 49)
  if (p % 100 === 99 || p % 100 === 49) return p;
  // Round thousands: 26000 -> 25999
  if (p % 1000 === 0) return p - 1;
  // x500: 4500 -> 4499
  if (p % 500 === 0) return p - 1;
  // x00: 3500 already handled; 3200 -> 3199
  if (p % 100 === 0) return p - 1;
  // x50: 4550 -> 4499
  if (p % 50 === 0) return p - 51 + 50 - 1; // fall through safer:
  if (p % 50 === 0) return Math.floor(p / 100) * 100 - 1 + (p % 100 === 50 ? 0 : 0);
  // Generic: floor to nearest 100 then -1
  const base = Math.floor(p / 100) * 100;
  if (p - base < 50) return Math.max(base - 1, 99);
  return base + 99;
}

function applyCharm(p) {
  const price = charmPrice(p.price);
  const out = { ...p, price, inStock: true };
  if (p.oldPrice != null && p.oldPrice !== "") {
    const old = charmPrice(p.oldPrice);
    // Keep oldPrice strictly higher than sale price for discount badge
    out.oldPrice = old > price ? old : charmPrice(Math.round(price * 1.25));
  } else if (price >= 2000 && Math.random() < 0.35) {
    // Sprinkle realistic was-prices for attraction
    out.oldPrice = charmPrice(Math.round(price * (1.15 + Math.random() * 0.25)));
    if (out.oldPrice <= price) out.oldPrice = price + 1000;
  }
  if (!out.slug) out.slug = slugify(out.name);
  return out;
}

const COLORS = ["Black", "White", "Blue", "Red", "Green", "Grey", "Pink", "Gold", "Silver", "Navy"];
const SIZES = ["12 Inch", "16 Inch", "20 Inch", "22 Inch", "24 Inch", "26 Inch", "29 Inch"];
const EGG_CAPS = [48, 64, 96, 112, 128, 192, 204, 256, 320, 528, 1056];
const BADGES = ["Hot", "New", "Best Seller", "Deal", ""];

function pick(arr, i) {
  return arr[i % arr.length];
}

function makeVariant(base, name, price, category, extra = {}) {
  const img = (base.images && base.images[0]) || base.image || "";
  return {
    name,
    category: category || base.category || "General",
    price: charmPrice(price),
    oldPrice: extra.oldPrice != null ? charmPrice(extra.oldPrice) : undefined,
    image: img,
    images: base.images && base.images.length ? base.images.slice(0, 3) : img ? [img] : [],
    badge: extra.badge != null ? extra.badge : pick(BADGES, name.length),
    description:
      extra.description ||
      (base.description
        ? base.description.replace(base.name, name).slice(0, 280)
        : name + " available at Selleh Shop Kenya, Gaborone Plaza, Nairobi. Order on WhatsApp or visit the shop."),
    inStock: true,
    slug: slugify(name),
    brand: extra.brand || base.brand || "Generic",
  };
}

function expandFromBase(products) {
  const byCat = {};
  products.forEach((p) => {
    const c = p.category || "General";
    (byCat[c] = byCat[c] || []).push(p);
  });

  const extra = [];
  const seen = new Set(products.map((p) => (p.slug || slugify(p.name)).toLowerCase()));

  function add(v) {
    const s = (v.slug || slugify(v.name)).toLowerCase();
    if (seen.has(s)) return;
    seen.add(s);
    extra.push(v);
  }

  // --- Bikes & mobility variants ---
  const bikes = products.filter(
    (p) =>
      /bike|bicycle|scooter|tricycle|hoverboard|e-bike/i.test(p.name) ||
      p.category === "Sports & Outdoor" ||
      p.category === "Automotive"
  );
  bikes.forEach((b, i) => {
    SIZES.forEach((sz, j) => {
      if (/bike|bicycle/i.test(b.name)) {
        add(
          makeVariant(
            b,
            b.name.replace(/\d+\s*Inch/i, sz).includes(sz)
              ? b.name + " – " + pick(COLORS, i + j)
              : b.name.replace(/\d+\s*[Ii]nch/, sz) + " – " + pick(COLORS, i + j),
            Math.round((b.price || 15000) * (0.85 + (j % 5) * 0.06)),
            b.category === "Kids & Baby" ? "Kids & Baby" : "Sports & Outdoor",
            { badge: j % 3 === 0 ? "Hot" : "" }
          )
        );
      }
    });
    COLORS.slice(0, 4).forEach((col, j) => {
      if (/scooter|tricycle|hoverboard/i.test(b.name)) {
        add(
          makeVariant(
            b,
            b.name + " – " + col,
            Math.round((b.price || 4000) * (0.9 + j * 0.05)),
            "Kids & Baby",
            { badge: "New" }
          )
        );
      }
    });
  });

  // --- Incubators ---
  const incubators = products.filter((p) => /incubator|egg/i.test(p.name));
  const incBase = incubators[0] || products.find((p) => p.category === "Agriculture & Farm") || products[0];
  EGG_CAPS.forEach((cap, i) => {
    add(
      makeVariant(
        incBase,
        cap + " Eggs Fully Automatic Digital Incubator – AC/DC Smart Hatch",
        Math.round(8000 + cap * 45),
        "Agriculture & Farm",
        {
          badge: cap >= 256 ? "Hot" : "New",
          description:
            "Fully automatic " +
            cap +
            "-egg incubator with digital temperature & humidity control, auto egg turning, and AC/DC power for reliable poultry hatching in Kenya.",
          brand: "Premier",
        }
      )
    );
    add(
      makeVariant(
        incBase,
        cap + " Eggs Front-Load Commercial Poultry Incubator",
        Math.round(9000 + cap * 50),
        "Agriculture & Farm",
        { badge: "Deal", brand: "EcoChicks" }
      )
    );
  });

  // --- Kitchen / home appliances ---
  const kitchen = products.filter(
    (p) => p.category === "Home & Kitchen" || /cooker|blender|fryer|dispenser|kettle|juicer|mincer/i.test(p.name)
  );
  const kitTemplates = [
    ["Air Fryer 5.5L Digital Touch", 7999, "Home & Kitchen"],
    ["Air Fryer 8L Family Size", 9999, "Home & Kitchen"],
    ["Electric Kettle 1.8L Stainless Steel", 1999, "Home & Kitchen"],
    ["Electric Kettle 2.2L Fast Boil", 2499, "Home & Kitchen"],
    ["2-Slice Toaster with Defrost", 2499, "Home & Kitchen"],
    ["4-Slice Toaster Stainless", 3499, "Home & Kitchen"],
    ["Sandwich Maker Non-Stick", 1999, "Home & Kitchen"],
    ["Waffle Maker Belgian Plate", 2999, "Home & Kitchen"],
    ["Hand Mixer 300W with Beaters", 2499, "Home & Kitchen"],
    ["Stand Mixer 5L Bowl", 12999, "Home & Kitchen"],
    ["Microwave 20L Solo", 9999, "Home & Kitchen"],
    ["Microwave 25L Grill", 14999, "Home & Kitchen"],
    ["Rice Cooker 1.8L", 3499, "Home & Kitchen"],
    ["Rice Cooker 2.8L with Steamer", 4499, "Home & Kitchen"],
    ["Slow Cooker 6L Ceramic", 5499, "Home & Kitchen"],
    ["Induction Cooker Portable 2000W", 4999, "Home & Kitchen"],
    ["Double Hot Plate Electric", 3999, "Home & Kitchen"],
    ["Gas Cylinder Regulator + Hose Kit", 1499, "Home & Kitchen"],
    ["Kitchen Knife Set 6pc with Stand", 2499, "Home & Kitchen"],
    ["Chopping Board Set Bamboo 3pc", 1999, "Home & Kitchen"],
    ["Food Storage Containers 10pc Set", 2499, "Home & Kitchen"],
    ["Vacuum Flask 1L Stainless", 1999, "Home & Kitchen"],
    ["Thermos Flask 2L", 2499, "Home & Kitchen"],
    ["Water Filter Jug 3.5L", 2999, "Home & Kitchen"],
    ["Bottom Load Water Dispenser Hot & Cold", 8999, "Home & Kitchen"],
    ["Top Load Water Dispenser Hot & Cold", 6499, "Home & Kitchen"],
    ["Tabletop Water Dispenser Compact", 4499, "Home & Kitchen"],
    ["Commercial Juice Dispenser Single 18L", 28999, "Home & Kitchen"],
    ["Commercial Juice Dispenser Double 18L+18L", 49999, "Home & Kitchen"],
    ["Meat Mincer Electric 1200W", 11999, "Home & Kitchen"],
    ["Meat Slicer Semi-Auto", 14999, "Home & Kitchen"],
    ["Popcorn Machine Countertop", 5999, "Home & Kitchen"],
    ["Cotton Candy Machine", 7999, "Home & Kitchen"],
    ["Ice Cream Maker 1.5L", 8999, "Home & Kitchen"],
    ["Yogurt Maker Automatic", 3999, "Home & Kitchen"],
    ["Bread Maker 900g", 9999, "Home & Kitchen"],
    ["Pressure Cooker 6L Electric", 9999, "Home & Kitchen"],
    ["Pressure Cooker 8L Electric", 12499, "Home & Kitchen"],
    ["Gas Cooker 2 Burner Tabletop", 3499, "Home & Kitchen"],
    ["Gas Cooker 4 Burner with Oven", 24999, "Home & Kitchen"],
    ["Standing Gas Cooker 3+1", 7999, "Home & Kitchen"],
    ["Built-In Gas Hob 2 Burner Glass", 12999, "Home & Kitchen"],
    ["Built-In Gas Hob 4 Burner", 18999, "Home & Kitchen"],
    ["Range Hood 60cm Slim", 9999, "Home & Kitchen"],
    ["Kitchen Exhaust Fan 10 Inch", 3499, "Home & Kitchen"],
    ["Dish Rack 2 Tier with Tray", 2499, "Home & Kitchen"],
    ["Spice Rack Revolving", 1999, "Home & Kitchen"],
    ["Kitchen Trolley 3 Tier with Wheels", 4499, "Home & Kitchen"],
    ["Foldable Storage Rack 4 Tier", 4999, "Home & Kitchen"],
    ["Ironing Board Premium Foldable", 3499, "Home & Kitchen"],
    ["Steam Iron 2400W Ceramic", 3499, "Home & Kitchen"],
    ["Garment Steamer Vertical", 4999, "Home & Kitchen"],
  ];
  const kBase = kitchen[0] || products[0];
  kitTemplates.forEach((t, i) => {
    add(makeVariant(kBase, t[0], t[1], t[2], { badge: pick(BADGES, i) }));
  });

  // Brand-style kitchen lines
  ["Ramtons", "Nunix", "Sokany", "Signature", "Roch", "Haier", "Premier"].forEach((brand, bi) => {
    [
      [brand + " Electric Kettle 1.7L", 2299 + bi * 100],
      [brand + " 2-in-1 Blender with Grinder", 3499 + bi * 150],
      [brand + " 4-in-1 Blender Set", 5499 + bi * 200],
      [brand + " Bottom Load Water Dispenser", 8499 + bi * 200],
      [brand + " Air Fryer 6L", 8999 + bi * 250],
      [brand + " Electric Pressure Cooker 6L", 9999 + bi * 200],
    ].forEach(([name, price], j) => {
      add(makeVariant(kBase, name, price, "Home & Kitchen", { brand, badge: j === 0 ? "New" : "" }));
    });
  });

  // --- Electronics ---
  const elec = products.filter((p) => p.category === "Electronics & Gadgets" || /tablet|tv box|controller|phone|drill/i.test(p.name));
  const eBase = elec[0] || products[0];
  const elecTemplates = [
    ["Android Tablet 7 Inch 4GB+64GB Kids Edition", 5499],
    ["Android Tablet 8 Inch 6GB+128GB with Case", 7499],
    ["Android Tablet 10.1 Inch 8GB+256GB", 9999],
    ["Android Tablet 11 Inch 12GB+512GB 5G", 13499],
    ["Android Tablet 11 Inch 16GB+1TB Full Set Keyboard", 14999],
    ["Smart TV Box 4K Android 12", 4999],
    ["Smart TV Box 4K Google TV WiFi 6", 8999],
    ["Wireless Bluetooth Earbuds TWS", 1999],
    ["Wireless Bluetooth Earbuds ANC", 3499],
    ["Over-Ear Bluetooth Headphones", 2999],
    ["Gaming Headset RGB 7.1", 4499],
    ["Wireless Gamepad Dual Vibration", 2499],
    ["Mobile Game Controller Stretch Clamp", 2999],
    ["Power Bank 10000mAh Fast Charge", 1999],
    ["Power Bank 20000mAh Dual Port", 2999],
    ["Power Bank 30000mAh PD", 3999],
    ["USB-C Hub 7-in-1", 3499],
    ["Laptop Cooling Pad Dual Fan", 2499],
    ["Adjustable Laptop Stand Aluminium", 2999],
    ["Wireless Mouse Silent Click", 999],
    ["Mechanical Keyboard RGB 87 Key", 4499],
    ["Webcam 1080p with Mic", 3499],
    ["Ring Light 10 Inch with Tripod", 2499],
    ["Phone Tripod Flexible", 1499],
    ["Car Phone Holder Magnetic", 999],
    ["Bluetooth Speaker Portable Waterproof", 2499],
    ["Bluetooth Speaker Party 20W", 4999],
    ["Smart Watch Fitness Tracker", 2499],
    ["Smart Watch Pro AMOLED", 4999],
    ["Digital Body Scale Smart", 1999],
    ["Handheld Metal Detector Security", 2499],
    ["GSM Dual SIM Desk Phone", 3499],
    ["Cordless Phone DECT", 3999],
  ];
  elecTemplates.forEach((t, i) => {
    add(makeVariant(eBase, t[0], t[1], "Electronics & Gadgets", { badge: pick(BADGES, i + 2) }));
  });
  ["Modio", "Xiaomi", "Generic"].forEach((brand, bi) => {
    ["64GB", "128GB", "256GB", "512GB"].forEach((stor, si) => {
      add(
        makeVariant(
          eBase,
          brand + " Kids Tablet 7\" WiFi " + stor,
          4999 + bi * 500 + si * 800,
          "Electronics & Gadgets",
          { brand, badge: "Hot" }
        )
      );
    });
  });

  // --- Automotive ---
  const auto = products.filter((p) => p.category === "Automotive" || /jump|washer|inflator|inverter/i.test(p.name));
  const aBase = auto[0] || products[0];
  [
    ["Car Jump Starter 20000mAh with Light", 3999],
    ["Car Jump Starter + Air Compressor 150 PSI", 6499],
    ["3-in-1 Jump Starter Power Bank Inflator", 7999],
    ["Portable Air Compressor Digital 12V", 3499],
    ["Cordless Car Washer 48V Dual Battery", 4499],
    ["Cordless Car Washer 96V High Pressure", 5499],
    ["Cordless Car Washer 148V Foam Kit", 6499],
    ["Car Vacuum Cleaner 120W Wet Dry", 2999],
    ["Car Power Inverter 300W USB", 3499],
    ["Car Power Inverter 500W Pure Sine", 5999],
    ["Dash Cam 1080p Front", 4499],
    ["Dash Cam Dual Front + Rear", 6999],
    ["Tyre Pressure Gauge Digital", 999],
    ["Car Seat Organizer Multi-Pocket", 1499],
    ["Steering Wheel Cover Leather", 1299],
    ["Car Floor Mats Universal 4pc", 2499],
    ["Bike Rear Car Rack 2-Bike", 5999],
    ["Bike Rear Car Rack 3-Bike", 7999],
    ["Roof Cargo Bag Waterproof 15 cu ft", 4999],
    ["Motorcycle Phone Mount Waterproof", 1499],
  ].forEach((t, i) => {
    add(makeVariant(aBase, t[0], t[1], "Automotive", { badge: pick(BADGES, i) }));
  });

  // --- Kids & Baby ---
  const kids = products.filter((p) => p.category === "Kids & Baby");
  const kdBase = kids[0] || products[0];
  [
    ["Kids Bicycle 12\" with Training Wheels", 4999],
    ["Kids Bicycle 14\" with Basket", 5499],
    ["Kids Bicycle 16\" Sport", 5999],
    ["Kids Mountain Bike 20\"", 9999],
    ["Kids Tricycle with Push Handle", 4499],
    ["Kids Tricycle Storage Basket", 3999],
    ["LED 3-Wheel Scooter Adjustable", 3999],
    ["Foldable Kids Scooter Large Wheels", 5499],
    ["Inline Skates Adjustable with Helmet Set", 4499],
    ["Quad Roller Skates with Pads", 4499],
    ["Baby Walker with Toy Tray", 3499],
    ["Study Table & Chair Set Adjustable", 9999],
    ["Cartoon Study Desk with Abacus", 4499],
    ["Kids Tent Play House Indoor", 3999],
    ["Ride-On Toy Car Push", 4999],
    ["Electric Ride-On Car 6V", 14999],
    ["Building Blocks 100pc Set", 1999],
    ["Educational Learning Tablet Toy", 2499],
  ].forEach((t, i) => {
    COLORS.slice(0, 3).forEach((col, j) => {
      add(
        makeVariant(kdBase, t[0] + " – " + col, t[1] + j * 100, "Kids & Baby", {
          badge: j === 0 ? "Hot" : "",
        })
      );
    });
  });

  // --- Health, beauty, sports, tools ---
  const hwBase = products.find((p) => p.category === "Health & Wellness") || products[0];
  [
    ["Walking Pad Folding Treadmill", 26999, "Health & Wellness"],
    ["Spinning Exercise Bike LCD", 18999, "Health & Wellness"],
    ["Mini Stepper with Resistance Bands", 3999, "Health & Wellness"],
    ["Yoga Mat Non-Slip 10mm", 1499, "Sports & Outdoor"],
    ["Yoga Mat Extra Thick 15mm", 1999, "Sports & Outdoor"],
    ["Dumbbell Set 20KG Adjustable", 6999, "Sports & Outdoor"],
    ["Dumbbell Set 50KG Home Gym", 12999, "Sports & Outdoor"],
    ["Resistance Bands Set 5pc", 1499, "Sports & Outdoor"],
    ["Ab Roller Wheel with Mat", 1499, "Sports & Outdoor"],
    ["Jump Rope Speed Bearing", 999, "Sports & Outdoor"],
    ["Massage Gun Deep Tissue 6 Heads", 1499, "Beauty & Personal Care"],
    ["Massage Gun Fascial Pro", 6999, "Beauty & Personal Care"],
    ["Full Body Vibration Platform", 7999, "Beauty & Personal Care"],
    ["Hair Dryer 2000W Ionic", 2499, "Beauty & Personal Care"],
    ["Hair Clipper Professional", 2999, "Beauty & Personal Care"],
    ["Beard Trimmer Waterproof", 1999, "Beauty & Personal Care"],
    ["Electric Shaver Rechargeable", 2499, "Beauty & Personal Care"],
    ["Straightener Ceramic Tourmaline", 2499, "Beauty & Personal Care"],
    ["Curling Wand Set", 2999, "Beauty & Personal Care"],
    ["Facial Steamer Nano", 3499, "Beauty & Personal Care"],
  ].forEach((t, i) => {
    add(makeVariant(hwBase, t[0], t[1], t[2], { badge: pick(BADGES, i) }));
  });

  const toolBase = products.find((p) => p.category === "Tools") || products[0];
  [
    ["Cordless Drill 18V Kit", 4999],
    ["Cordless Drill 36V Complete Set", 5499],
    ["Cordless Drill 48V Compact", 3799],
    ["Angle Grinder 850W", 3999],
    ["Drill + Angle Grinder Combo", 5899],
    ["Electrician Tool Kit 88pc", 4999],
    ["Socket Set 46pc Chrome", 3499],
    ["Screwdriver Set Magnetic 32pc", 1499],
    ["Toolbox Plastic 16 Inch", 2499],
    ["Ladder Aluminium 4 Step", 3999],
    ["Ladder Aluminium 6 Step", 5499],
    ["Ladder Aluminium 8 Step Foldable", 6999],
    ["Paint Sprayer Cordless 21V", 4799],
    ["Paint Sprayer Cordless 26V", 4799],
    ["Heat Gun 2000W Dual Temp", 2999],
    ["Soldering Iron Kit 60W", 1499],
    ["Multimeter Digital Auto-Range", 1999],
    ["Spirit Level 60cm", 999],
    ["Tape Measure 5m Soft", 499],
    ["Work Gloves Pack of 12", 999],
  ].forEach((t, i) => {
    add(makeVariant(toolBase, t[0], t[1], "Tools", { badge: pick(BADGES, i + 1) }));
  });

  // --- Agriculture extras ---
  const agBase = products.find((p) => p.category === "Agriculture & Farm") || products[0];
  [
    ["Knapsack Sprayer 16L Manual", 1899],
    ["Knapsack Sprayer 20L Manual", 1999],
    ["Battery Sprayer 16L Electric", 4999],
    ["Battery Sprayer 20L Electric", 5999],
    ["Garden Hose 30m with Nozzle", 2499],
    ["Wheelbarrow Heavy Duty", 6999],
    ["Farm Fork 4-Tine", 1499],
    ["Spade Steel Handle", 1299],
    ["Pruning Shears Professional", 999],
    ["Chicken Feeder Automatic 10kg", 2499],
    ["Chicken Drinker 5L", 999],
    ["Poultry Netting 50m", 3499],
  ].forEach((t, i) => {
    add(makeVariant(agBase, t[0], t[1], "Agriculture & Farm", { badge: i < 2 ? "Hot" : "" }));
  });

  // --- Fashion / home comfort fillers ---
  const fBase = products.find((p) => p.category === "Fashion & Accessories") || products[0];
  [
    ["Inflatable Lounge Chair with Footrest", 3199, "Home & Kitchen"],
    ["Inflatable Bean Bag Chair", 2499, "Fashion & Accessories"],
    ["Zero Gravity Recliner Camping Chair", 7999, "Home & Kitchen"],
    ["Camping Folding Chair Set of 2", 4499, "Sports & Outdoor"],
    ["Picnic Mat Waterproof Large", 1999, "Sports & Outdoor"],
    ["Travel Neck Pillow Memory Foam", 999, "Fashion & Accessories"],
    ["Umbrella Automatic Windproof", 1299, "Fashion & Accessories"],
    ["Backpack Laptop 15.6\"", 2499, "Fashion & Accessories"],
    ["Duffel Bag Sports 40L", 1999, "Fashion & Accessories"],
    ["Waist Bag Travel RFID", 999, "Fashion & Accessories"],
  ].forEach((t, i) => {
    add(makeVariant(fBase, t[0], t[1], t[2], { badge: "" }));
  });

  // Pad to 500+ with numbered catalog SKUs from strongest categories
  const padSources = products.concat(extra).filter((p) => p.image);
  let n = 1;
  while (products.length + extra.length < 520 && n < 800) {
    const src = padSources[n % padSources.length];
    const cat = src.category || "General";
    const name =
      src.name.replace(/\s*–\s*.*$/, "").slice(0, 60) +
      " – Model " +
      String.fromCharCode(65 + (n % 26)) +
      (Math.floor(n / 26) + 1);
    const price = charmPrice(Math.round((src.price || 3000) * (0.92 + (n % 7) * 0.03)));
    add(
      makeVariant(src, name, price, cat, {
        badge: n % 5 === 0 ? "Deal" : n % 7 === 0 ? "New" : "",
        description:
          "Premium " +
          cat.toLowerCase() +
          " pick at Selleh Shop Kenya. " +
          (src.description || "Quality product for Nairobi homes and businesses.").slice(0, 160),
      })
    );
    n++;
  }

  return extra;
}

function main() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  } catch (e) {
    console.error("prepare-catalog: cannot read catalog.json", e.message);
    process.exit(0);
  }

  let products = (data.products || []).filter((p) => p && p.name);
  products = products.map(applyCharm);

  const extras = expandFromBase(products);
  const merged = products.concat(extras);

  // Final pass: unique slugs, charm, stock
  const seen = new Set();
  const final = [];
  merged.forEach((p) => {
    let slug = p.slug || slugify(p.name);
    let i = 2;
    while (seen.has(slug)) {
      slug = (p.slug || slugify(p.name)) + "-" + i;
      i++;
    }
    seen.add(slug);
    final.push({
      ...p,
      slug,
      price: charmPrice(p.price),
      inStock: true,
      oldPrice:
        p.oldPrice && Number(p.oldPrice) > Number(charmPrice(p.price))
          ? charmPrice(p.oldPrice)
          : p.oldPrice && Number(p.oldPrice) > Number(p.price)
          ? Number(p.oldPrice)
          : undefined,
    });
  });

  // Clean undefined oldPrice
  final.forEach((p) => {
    if (p.oldPrice == null) delete p.oldPrice;
  });

  const out = {
    generatedAt: new Date().toISOString(),
    source: "prepared-catalog",
    count: final.length,
    products: final,
  };

  fs.writeFileSync(CATALOG, JSON.stringify(out, null, 2));
  console.log(
    "prepare-catalog: wrote", final.length, "products (all in stock, charm prices)"
  );
}

try {
  main();
} catch (err) {
  console.warn("prepare-catalog failed (deploy continues):", err.message);
  process.exit(0);
}
