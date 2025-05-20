import { json } from "@remix-run/node";
import { authenticate } from "../../shopify.server"; // Your existing auth util
import { createSubscription, getPlanById } from "app/models/plans.server";

export async function loader({ request }: { request: Request }) {
    const { session } = await authenticate.admin(request);
    const url = new URL(request.url);
    const chargeId = url.searchParams.get("charge_id");
    const planId = url.searchParams.get("plan");

    const planConfig = await getPlanById(planId as string);

    if (!planConfig) {
        console.error(`Invalid plan ID: ${planId}`);
    }


    if (!chargeId || !session?.accessToken) {
        return json({ error: "Missing charge ID or session" }, { status: 400 });
    }

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

    const response = await fetch(`https://${session.shop}/admin/api/2024-01/graphql.json`, {
        method: "POST",
        headers: {
            "X-Shopify-Access-Token": session.accessToken,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
    });

    //   const result = await response.json();
    const responseData = await response.json();
    console.log('Subscription verification response:', responseData);

    const subscriptionStatus = responseData?.data?.node?.status;

    // If GraphQL returns valid data, process it
    if (subscriptionStatus) {
        // If subscription is active, save it to the database
        if (subscriptionStatus === 'ACTIVE') {
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
                currentPeriodEnd: responseData?.data?.node?.currentPeriodEnd
                    ? new Date(responseData.data.node.currentPeriodEnd)
                    : null
            });

            console.log(`Subscription created for shop ${session.shop} with plan ${planConfig.name}`, newSubscription);
            return json(responseData);
        }
    }
}
