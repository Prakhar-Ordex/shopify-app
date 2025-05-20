import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  Button,
} from "@shopify/polaris";
import {
  ShopifyGlobal,
  TitleBar,
  useAppBridge,
} from "@shopify/app-bridge-react";
import { useEffect, useState, useCallback } from "react"; // Import useCallback
import { Redirect } from "@shopify/app-bridge/actions";
import { authenticate } from "app/shopify.server";
import { getSessionToken } from "@shopify/app-bridge-utils";

export default function AdditionalPage() {
  const app: any = useAppBridge();
  const [shopOriginFromBridge, setShopOriginFromBridge] = useState<string | null>(null);

  useEffect(() => {
      if (app?.hostOrigin) {
          const url = new URL(app.hostOrigin);
          setShopOriginFromBridge(url.hostname);
      } else {
          console.warn("App Bridge hostOrigin not available yet.");
      }
  }, [app]);

  const safeRedirect = useCallback((url: string) => { // Use useCallback
      if (typeof window !== "undefined" && window.top) {
          window.top.location.href = url;
      } else {
          window.location.href = url;
      }
  }, []);

  const subscribeToPlan = useCallback(async (plan: string) => { // Use useCallback
      if (!shopOriginFromBridge) {
          console.error("Shop origin not available from App Bridge.");
          return;
      }

      // const token = await getSessionToken(app);
      // console.log("token",token);

      const res = await fetch(`/billing/start?plan=${plan}&shop=${shopOriginFromBridge}`, {
          credentials: "include",
          // headers: {
          //  Authorization: `Bearer ${token}`,
          // },
      });

      const data = await res.json();

      if (data?.confirmationUrl) {
          const redirect = Redirect.create(app);

          // Safely check if redirect object has dispatch method
          if (redirect && typeof redirect.dispatch === "function") {
              try {
                  redirect.dispatch(Redirect.Action.REMOTE, data.confirmationUrl);
              } catch (err) {
                  console.error("App Bridge redirect failed, falling back", err);
                  safeRedirect(data.confirmationUrl);
              }
          } else {
              console.warn("Redirect fallback triggered");
              safeRedirect(data.confirmationUrl);
          }
      } else {
          console.error("Subscription error", data);
      }
  }, [app, safeRedirect, shopOriginFromBridge]); // Add dependencies to useCallback

  return (
      <Page>
          <TitleBar title="Additional page" />
          <Layout>
              <Layout.Section>
                  <Card>
                      <BlockStack gap="300">
                          <Text as="p" variant="bodyMd">
                              Tgdfgdfg{" "}
                              <Link
                                  url="https://shopify.dev/docs/apps/tools/app-bridge"
                                  target="_blank"
                                  removeUnderline
                              >
                                  App Bridge
                              </Link>
                              .
                          </Text>
                          <Text as="p" variant="bodyMd">
                              To create your own page and have it show up in the app
                              navigation, add a page inside <Code>app/routes</Code>, and a
                              link to it in the <Code>&lt;NavMenu&gt;</Code> component found
                              in <Code>app/routes/app.jsx</Code>.
                          </Text>
                      </BlockStack>
                  </Card>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                  <Card>
                      <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                              Resources
                          </Text>
                          <List>
                              <List.Item>
                                  <Link
                                      url="https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav"
                                      target="_blank"
                                      removeUnderline
                                  >
                                      App nav best practices
                                  </Link>
                              </List.Item>
                              <Button onClick={() => subscribeToPlan("bronze")}>
                                  Subscribe to Bronze Plan
                              </Button>
                          </List>
                      </BlockStack>
                  </Card>
              </Layout.Section>
          </Layout>
      </Page>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
      <Box
          as="span"
          padding="025"
          paddingInlineStart="100"
          paddingInlineEnd="100"
          background="bg-surface-active"
          borderWidth="025"
          borderColor="border"
          borderRadius="100"
      >
          <code>{children}</code>
      </Box>
  );
}