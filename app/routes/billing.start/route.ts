import { json } from '@remix-run/node';
import { getPlanById } from 'app/models/plans.server';
import { authenticate } from 'app/shopify.server';

export const loader = async ({ request }: any) => {
  try {
    // Authenticate the admin user
    const { admin, session } = await authenticate.admin(request);
    
    if (!session || !session.shop) {
      return json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Get the plan from URL query parameters
    const url = new URL(request.url);
    const selectedPlanId = url.searchParams.get('plan');
    
    if (!selectedPlanId) {
      return json({ error: 'Plan ID is required' }, { status: 400 });
    }
    
    // Get plan details from MongoDB
    const planConfig = await getPlanById(selectedPlanId);
    if (!planConfig) {
      return json({ error: 'Invalid plan ID' }, { status: 400 });
    }
    
    // GraphQL mutation to create subscription
    const mutation = `
      mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $trialDays: Int, $lineItems: [AppSubscriptionLineItemInput!]!) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          trialDays: $trialDays
          test: true
          lineItems: $lineItems
        ) {
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `;

    const returnUrl = `https://admin.shopify.com/store/prakhar-09/apps/innovative-conversion-app-11/app/additional?plan=${selectedPlanId}`;
    // Construct the return URL for confirmation
    // Make sure to include both shop and plan parameters in the callback URL
    // const returnUrl = `${process.env.SHOPIFY_APP_URL}/billing/callback?shop=${session.shop}&plan=${selectedPlanId}`;

    // Prepare the request body with plan details
    const body = {
      query: mutation,
      variables: {
        name: planConfig.name,
        returnUrl,
        trialDays: planConfig.trialDays || 0,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: planConfig.price,
                  currencyCode: 'USD',
                },
                interval: planConfig.interval || 'EVERY_30_DAYS',
              },
            },
          },
        ],
      },
    };

    console.log('Creating subscription with details:', {
      shop: session.shop,
      planName: planConfig.name,
      returnUrl
    });

    // Make the API call to Shopify to create the subscription
    const response = await fetch(`https://${session.shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
        'Content-Type': 'application/json',
      }as HeadersInit,
      body: JSON.stringify(body),
    });

    // Parse the response from Shopify
    const parsed = await response.json();
      console.log("parsed",parsed);
      
    // Check for user errors in the response
    const userErrors = parsed?.data?.appSubscriptionCreate?.userErrors;
    if (userErrors && userErrors.length > 0) {
      console.error('Subscription creation user errors:', userErrors);
      return json({ error: 'Billing creation failed due to user errors', details: userErrors }, { status: 400 });
    }

    // Get the confirmation URL from the response
    const confirmationUrl = parsed?.data?.appSubscriptionCreate?.confirmationUrl;

    // If no confirmation URL is returned, log the error
    if (!confirmationUrl) {
      console.error('Billing error, no confirmation URL returned:', parsed);
      return json({ error: 'Billing creation failed' }, { status: 500 });
    }

    console.log('Subscription created successfully, redirecting to:', confirmationUrl);
    return json({ confirmationUrl });
    
  } catch (error) {
    console.error('Error creating subscription:', error);
    return json({ error: 'Internal server error', details: (error as Error).message }, { status: 500 });
  }
};