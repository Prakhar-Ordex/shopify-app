import { json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card, BlockStack, Text, Button, Banner, InlineStack, Icon } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { AlertTriangleIcon } from '@shopify/polaris-icons';
import { authenticate } from 'app/shopify.server';

export const loader = async ({ request }) => {
  try {
    // Extract shop from query params in case we're coming from a redirect
    const url = new URL(request.url);
    const shopParam = url.searchParams.get('shop');
    
    // Try to authenticate, but handle failure gracefully
    let shop = shopParam;
    try {
      const { session } = await authenticate.admin(request);
      shop = session.shop || shopParam;
    } catch (error) {
      console.log('Authentication error in error page, proceeding with shop from URL:', shopParam);
      // Continue with the shop from URL parameters
    }
    
    return json({
      shop,
      errorMessage: 'There was an issue processing your subscription. Please try again or contact support if the problem persists.'
    });
  } catch (error) {
    console.error('Unhandled error in subscription error page:', error);
    return json({
      shop: null,
      errorMessage: 'Authentication error. Please log in again.'
    });
  }
};

export default function SubscriptionError() {
  const { shop, errorMessage }:any = useLoaderData();
  
  return (
    <Page>
      <TitleBar title="Subscription Error" />
      
      <Layout>
        <Layout.Section>
          <Card padding="800">
            <BlockStack gap="600" align="center">
              <InlineStack gap="400" align="center">
                <Icon source={AlertTriangleIcon} tone="critical" />
                <Text as="h2" variant="headingXl">Subscription Error</Text>
              </InlineStack>
              
              <Banner
                title="We encountered a problem"
                status="critical"
              >
                <p>{errorMessage}</p>
              </Banner>
              
              <Text as="p" variant="bodyLg">
                Your subscription could not be processed successfully. This could be due to:
              </Text>
              
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">• A temporary issue with the payment system</Text>
                <Text as="p" variant="bodyMd">• The subscription was declined or canceled</Text>
                <Text as="p" variant="bodyMd">• An issue with your Shopify account</Text>
                <Text as="p" variant="bodyMd">• A technical error with our system</Text>
              </BlockStack>
              
              <InlineStack gap="300">
                <Button url={`/app/plans${shop ? `?shop=${shop}` : ''}`} primary>Try Again</Button>
                <Button url={`/app${shop ? `?shop=${shop}` : ''}`} plain>Return to Dashboard</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}