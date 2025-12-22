import { db, pool } from "../server/db";
import { categories, products } from "@shared/schema";
import { inArray } from "drizzle-orm";

const DEFAULT_CATEGORIES = [
  { name: "Tires", description: "All types of tires" },
  { name: "Wheels", description: "Wheels and rims" },
  { name: "Tire Parts", description: "Accessories and parts for tires" },
];

async function main() {
  console.log("Resetting categories to defaults...");

  const defaults = DEFAULT_CATEGORIES.map((c) => c.name);

  // Find categories not in defaults
  const existing = await db.select().from(categories);
  const nonDefault = existing.filter((c) => !defaults.includes(c.name));

  if (nonDefault.length > 0) {
    const nonDefaultIds = nonDefault.map((c) => c.id);
    console.log("Clearing category on products for non-default categories...");
    await db
      .update(products)
      .set({ categoryId: null })
      .where(inArray(products.categoryId, nonDefaultIds));

    console.log("Deleting non-default categories...");
    await db.delete(categories).where(inArray(categories.id, nonDefaultIds));
  }

  // Ensure defaults exist
  for (const cat of DEFAULT_CATEGORIES) {
    const existingDefault = existing.find((c) => c.name === cat.name);
    if (!existingDefault) {
      await db.insert(categories).values(cat);
      console.log(`Inserted default category: ${cat.name}`);
    }
  }

  console.log("Done.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});

