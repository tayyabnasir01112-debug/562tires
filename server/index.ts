import { createApp, log } from "./app";

(async () => {
  const isProduction = process.env.NODE_ENV === "production";
  const { httpServer } = await createApp({
    serveStatic: isProduction,
    enableVite: !isProduction,
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
