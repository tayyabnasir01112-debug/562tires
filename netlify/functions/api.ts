import type { Handler } from "@netlify/functions";
import serverlessHttp from "serverless-http";
import { createServerlessApp } from "../../server/app-serverless";

let cached: ReturnType<typeof serverlessHttp> | null = null;

async function getHandler() {
  if (!cached) {
    const { app } = await createServerlessApp();
    cached = serverlessHttp(app);
  }
  return cached;
}

export const handler: Handler = async (event, context) => {
  const h = await getHandler();
  return h(event, context);
};

