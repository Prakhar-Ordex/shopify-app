import React from "react";
import {
  Box,
  BlockStack,
  Card,
  Layout,
  Page,
  Text,
  Link,
  InlineStack,
  Button,
  List,
  Icon,
  Badge,
  AppProvider,
  Banner
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { useLoaderData, useNavigation } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { CheckIcon } from "@shopify/polaris-icons";
import { getAllPlans, getShopSubscription, initializeDefaultPlans } from "app/models/plans.server";
import enTranslations from '@shopify/polaris/locales/en.json';

interface Plan {
  id: string;
  name: string;
  price: number;
  trialDays: number;
  popular?: boolean;
  features: string[];
}

interface Subscription {
  planId: string;
  planName: string;
}

interface LoaderData {
  plans: Plan[];
  currentSubscription: Subscription | null;
  error?: string;
}

// Loader function to get all subscription plans and current subscription
export async function loader({ request }:any) {
  try {
    // Authenticate the admin user
    const { admin, session } = await authenticate.admin(request);
    const { shop } = session;
    
    // Get all available plans
    const plans = await getAllPlans();
    
    // Get the shop's current subscription
    const currentSubscription = await getShopSubscription(shop);
    
    return json({
      plans,
      currentSubscription,
    });
  } catch (error) {
    console.error("Error loading subscription data:", error);
    return json({
      plans: [],
      currentSubscription: null,
      error: "Failed to load subscription data"
    });
  }
}

export default function SubscriptionPlans() {
  const app:any = useAppBridge();
  const { plans, currentSubscription, error } = useLoaderData<LoaderData>();
  const navigation = useNavigation();
  const [subscribeError, setSubscribeError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  
  // Function to safely redirect
  function safeRedirect(url: string) {
    if (typeof window !== "undefined" && window.top) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  }
  
  // Function to subscribe to a plan
  const subscribeToPlan = async (planId: string) => {
    setIsLoading(true);
    setSubscribeError(null);
    
    try {
      console.log("Starting subscription process for plan:", planId);
      const res = await fetch(`/billing/start?plan=${planId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to subscribe");
      }

      const data = await res.json();
      console.log("Subscription response:", data);

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
        setSubscribeError("Subscription error: No confirmation URL received");
      }
    } catch (error) {
      console.error("Error subscribing to plan:", error);
      setSubscribeError((error as Error).message || "Failed to subscribe to plan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppProvider i18n={enTranslations}>
      <Page>
        <TitleBar title="Subscription Plans" />
        
        {error && (
          <Layout.Section>
            <Banner 
              title="Error loading plans" 
              tone="critical"
              onDismiss={() => {}}
            >
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}
        
        {subscribeError && (
          <Layout.Section>
            <Banner 
              title="Subscription Error" 
              tone="critical"
              onDismiss={() => setSubscribeError(null)}
            >
              <p>{subscribeError}</p>
            </Banner>
          </Layout.Section>
        )}
        
        {currentSubscription && (
          <Layout.Section>
            <Card padding="400">
              <BlockStack gap="300">
                <Text as="h2" variant="headingLg">
                  Current Subscription
                </Text>
                <InlineStack gap="300" blockAlign="center">
                  <Badge tone="success">Active</Badge>
                  <Text as="p" variant="headingMd">{currentSubscription.planName}</Text>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  Your subscription is currently active. You can upgrade or change your plan at any time.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
        
        <Layout>
          {Array.isArray(plans) && plans.length > 0 ? (
            plans.map((plan) => (
              <Layout.Section key={plan.id} variant="oneThird">
                <Card padding="400">
                  <BlockStack gap="400">
                    <BlockStack gap="200">
                      {plan.popular && <Badge tone="success">Most Popular</Badge>}
                      <Text as="h2" variant="headingLg">{plan.name}</Text>
                    </BlockStack>
                    
                    <Text as="h3" variant="headingXl">
                      ${plan.price}
                      <Text as="span" variant="bodyMd" tone="subdued"> / month</Text>
                    </Text>
                    
                    <Text as="p" variant="bodyMd">
                      {plan.trialDays > 0 ? `${plan.trialDays}-day free trial` : 'No free trial'}
                    </Text>
                    
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">Features:</Text>
                      <List type="bullet">
                        {Array.isArray(plan.features) && plan.features.map((feature, index) => (
                          <List.Item key={index}>
                            <InlineStack gap="200" blockAlign="center">
                              <Icon source={CheckIcon} tone="success" />
                              <Text as="p" variant="bodyMd">{feature}</Text>
                            </InlineStack>
                          </List.Item>
                        ))}
                      </List>
                    </BlockStack>
                    
                    <Button
                      variant="primary"
                      onClick={() => subscribeToPlan(plan.id)}
                      disabled={isLoading || currentSubscription?.planId === plan.id}
                      loading={isLoading}
                    >
                      {currentSubscription?.planId === plan.id
                        ? 'Current Plan'
                        : currentSubscription
                        ? 'Change Plan'
                        : 'Subscribe Now'}
                    </Button>
                  </BlockStack>
                </Card>
              </Layout.Section>
            ))
          ) : (
            <Layout.Section>
              <Card padding="400">
                <BlockStack gap="300">
                  <Text as="p" variant="headingMd">No subscription plans available</Text>
                  <Text as="p" variant="bodyMd">
                    There are currently no subscription plans configured. Please contact the administrator.
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </Page>
    </AppProvider>
  );
}