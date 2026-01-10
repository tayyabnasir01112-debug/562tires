import express from "express";
import session from "express-session";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

const { Pool } = pg;
const PgSession = connectPgSimple(session);

export async function createServerlessApp() {
  const app = express();
  const httpServer = createServer(app);

  // Session store using PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  // Configure session middleware
  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        tableName: "session",
      }),
      secret: process.env.SESSION_SECRET || "tyre-flow-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production" || process.env.NETLIFY === "true",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: "lax",
        domain: process.env.NODE_ENV === "production" ? undefined : undefined, // Let browser set domain
      },
    })
  );

  await registerRoutes(httpServer, app);

  return { app, httpServer };
}










