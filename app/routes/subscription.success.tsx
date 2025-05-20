import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card, BlockStack, Text, Button, Link, Banner, InlineStack, Icon } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { CheckCircleIcon } from '@shopify/polaris-icons';
import { authenticate } from 'app/shopify.server';
import { getShopSubscription } from 'app/models/plans.server';

export const loader = async ({ request }: { request: Request }) => {
  try {
    // Extract shop from query params in case we're coming from a redirect
    const url = new URL(request.url);
    const shopParam = url.searchParams.get('shop');
    
    // Try to authenticate, but handle failure gracefully
    let session;
    try {
      const authResponse = await authenticate.admin(request);
      session = authResponse.session;
    } catch (error) {
      console.error('Authentication error in success page:', error);
      
      // If we have a shop param, use it to retry authentication
      if (shopParam) {
        return redirect(`/auth?shop=${shopParam}`);
      } else {
        return redirect('/auth');
      }
    }
    
    const shop = session?.shop || shopParam;
    
    if (!shop) {
      console.error('No shop found in session or URL params');
      return redirect('/auth');
    }
    
    try {
      // Get the current subscription to display details
      const subscription = await getShopSubscription(shop);
      
      if (!subscription) {
        // If no subscription is found, redirect to the plans page with shop param
        console.warn(`No subscription found for shop: ${shop}`);
        return redirect(`/app/plans?shop=${shop}`);
      }
      
      return json({
        subscription,
        shop
      });
    } catch (dataError) {
      console.error('Error fetching subscription data:', dataError);
      return json({
        error: 'Failed to load subscription details',
        shop
      });
    }
  } catch (error) {
    console.error('Unhandled error in subscription success page:', error);
    return json({
      error: 'An unexpected error occurred',
      shop: null
    });
  }
};

export default function SubscriptionSuccess() {
  const { subscription, shop, error }:any = useLoaderData();
  
  return (
    <Page>
      <TitleBar title="Subscription Activated" />
      
      {error ? (
        <Layout.Section>
          <Banner 
            title="Error loading subscription details" 
            tone="critical"
          >
            <p>{error}</p>
            <Button url={`/app/plans${shop ? `?shop=${shop}` : ''}`}>View Plans</Button>
          </Banner>
        </Layout.Section>
      ) : (
        <Layout>
          <Layout.Section>
            <Card padding="800">
              <BlockStack gap="600" align="center">
                <InlineStack gap="400" align="center">
                  <Icon source={CheckCircleIcon} tone="success" />
                  <Text as="h2" variant="headingXl">Subscription Successful!</Text>
                </InlineStack>
                
                <Text as="p" variant="bodyLg">
                  Your subscription to {subscription.planName} has been successfully activated.
                </Text>
                
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Subscription Details:</Text>
                  <Text as="p" variant="bodyMd">Plan: {subscription.planName}</Text>
                  <Text as="p" variant="bodyMd">Price: ${subscription.price}/month</Text>
                  {subscription.trialDays > 0 && (
                    <Text as="p" variant="bodyMd">Trial: {subscription.trialDays} days</Text>
                  )}
                </BlockStack>
                
                <Text as="p" variant="bodyMd">
                  Thank you for subscribing. You now have access to all the features included in your plan.
                </Text>
                
                <InlineStack gap="300">
                  <Button url={`/app${shop ? `?shop=${shop}` : ''}`} variant="primary">Go to Dashboard</Button>
                  <Button url={`/app/plans${shop ? `?shop=${shop}` : ''}`} variant="plain">View All Plans</Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      )}
    </Page>
  );
}