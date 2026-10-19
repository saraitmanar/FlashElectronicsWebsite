/**
 * npm run images:sync
 *
 * Processes product photos from photos/<product-slug>/ and records them in
 * content/images.manifest.json (commit that file).
 *
 *  - Every photo comes out the same size (PHOTO_SIZE, 4:5) as a JPEG on
 *    white. White-background photos are trimmed to the product and centered
 *    with an even margin; lifestyle/detail photos fill the frame instead
 *    (see src/lib/catalog/photo-format.ts). Also creates a tiny blur
 *    placeholder.
 *  - Unchanged photos are skipped (content hash), so re-running is cheap.
 *  - Destination: Cloudinary when CLOUDINARY_URL is set (in .env.local),
 *    otherwise public/catalog/<slug>/ (committed with the site).
 *  - A photo deleted from a product's folder is removed from the manifest.
 *    Products without a folder in photos/ are left untouched, so running this
 *    on a computer that doesn't have the original photos is safe.
 *
 * Photo names: see src/lib/catalog/image-names.ts (navy-1.jpg, main-1.jpg …).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp, { type Sharp } from "sharp";
import {
  imageManifestSchema,
  type ImageManifest,
  type ManifestImage,
} from "@/lib/catalog/authoring-schema";
import { loadCatalogFromDisk, MANIFEST_FILE } from "@/lib/catalog/load-content";
import { FULL_BLEED_NAMES, PHOTO_MARGIN, PHOTO_SIZE } from "@/lib/catalog/photo-format";

const ROOT = process.cwd();
const PHOTOS_DIR = path.join(ROOT, "photos");
const LOCAL_OUT_DIR = path.join(ROOT, "public", "catalog");
const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);
// Bump when processing settings change so every photo is re-processed.
const PROCESSING_VERSION = `v2-${PHOTO_SIZE.width}x${PHOTO_SIZE.height}-${PHOTO_MARGIN}`;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

if (existsSync(path.join(ROOT, ".env.local"))) process.loadEnvFile(path.join(ROOT, ".env.local"));
const cloudinary = parseCloudinaryUrl(process.env.CLOUDINARY_URL);

function parseCloudinaryUrl(url?: string) {
  if (!url) return null;
  const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!m)
    throw new Error("CLOUDINARY_URL must look like cloudinary://API_KEY:API_SECRET@CLOUD_NAME");
  return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
}

/** "Navy 1.JPG" → "navy-1" */
function cleanBaseName(file: string) {
  return path
    .basename(file, path.extname(file))
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

async function processPhoto(buffer: Buffer, fullBleed: boolean) {
  // Upright and on white first (transparent PNGs from background-removal apps).
  const upright = await sharp(buffer).rotate().flatten({ background: WHITE }).toBuffer();

  let framed: Sharp;
  if (fullBleed) {
    framed = sharp(upright).resize(PHOTO_SIZE.width, PHOTO_SIZE.height, { fit: "cover" });
  } else {
    // Cut away the white around the product, then center it with an even margin.
    const product = await sharp(upright)
      .trim({ background: WHITE, threshold: 12 })
      .toBuffer()
      .catch(() => upright); // an all-white image has nothing to trim
    const inner = {
      width: Math.round(PHOTO_SIZE.width * (1 - 2 * PHOTO_MARGIN)),
      height: Math.round(PHOTO_SIZE.height * (1 - 2 * PHOTO_MARGIN)),
    };
    const fitted = await sharp(product)
      .resize({ ...inner, fit: "inside" })
      .toBuffer({ resolveWithObject: true });
    const left = Math.round((PHOTO_SIZE.width - fitted.info.width) / 2);
    const top = Math.round((PHOTO_SIZE.height - fitted.info.height) / 2);
    framed = sharp(fitted.data).extend({
      left,
      right: PHOTO_SIZE.width - fitted.info.width - left,
      top,
      bottom: PHOTO_SIZE.height - fitted.info.height - top,
      background: WHITE,
    });
  }

  const { data, info } = await framed
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const blur = await sharp(data).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return {
    data,
    width: info.width,
    height: info.height,
    blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

async function uploadToCloudinary(data: Buffer, publicId: string) {
  const c = cloudinary!;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { overwrite: "true", public_id: publicId, timestamp };
  const toSign = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const signature = createHash("sha1")
    .update(toSign + c.apiSecret)
    .digest("hex");

  const form = new FormData();
  form.set("file", `data:image/jpeg;base64,${data.toString("base64")}`);
  form.set("api_key", c.apiKey);
  form.set("signature", signature);
  for (const [k, v] of Object.entries(params)) form.set(k, v);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { secure_url: string };
  return json.secure_url;
}

async function main() {
  if (!existsSync(PHOTOS_DIR)) {
    console.log(
      `No photos/ folder. Create photos/<product-slug>/ and add photos named like navy-1.jpg.`,
    );
    return;
  }

  const productSlugs = new Set(loadCatalogFromDisk().catalog.products.map((p) => p.slug));
  const manifest: ImageManifest = existsSync(MANIFEST_FILE)
    ? imageManifestSchema.parse(JSON.parse(readFileSync(MANIFEST_FILE, "utf8")))
    : { version: 1, products: {} };

  const provider = cloudinary ? "cloudinary" : "local";
  console.log(
    `Syncing photos → ${cloudinary ? `Cloudinary (${cloudinary.cloudName})` : "public/catalog/"}\n`,
  );
  const stats = { added: 0, updated: 0, unchanged: 0, removed: 0 };

  const folders = readdirSync(PHOTOS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const folder of folders.sort((a, b) => a.name.localeCompare(b.name))) {
    const slug = folder.name;
    if (!productSlugs.has(slug)) {
      console.warn(
        `⚠ photos/${slug}/: no product with this slug (content/products/${slug}.yaml); skipped`,
      );
      continue;
    }

    const previous = new Map((manifest.products[slug] ?? []).map((img) => [img.file, img]));
    const next: ManifestImage[] = [];
    const seen = new Set<string>();

    const files = readdirSync(path.join(PHOTOS_DIR, slug)).filter((f) => !f.startsWith("."));
    for (const original of files.sort()) {
      if (!SUPPORTED.has(path.extname(original).toLowerCase())) {
        console.warn(`⚠ photos/${slug}/${original}: unsupported file type; use JPG, PNG or WebP`);
        continue;
      }
      const base = cleanBaseName(original);
      const file = `${base}.jpg`;
      if (seen.has(file)) {
        console.warn(
          `⚠ photos/${slug}/${original}: another photo is also named "${base}"; skipped`,
        );
        continue;
      }
      seen.add(file);

      const buffer = readFileSync(path.join(PHOTOS_DIR, slug, original));
      const hash = createHash("sha1")
        .update(PROCESSING_VERSION)
        .update(buffer)
        .digest("hex")
        .slice(0, 16);
      const existing = previous.get(file);
      const localPath = path.join(LOCAL_OUT_DIR, slug, file);
      const stillThere = existing?.provider === "cloudinary" || existsSync(localPath);
      if (existing && existing.hash === hash && existing.provider === provider && stillThere) {
        next.push(existing);
        stats.unchanged++;
        continue;
      }

      // Names may start with the product's first word: "cordelia-lifestyle-1".
      const prefix = `${slug.split("-")[0]}-`;
      const name = base.startsWith(prefix) ? base.slice(prefix.length) : base;
      const fullBleed = FULL_BLEED_NAMES.some((n) => name === n || name.startsWith(`${n}-`));
      const processed = await processPhoto(buffer, fullBleed);
      let src: string;
      if (cloudinary) {
        src = await uploadToCloudinary(processed.data, `products/${slug}/${base}`);
        // Moving from local files to Cloudinary: drop the old local copy.
        if (existing?.provider === "local") rmSync(localPath, { force: true });
      } else {
        mkdirSync(path.dirname(localPath), { recursive: true });
        writeFileSync(localPath, processed.data);
        src = `/catalog/${slug}/${file}`;
      }
      next.push({
        file,
        hash,
        src,
        width: processed.width,
        height: processed.height,
        blurDataURL: processed.blurDataURL,
        provider,
      });
      if (existing) stats.updated++;
      else stats.added++;
      console.log(
        `${existing ? "↻" : "+"} ${slug}/${file} (${processed.width}×${processed.height})`,
      );
    }

    // Photos removed from this product's folder.
    for (const [file, img] of previous) {
      if (next.some((n) => n.file === file)) continue;
      if (img.provider === "local") rmSync(path.join(LOCAL_OUT_DIR, slug, file), { force: true });
      stats.removed++;
      console.log(`- ${slug}/${file}`);
    }

    if (next.length) manifest.products[slug] = next;
    else delete manifest.products[slug];
  }

  const sorted: ImageManifest = {
    version: 1,
    products: Object.fromEntries(
      Object.entries(manifest.products).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
  writeFileSync(MANIFEST_FILE, `${JSON.stringify(sorted, null, 2)}\n`);

  console.log(
    `\nDone: ${stats.added} added, ${stats.updated} updated, ${stats.unchanged} unchanged, ${stats.removed} removed.`,
  );
  console.log(
    "Next: npm run content:check, then commit content/images.manifest.json" +
      (cloudinary ? "." : " and public/catalog/."),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
