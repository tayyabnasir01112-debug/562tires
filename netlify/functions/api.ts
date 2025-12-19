import type { Handler } from "@netlify/functions";
import serverlessHttp from "serverless-http";
import { createServerlessApp } from "../../server/app-serverless";

let cachedHandler: ReturnType<typeof serverlessHttp> | null = null;

async function getHandler() {
  if (!cachedHandler) {
    const { app } = await createServerlessApp();
    cachedHandler = serverlessHttp(app);
  }
  return cachedHandler;
}

export const handler: Handler = async (event, context) => {
  const handler = await getHandler();
  return handler(event, context);
};

