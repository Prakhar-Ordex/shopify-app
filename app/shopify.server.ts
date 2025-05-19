import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { MongoDBSessionStorage } from "@shopify/shopify-app-session-storage-mongodb";
import { db } from "./db.server";
import { redirect } from "@remix-run/node";

// MongoDB connection details
const mongoUrlString = process.env.MONGODB_URI || "mongodb://localhost:27017/shopify-app";
// Convert string URL to URL object
const mongoUrl = new URL(mongoUrlString);

// Create MongoDB session storage with correct parameters
const mongoSessionStorage = new MongoDBSessionStorage(
  mongoUrl,
 "Donate_Me_Test_app"
);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: mongoSessionStorage,
  distribution: AppDistribution.AppStore,
  hooks:{
    afterAuth: async ({ session,admin, redirect }:any) => {
      console.log("afterAuth triggered, redirecting to /app/products")
      return redirect("/app/products");
    }
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const { sessionStorage } = shopify;