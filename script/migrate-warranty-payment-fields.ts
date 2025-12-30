import pg from "pg";

const { Pool } = pg;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set, skipping migration (will run on server)");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Running migration: Add warranty and payment detail fields to sales table...");

  try {
    // Check if cash_received column exists
    const cashReceivedCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'cash_received'
      );
    `);

    if (!cashReceivedCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE sales
        ADD COLUMN cash_received DECIMAL(10, 2);
      `);
      console.log("✅ Added cash_received column to sales");
    } else {
      console.log("✅ cash_received column already exists");
    }

    // Check if change_given column exists
    const changeGivenCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'change_given'
      );
    `);

    if (!changeGivenCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE sales
        ADD COLUMN change_given DECIMAL(10, 2);
      `);
      console.log("✅ Added change_given column to sales");
    } else {
      console.log("✅ change_given column already exists");
    }

    // Check if cheque_number column exists
    const chequeNumberCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'cheque_number'
      );
    `);

    if (!chequeNumberCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE sales
        ADD COLUMN cheque_number TEXT;
      `);
      console.log("✅ Added cheque_number column to sales");
    } else {
      console.log("✅ cheque_number column already exists");
    }

    // Check if warranty_type column exists
    const warrantyTypeCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'warranty_type'
      );
    `);

    if (!warrantyTypeCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE sales
        ADD COLUMN warranty_type TEXT;
      `);
      console.log("✅ Added warranty_type column to sales");
    } else {
      console.log("✅ warranty_type column already exists");
    }

    // Check if warranty_duration column exists
    const warrantyDurationCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'warranty_duration'
      );
    `);

    if (!warrantyDurationCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE sales
        ADD COLUMN warranty_duration TEXT;
      `);
      console.log("✅ Added warranty_duration column to sales");
    } else {
      console.log("✅ warranty_duration column already exists");
    }

    // Check if warranty_item_ids column exists
    const warrantyItemIdsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'warranty_item_ids'
      );
    `);

    if (!warrantyItemIdsCheck.rows[0].exists) {
      await pool.query(`
        ALTER TABLE sales
        ADD COLUMN warranty_item_ids JSONB;
      `);
      console.log("✅ Added warranty_item_ids column to sales");
    } else {
      console.log("✅ warranty_item_ids column already exists");
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

