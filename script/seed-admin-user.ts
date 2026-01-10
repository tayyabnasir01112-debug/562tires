import pg from "pg";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const { Pool } = pg;

const DEFAULT_ADMIN = {
  username: "Admin",
  password: "Pedro562",
  role: "admin" as const,
};

async function seedAdminUser() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set, skipping admin seed (will run on server)");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("Seeding default admin user...");

  try {
    // Check if admin user already exists
    const existing = await db.select().from(users).where(eq(users.username, DEFAULT_ADMIN.username));
    
    if (existing.length > 0) {
      console.log("✅ Admin user already exists");
      
      // Update password if needed (in case it changed)
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
      await db.update(users)
        .set({ 
          password: hashedPassword,
          role: "admin",
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(users.username, DEFAULT_ADMIN.username));
      console.log("✅ Admin user password updated");
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
      await db.insert(users).values({
        username: DEFAULT_ADMIN.username,
        password: hashedPassword,
        role: "admin",
        isActive: true,
      }).execute();
      console.log(`✅ Created admin user: ${DEFAULT_ADMIN.username}`);
    }
  } catch (error: any) {
    console.error("Admin user seeding error:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdminUser().catch((err) => {
    console.error("Admin user seeding failed:", err);
    process.exit(1);
  });
}

export { seedAdminUser };

