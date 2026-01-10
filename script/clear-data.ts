import pg from "pg";

const { Pool } = pg;

async function clearData() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set, cannot clear data");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Clearing products and sales data...");

  try {
    // Delete sale items first (foreign key constraint)
    await pool.query(`DELETE FROM sale_items;`);
    console.log("✅ Deleted all sale items");

    // Delete sales
    await pool.query(`DELETE FROM sales;`);
    console.log("✅ Deleted all sales");

    // Delete products
    await pool.query(`DELETE FROM products;`);
    console.log("✅ Deleted all products");

    // Delete expenses
    await pool.query(`DELETE FROM expenses;`);
    console.log("✅ Deleted all expenses");

    // Categories are preserved (not deleted)
    console.log("✅ Categories preserved");

    console.log("✅ Data cleared successfully!");
  } catch (error: any) {
    console.error("❌ Error clearing data:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  clearData().catch((err) => {
    console.error("Clear data failed:", err);
    process.exit(1);
  });
}

export { clearData };




