import pg from "pg";

const { Pool } = pg;

const DEFAULT_CATEGORIES = [
  { name: "Tires", description: "All types of tires" },
  { name: "Wheels", description: "Wheels and rims" },
  { name: "Tire Parts", description: "Accessories and parts for tires" },
];

async function seedDefaultCategories() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set, skipping category seed (will run on server)");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Seeding default categories...");

  try {
    // Check if categories table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'categories'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log("⚠️  Categories table does not exist yet, skipping seed");
      await pool.end();
      return;
    }

    // Get existing categories
    const existing = await pool.query(`SELECT name FROM categories;`);
    const existingNames = new Set(existing.rows.map((r: any) => r.name.toLowerCase()));

    // Insert missing categories
    let createdCount = 0;
    for (const cat of DEFAULT_CATEGORIES) {
      if (!existingNames.has(cat.name.toLowerCase())) {
        await pool.query(
          `INSERT INTO categories (name, description) VALUES ($1, $2);`,
          [cat.name, cat.description]
        );
        console.log(`✅ Created category: ${cat.name}`);
        createdCount++;
      }
    }

    if (createdCount === 0) {
      console.log("✅ All default categories already exist");
    } else {
      console.log(`✅ Seeded ${createdCount} default categories`);
    }
  } catch (error: any) {
    console.error("❌ Error seeding categories:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Only run if called directly (not during import)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDefaultCategories().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}

export { seedDefaultCategories };




