import type { Handler } from "@netlify/functions";
import serverlessHttp from "serverless-http";
import { createApp } from "../../server/app";

let cachedHandler: ReturnType<typeof serverlessHttp> | null = null;

async function getHandler() {
  if (!cachedHandler) {
    const { app } = await createApp({ serveStatic: false, enableVite: false });
    cachedHandler = serverlessHttp(app);
  }
  return cachedHandler;
}

export const handler: Handler = async (event, context) => {
  const handler = await getHandler();
  return handler(event, context);
};

