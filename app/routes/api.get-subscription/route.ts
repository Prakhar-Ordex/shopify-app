import { authenticate } from "../../shopify.server"; // Your existing auth util
import { createSubscription, getPlanById } from "app/models/plans.server";

export async function loader({ request }: { request: Request }) {
    const { admin,session } = await authenticate.admin(request);
    const url = new URL(request.url);
    const chargeId = url.searchParams.get("charge_id");
    const planId = url.searchParams.get("plan");

    if (!session || !session.shop) {
        return new Response(
          JSON.stringify({ error: "Authentication failed" }), 
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!planId) {
        return new Response(
          JSON.stringify({ error: "Plan ID is required" }), 
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      

    const planConfig = await getPlanById(planId as string);

    if (!planConfig) {
        // console.error(`Invalid plan ID: ${planId}`);
        return new Response(
            JSON.stringify({ error: "Invalid plan ID" }), 
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
    }


    if (!chargeId || !session?.accessToken) {
        // return json({ error: "Missing charge ID or session" }, { status: 400 });
        return new Response(
            JSON.stringify({ error: "Missing charge ID or session" }), 
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
    }

    const query = `
    query {
      node(id: "gid://shopify/AppSubscription/${chargeId}") {
        ... on AppSubscription {
          id
          status
          name
          test
          createdAt
          currentPeriodEnd
        }
      }
    }
  `;

    const response = await admin.graphql(query);
    //   const result = await response.json();
    const responseData = await response.json();

   
    console.log('Subscription verification response:', responseData);

    const subscriptionData = responseData?.data?.node;
    const subscriptionStatus = subscriptionData?.status;

    if (!subscriptionData) {
      return new Response(
        JSON.stringify({ error: "Subscription not found" }), 
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process subscription based on status
    if (subscriptionStatus === 'ACTIVE') {
      try {
        const newSubscription = await createSubscription({
          shopDomain: session.shop,
          planId: planId as string,
          planName: planConfig.name,
          chargeId: chargeId,
          status: 'active',
          price: planConfig.price,
          currency: 'USD',
          interval: planConfig.interval || 'EVERY_30_DAYS',
          trialDays: planConfig.trialDays,
          features: planConfig.features,
          createdAt: new Date(),
          currentPeriodEnd: subscriptionData.currentPeriodEnd
            ? new Date(subscriptionData.currentPeriodEnd)
            : null
        });

        console.log(`Subscription created for shop ${session.shop} with plan ${planConfig.name}`, newSubscription);
        
        return new Response(
          JSON.stringify({
            ...subscriptionData,
            plan: {
              id: planConfig.id,
              name: planConfig.name,
              price: planConfig.price,
              interval: planConfig.interval,
              features: planConfig.features
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error('Error creating subscription:', error);
        return new Response(
          JSON.stringify({ error: "Failed to create subscription record" }), 
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ 
          error: "Subscription is not active", 
          status: subscriptionStatus 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
}
