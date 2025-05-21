import { json } from '@remix-run/node';
import { getPlanById } from 'app/models/plans.server';
import { authenticate } from 'app/shopify.server';

export const loader = async ({ request }: any) => {
  try {
    // Authenticate the admin user
    const { admin, session } = await authenticate.admin(request);
    const storeName = session.shop.split('.')[0];
    console.log(storeName)
    
    if (!session || !session.shop) {
      // return json({ error: 'Authentication failed' }, { status: 401 });
      return new Response(
        JSON.stringify({ error: "Authentication failed" }), 
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the plan from URL query parameters
    const url = new URL(request.url);
    const selectedPlanId = url.searchParams.get('plan');
    
    if (!selectedPlanId) {
      // return json({ error: 'Plan ID is required' }, { status: 400 });
      return new Response(
        JSON.stringify({ error: "Plan ID is required" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Get plan details from MongoDB
    const planConfig = await getPlanById(selectedPlanId);
    if (!planConfig) {
      // return json({ error: 'Invalid plan ID' }, { status: 400 });
      return new Response(
        JSON.stringify({ error: "Invalid plan ID" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
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
    const returnUrl = `https://admin.shopify.com/store/${storeName}/apps/${process.env.APP_NAME}/app/sub?plan=${selectedPlanId}`;

    console.log(process.env.APP_NAME)
    const variables = {
      name: planConfig.name,
      returnUrl,
      trialDays: planConfig.trialDays,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: planConfig.price,
                currencyCode: 'USD',
              },
              interval: 'EVERY_30_DAYS',
            },
          },
        },
      ],
    };


    console.log('Creating subscription with details:', {
      shop: session.shop,
      planName: planConfig.name,
      returnUrl
    });

    try {
      const result = await admin.graphql(mutation, { variables });
      const jsonData = await result.json();
  
      const userErrors = jsonData?.data?.appSubscriptionCreate?.userErrors;
      if (userErrors && userErrors.length > 0) {
        console.error('User Errors:', userErrors);
        return new Response(JSON.stringify({ error: 'Billing creation failed due to user errors' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
  
      const confirmationUrl = jsonData?.data?.appSubscriptionCreate?.confirmationUrl;
  
      if (!confirmationUrl) {
        console.error('Missing confirmation URL:', jsonData);
        return new Response(JSON.stringify({ error: 'Billing creation failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
  
      return new Response(JSON.stringify({ confirmationUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
    // return json({ error: 'Internal server error', details: (error as Error).message }, { status: 500 });
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: (error as Error).message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};