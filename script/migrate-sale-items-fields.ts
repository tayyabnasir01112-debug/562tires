import pg from "pg";

const { Pool } = pg;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set, skipping migration (will run on server)");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Running migration: Add costPrice and isTaxable to sale_items table...");

  try {
    // Check if cost_price column exists
    const costPriceCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sale_items' 
        AND column_name = 'cost_price'
      );
    `);

    if (!costPriceCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE sale_items
        ADD COLUMN cost_price DECIMAL(10, 2) NOT NULL DEFAULT '0';
      `);
      console.log("✅ Added cost_price column to sale_items");
    } else {
      console.log("✅ cost_price column already exists");
    }

    // Check if is_taxable column exists
    const isTaxableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sale_items' 
        AND column_name = 'is_taxable'
      );
    `);

    if (!isTaxableCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE sale_items
        ADD COLUMN is_taxable BOOLEAN NOT NULL DEFAULT TRUE;
      `);
      console.log("✅ Added is_taxable column to sale_items");
    } else {
      console.log("✅ is_taxable column already exists");
    }

    console.log("✅ Migration completed successfully!");
  } catch (error: any) {
    console.error("Migration error:", error.message);
    throw error;
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


