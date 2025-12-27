import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";

export async function createServerlessApp() {
  const app = express();
  const httpServer = createServer(app);

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  await registerRoutes(httpServer, app);

  return { app, httpServer };
}






