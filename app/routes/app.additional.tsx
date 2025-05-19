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
import { useEffect, useState } from "react";
import { Redirect } from "@shopify/app-bridge/actions";

export default function AdditionalPage() {
  const app: any = useAppBridge(); // Using the correct app instance from App Bridge
  function safeRedirect(url: string) {
    if (typeof window !== "undefined" && window.top) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  }
  const subscribeToPlan = async (plan: string) => {
    const res = await fetch(`/billing/start?plan=${plan}`, {
      credentials: "include",
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
  };

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