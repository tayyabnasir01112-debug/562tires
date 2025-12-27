import pg from "pg";

const { Pool } = pg;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set, skipping migration (will run on server)");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Running migration: Make productId nullable in sale_items table...");

  try {
    // Check if column is already nullable
    const result = await pool.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'sale_items' 
      AND column_name = 'product_id';
    `);

    if (result.rows.length > 0 && result.rows[0].is_nullable === 'YES') {
      console.log("✅ Column is already nullable, skipping migration.");
      return;
    }

    // Alter the column to allow NULL values
    await pool.query(`
      ALTER TABLE sale_items 
      ALTER COLUMN product_id DROP NOT NULL;
    `);

    console.log("✅ Migration completed successfully!");
    console.log("The product_id column in sale_items table is now nullable.");
  } catch (error: any) {
    if (error.message?.includes("does not exist") || error.message?.includes("column")) {
      console.log("⚠️  Column might already be nullable or table structure differs.");
      console.log("Error:", error.message);
    } else {
      console.error("Migration error:", error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// Only run if called directly (not during import)
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}

export { migrate };

