import pg from "pg";

const { Pool } = pg;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set, skipping migration (will run on server)");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Running migration: Create expenses table...");

  try {
    // Check if table already exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'expenses'
      );
    `);

    if (result.rows[0].exists) {
      console.log("✅ Expenses table already exists, skipping migration.");
      return;
    }

    // Create expenses table
    await pool.query(`
      CREATE TABLE expenses (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category TEXT,
        payment_method TEXT,
        notes TEXT,
        expense_date TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ Migration completed successfully!");
    console.log("The expenses table has been created.");
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

