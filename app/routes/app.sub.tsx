import { useEffect, useState } from "react";
import { 
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Banner,
  SkeletonBodyText,
  Button,
  Icon,
  Box,
  List
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useSearchParams, useNavigate } from "@remix-run/react";
import { CheckIcon } from "@shopify/polaris-icons";

export default function SubscriptionDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  
  const chargeId = searchParams.get("charge_id");
  const planId = searchParams.get("plan");
  
  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (!chargeId || !planId) {
        setError("Missing charge ID or plan ID");
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/get-subscription?charge_id=${chargeId}&plan=${planId}`);
        const data = await response.json();
        
        if (response.ok) {
          setSubscription(data);
        } else {
          setError(data.error || "Failed to fetch subscription details");
        }
      } catch (err) {
        setError(`Error: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscriptionDetails();
  }, [chargeId]);
  
  // Format date to readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "PENDING":
        return "warning";
      case "CANCELLED":
      case "EXPIRED":
      case "FROZEN":
        return "critical";
      default:
        return "info";
    }
  };
  
  // Get interval label
  const getIntervalLabel = (interval: string) => {
    if (!interval) return "";
    return interval === "ANNUAL" ? "per year" : "per month";
  };
  
  return (
    <Page>
      <TitleBar title="Subscription Details" />
      
      {loading ? (
        <Card>
          <SkeletonBodyText lines={8} />
        </Card>
      ) : error ? (
        <Banner tone="critical" title="Error loading subscription">
          <p>{error}</p>
          <Button onClick={() => navigate("/app/subscription")}>
            Back to Subscription Plans
          </Button>
        </Banner>
      ) : (
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  Subscription Details
                </Text>
                
                <Banner tone={getStatusColor(subscription?.status)} title={`Status: ${subscription?.status}`}>
                  <p>
                    {subscription?.status === "ACTIVE" 
                      ? "Your subscription is active and working correctly." 
                      : `Your subscription is currently ${subscription?.status.toLowerCase()}.`}
                  </p>
                </Banner>
                
                <BlockStack gap="200">
                  <Box paddingBlockEnd="300">
                    <Text as="p" variant="bodyMd">
                      <strong>Plan:</strong> {subscription?.plan?.name}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>Price:</strong> ${subscription?.plan?.price} {getIntervalLabel(subscription?.plan?.interval)}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>Started:</strong> {formatDate(subscription?.createdAt)}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>Current Period End:</strong> {formatDate(subscription?.currentPeriodEnd)}
                    </Text>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  Included Features
                </Text>
                
                <List type="bullet">
                  {subscription?.plan?.features?.map((feature: string, index: number) => (
                    <List.Item key={index}>
                      <BlockStack gap="200" align="start">
                        <Text as="span" variant="bodyMd">{feature}</Text>
                      </BlockStack>
                    </List.Item>
                  ))}
                </List>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section>
            <Button variant="primary" onClick={() => navigate("/app/subscription-plans")}>
              Back to Subscription Plans
            </Button>
          </Layout.Section>
        </Layout>
      )}
    </Page>
  );
}