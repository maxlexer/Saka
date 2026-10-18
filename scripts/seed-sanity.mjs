import { createClient } from "@sanity/client";
import sharp from "sharp";
import { bottleSvg } from "./lib/bottle.mjs";

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const FILLS = ["#DCD0BF", "#AD9883", "#8C7964"];
const SAMPLES = [
  { name: "Jasmine Rain", desc: "Jasmine after rain on warm stone.", top: ["bergamot", "green leaf"], heart: ["jasmine", "tuberose"], base: ["musk"], family: ["floral"], vibes: ["calm", "romantic"], occ: ["everyday", "date_night"], prices: [12, 22, 48] },
  { name: "Warm Amber", desc: "Amber and vanilla, like a lit evening room.", top: ["orange peel"], heart: ["amber", "benzoin"], base: ["vanilla", "sandalwood"], family: ["amber"], vibes: ["warm", "bold"], occ: ["evening", "gift"], prices: [14, 26, 58] },
  { name: "Cedar Linen", desc: "Dry cedar on sun-washed linen.", top: ["lemon"], heart: ["cedar", "vetiver"], base: ["white musk"], family: ["woody", "musk"], vibes: ["calm", "earthy"], occ: ["work", "everyday"], prices: [12, 22, 50] },
  { name: "Sea Salt Morning", desc: "Cool air, salt and pale driftwood.", top: ["sea salt", "grapefruit"], heart: ["driftwood"], base: ["ambergris"], family: ["fresh_aquatic", "citrus"], vibes: ["fresh"], occ: ["everyday", "work"], prices: [11, 20, 45] },
  { name: "White Musk", desc: "Clean skin and soft cotton.", top: ["pear"], heart: ["lily", "cotton"], base: ["white musk"], family: ["musk", "floral"], vibes: ["calm", "fresh"], occ: ["everyday", "gift"], prices: [10, 18, 40] },
  { name: "Orange Peel", desc: "Bright peel, then a quiet resin.", top: ["mandarin", "orange peel"], heart: ["neroli"], base: ["labdanum"], family: ["citrus", "amber"], vibes: ["fresh", "warm"], occ: ["ceremony", "evening"], prices: [12, 22, 48], available: false },
];

const slugify = (s) => s.toLowerCase().replace(/\s+/g, "-");

for (const [i, s] of SAMPLES.entries()) {
  const png = await sharp(Buffer.from(bottleSvg({ width: 1200, height: 1200, fill: FILLS[i % 3] }))).png().toBuffer();
  const asset = await client.assets.upload("image", png, { filename: `${slugify(s.name)}.png` });
  await client.createOrReplace({
    _id: `product-${slugify(s.name)}`,
    _type: "product",
    name: s.name,
    slug: { _type: "slug", current: slugify(s.name) },
    description: s.desc,
    notesTop: s.top, notesHeart: s.heart, notesBase: s.base,
    scentFamily: s.family, vibes: s.vibes, occasions: s.occ,
    image: { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt: `${s.name} bottle, sample image` },
    sizes: [10, 20, 50].map((sizeMl, k) => ({ _key: `s${sizeMl}`, _type: "size", sizeMl, priceUsd: s.prices[k] })),
    available: s.available ?? true,
    displayOrder: (i + 1) * 10,
    isActive: true,
  });
  console.log(`seeded ${s.name}`);
}

await client.createOrReplace({
  _id: "siteSettings",
  _type: "siteSettings",
  storeName: "SAKA Parfum",
  address: "Replace with the shop address, Phnom Penh, Cambodia",
  hours: [{ _key: "h1", days: "Every day", open: "9:00", close: "19:00" }],
  phone: "+855 00 000 000",
  mapUrl: "https://maps.app.goo.gl/replace-me",
  socialLinks: [],
  stockUpdatedAt: new Date().toISOString(),
});
console.log("seeded settings");
