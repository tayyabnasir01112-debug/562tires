import pg from "pg";

const { Pool } = pg;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set, skipping migration (will run on server)");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Running migration: Update users table with role and proper schema...");

  try {
    // Check if users table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (tableExists.rows[0].exists) {
      // Drop old users table if it has wrong schema
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);

      const hasIdVarchar = columns.rows.some((col: any) => col.column_name === 'id' && col.data_type === 'character varying');
      
      if (hasIdVarchar) {
        console.log("⚠️  Dropping old users table to recreate with new schema...");
        await pool.query(`DROP TABLE IF EXISTS users CASCADE;`);
      }
    }

    // Create users table with new schema
    const createTable = await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ Users table created/verified");

    // Check if role column exists (for existing tables)
    const roleCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'role'
      );
    `);

    if (!roleCheck.rows[0].exists) {
      await pool.query(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'employee';`);
      console.log("✅ Added role column to users");
    }

    // Check if is_active column exists
    const isActiveCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'is_active'
      );
    `);

    if (!isActiveCheck.rows[0].exists) {
      await pool.query(`ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;`);
      console.log("✅ Added is_active column to users");
    }

    // Check if updated_at column exists
    const updatedAtCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'updated_at'
      );
    `);

    if (!updatedAtCheck.rows[0].exists) {
      await pool.query(`ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();`);
      console.log("✅ Added updated_at column to users");
    }

    console.log("✅ Migration completed successfully!");
  } catch (error: any) {
    console.error("Migration error:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}

export { migrate };

