import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { migrate as migrateCustomItems } from "./migrate-custom-items.js";
import { migrate as migrateExpenses } from "./migrate-expenses.js";
import { seedDefaultCategories } from "./seed-default-categories.js";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  // Run database migrations if DATABASE_URL is available
  try {
    await migrateCustomItems();
  } catch (err) {
    console.log("Custom items migration skipped or failed (non-blocking):", err);
  }
  
  try {
    await migrateExpenses();
  } catch (err) {
    console.log("Expenses migration skipped or failed (non-blocking):", err);
  }

  // Seed default categories
  try {
    await seedDefaultCategories();
  } catch (err) {
    console.log("Category seed skipped or failed (non-blocking):", err);
  }

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
