import { json, redirect } from '@remix-run/node';
import { authenticate } from 'app/shopify.server';
import { getPlanById, createSubscription } from 'app/models/plans.server';
import { db } from 'app/db.server';

export const loader = async ({ request }: any) => {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const selectedPlanId = url.searchParams.get('plan');
    const chargeId = url.searchParams.get('charge_id');
    const shop = url.searchParams.get('shop');
    
    console.log('Billing callback received with params:', { 
      plan: selectedPlanId,
      chargeId,
      shop 
    });
    
    if (!selectedPlanId || !shop) {
      console.error('Missing required parameters:', { plan: selectedPlanId, shop });
      return redirect('/subscription/error');
    }

    // If there's no charge_id, redirect to home
    if (!chargeId) {
      console.warn('No charge_id present in callback');
      return redirect('/app');
    }

    // Get plan details from MongoDB - this doesn't need authentication
    const planConfig = await getPlanById(selectedPlanId);
    
    if (!planConfig) {
      console.error(`Invalid plan ID: ${selectedPlanId}`);
      return redirect('/subscription/error');
    }

    // For billing callbacks, we need a way to maintain authentication despite the redirect
    try {
      // Try standard authentication first
      let session;
      
      try {
        // Try standard auth
        console.log("Attempting standard authentication");
        const authResponse = await authenticate.admin(request);
        session = authResponse.session;
        console.log("Standard authentication successful");
      } catch (authError:any) {
        console.log("Standard authentication failed:", authError.message);
      }
      
      // If no session yet, try to retrieve the session from the database using the shop domain
      if (!session) {
        try {
          console.log(`Looking up session from database for shop: ${shop}`);
          // You need to implement this method to retrieve the latest session for the shop
          // from your session storage
          const sessionData = await db.collection('shopify_sessions')
            .find({ shop: shop })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();
          
          if (sessionData.length > 0 && sessionData[0].accessToken) {
            console.log("Found valid session in database");
            session = sessionData[0];
          } else {
            console.log("No valid session found in database");
          }
        } catch (dbError:any) {
          console.log("Database session lookup failed:", dbError.message);
        }
      }
      
      // Last resort - redirect to auth if everything else failed
      if (!session || !session.accessToken) {
        console.log("All authentication methods failed, redirecting to auth");
        
        // We need to ensure we get back to this callback after authentication
        // Store callback information in a state parameter or session
        const returnUrl = `/billing/callback?shop=${shop}&plan=${selectedPlanId}&charge_id=${chargeId}`;
        return redirect(`/auth?shop=${shop}&returnUrl=${encodeURIComponent(returnUrl)}`);
      }

      console.log(`Successfully authenticated. Verifying subscription for shop: ${shop}`);

      // Query Shopify to verify the subscription status using GraphQL
      // Alternatively, we can use the REST API if GraphQL is not working
      try {
        // First try GraphQL
        const query = `
          query {
            node(id: "gid://shopify/AppSubscription/${chargeId}") {
              ... on AppSubscription {
                id
                status
                createdAt
                currentPeriodEnd
              }
            }
          }
        `;

        const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        const responseData = await response.json();
        console.log('Subscription verification response:', responseData);
        
        const subscriptionStatus = responseData?.data?.node?.status;

        // If GraphQL returns valid data, process it
        if (subscriptionStatus) {
          // If subscription is active, save it to the database
          if (subscriptionStatus === 'ACTIVE') {
            const newSubscription = await createSubscription({
              shopDomain: shop,
              planId: selectedPlanId,
              planName: planConfig.name,
              chargeId: chargeId,
              status: 'active',
              price: planConfig.price,
              currency: 'USD',
              interval: planConfig.interval || 'EVERY_30_DAYS',
              trialDays: planConfig.trialDays,
              features: planConfig.features,
              createdAt: new Date(),
              currentPeriodEnd: responseData?.data?.node?.currentPeriodEnd 
                ? new Date(responseData.data.node.currentPeriodEnd) 
                : null
            });
            
            console.log(`Subscription created for shop ${shop} with plan ${planConfig.name}`, newSubscription);
            
            // Redirect to subscription success page with shop parameter to maintain session
            return redirect(`/subscription/success?shop=${shop}`);
          } else {
            console.warn(`Subscription for shop ${shop} has status: ${subscriptionStatus}`);
            return redirect(`/subscription/error?shop=${shop}`);
          }
        } else {
          // If GraphQL didn't return valid data, fall back to REST API
          throw new Error("Invalid GraphQL response, falling back to REST API");
        }
      } catch (graphqlError:any) {
        console.log("GraphQL query failed, trying REST API:", graphqlError.message);
        
        // Fall back to REST API if GraphQL fails
        const restUrl = `https://${shop}/admin/api/2024-01/recurring_application_charges/${chargeId}.json`;
        const restResponse = await fetch(restUrl, {
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
            'Content-Type': 'application/json',
          },
        });
        
        const restData = await restResponse.json();
        console.log('REST API subscription verification response:', restData);
        
        const restStatus = restData?.recurring_application_charge?.status;
        
        if (restStatus === 'active') {
          const newSubscription = await createSubscription({
            shopDomain: shop,
            planId: selectedPlanId,
            planName: planConfig.name,
            chargeId: chargeId,
            status: 'active',
            price: planConfig.price,
            currency: 'USD',
            interval: planConfig.interval || 'EVERY_30_DAYS',
            trialDays: planConfig.trialDays,
            features: planConfig.features,
            createdAt: new Date(),
            currentPeriodEnd: restData?.recurring_application_charge?.billing_on 
              ? new Date(restData.recurring_application_charge.billing_on) 
              : null
          });
          
          console.log(`Subscription created for shop ${shop} with plan ${planConfig.name} via REST API`, newSubscription);
          
          // Redirect to subscription success page
          return redirect(`/subscription/success?shop=${shop}`);
        } else {
          console.warn(`Subscription for shop ${shop} has REST status: ${restStatus}`);
          return redirect(`/subscription/error?shop=${shop}`);
        }
      }
    } catch (authError) {
      console.error('Authentication error in billing callback:', authError);
      
      // Special handling for OAuth flow - make sure to encode the return URL
      const returnUrl = `/billing/callback?shop=${shop}&plan=${selectedPlanId}&charge_id=${chargeId}`;
      return redirect(`/auth?shop=${shop}&returnUrl=${encodeURIComponent(returnUrl)}`);
    }
  } catch (error) {
    console.error('Unhandled error in billing callback:', error);
    return redirect('/subscription/error');
  }
};

// Helper function to retrieve a session from your database by shop domain
// You need to implement this based on your session storage implementation
async function lookupSessionFromDB(shopDomain: string) {
  // This is just a placeholder. You need to implement this function
  // based on how your app stores Shopify sessions
  try {
    // Example implementation - the actual implementation depends on your session storage
    const sessionData = await db.collection('shopify_sessions')
      .find({ shop: shopDomain })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    
    if (sessionData.length > 0 && sessionData[0].accessToken) {
      return {
        shop: shopDomain,
        accessToken: sessionData[0].accessToken,
        // Include other required session fields
      };
    }
    return null;
  } catch (error) {
    console.error(`Error retrieving session for shop ${shopDomain}:`, error);
    return null;
  }
}