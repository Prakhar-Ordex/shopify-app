import { authenticate } from '../../shopify.server';
import { redirect } from '@remix-run/node';

export const loader = async ({ request }: any) => {
  // Authenticate the admin user
  const { session } = await authenticate.admin(request);

  // Get the plan from URL query parameters
  const url = new URL(request.url);
  const selectedPlan = url.searchParams.get('plan');
  console.log('Session:', session);
  console.log('Selected plan:', selectedPlan);

  // Define the plan configurations
  const planConfig = {
    bronze: { name: 'Bronze Plan', price: 5, trial_days: 7 },
    silver: { name: 'Silver Plan', price: 15, trial_days: 14 },
  }[selectedPlan as string];

  // Validate selected plan
  if (!planConfig) {
    return new Response(JSON.stringify({ error: 'Invalid plan' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('Selected plan:', selectedPlan, 'Config:', planConfig);
  console.log('Session Access Token:', session.accessToken);

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

  // Construct the return URL for confirmation
  // const returnUrl = `${process.env.SHOPIFY_APP_URL}/billing/callback`;
  const returnUrl = `${process.env.SHOPIFY_APP_URL}/billing/callback?shop=${session.shop}&plan=${selectedPlan}`;
  console.log('Return URL:', returnUrl);

  // Prepare the request body with plan details
  const body = {
    query: mutation,
    variables: {
      name: planConfig.name,
      returnUrl,
      trialDays: planConfig.trial_days,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: planConfig.price,
                currencyCode: 'USD',
              },
              interval: 'EVERY_30_DAYS', // Make sure this is supported by Shopify's API
            },
          },
        },
      ],
    },
  };


  console.log('GraphQL Request Body:', JSON.stringify(body));

  // Make the API call to Shopify to create the subscription
  const response = await fetch(`https://${session.shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': session.accessToken!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  // Parse the response from Shopify
  const json = await response.json();
  console.log('Response JSON:', json);

  // Check for user errors in the response
  const userErrors = json?.data?.appSubscriptionCreate?.userErrors;
  if (userErrors && userErrors.length > 0) {
    console.error('User Errors:', userErrors);
    return new Response(JSON.stringify({ error: 'Billing creation failed due to user errors' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get the confirmation URL from the response
  const confirmationUrl = json?.data?.appSubscriptionCreate?.confirmationUrl;

  // If no confirmation URL is returned, log the error
  if (!confirmationUrl) {
    console.error('Billing error:', json);
    return new Response(JSON.stringify({ error: 'Billing creation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ confirmationUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
