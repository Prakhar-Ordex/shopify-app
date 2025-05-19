// // import { LoaderFunctionArgs, redirect } from "@remix-run/node";
// // import { authenticate } from "../../shopify.server";

// // export const loader = async ({ request }: LoaderFunctionArgs) => {
// //   const { session } = await authenticate.admin(request);
// //   console.log("Session in billing callback:", session);
  
// //   // Get the charge_id and signature from the request URL
// //   const url = new URL(request.url);
// //   const chargeId = url.searchParams.get('charge_id');
// //   const signature = url.searchParams.get('signature');
  
// //   if (!chargeId || !signature) {
// //     console.error("Missing charge_id or signature");
// //     return new Response("Missing charge information", {
// //       status: 400,
// //       headers: { "Content-Type": "application/json" },
// //     });
// //   }

// //   // Step 1: Verify the charge with Shopify (optional but recommended)
// //   // Use the charge_id to fetch the charge details from Shopify
// //   const response = await fetch(
// //     `https://${session.shop}/admin/api/2024-01/recurring_application_charges/${chargeId}.json`,
// //     {
// //       method: 'GET',
// //       headers: {
// //         'X-Shopify-Access-Token': session.accessToken!, // use the access token from session
// //       },
// //     }
// //   );

// //   const chargeData = await response.json();

// //   // Step 2: Check if the charge is accepted
// //   if (chargeData.recurring_application_charge.status === 'accepted') {
// //     console.log("Charge accepted, subscription activated!");
// //     // Perform any actions needed to finalize the subscription in your app
// //     // For example, saving the subscription status in your database
// //   } else {
// //     console.error("Charge not accepted:", chargeData);
// //     return new Response("Subscription charge not accepted", {
// //       status: 400,
// //       headers: { "Content-Type": "application/json" },
// //     });
// //   }

// //   // Step 3: Redirect the merchant to the main dashboard or wherever appropriate
// //   return redirect("/"); // Redirect to your desired URL after successful subscription
// // };
// import { LoaderFunctionArgs, redirect } from "@remix-run/node";
// import { authenticate } from "../../shopify.server";
// // import { saveMerchantPlanToDB } from "../../routes/billing.confirm"; // <-- import your MongoDB logic
// // import { dbConnect } from "~/utils/dbConnect"; // if you're using a manual db connection function
// import { saveMerchantPlanToDB } from "../billing.confirm/route";
// import { connectToDatabase } from "app/db.server";

// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   const { session } = await authenticate.admin(request);
//   console.log("Session in billing callback:", session);

//   // Parse URL params
//   const url = new URL(request.url);
//   const chargeId = url.searchParams.get("charge_id");
//   const signature = url.searchParams.get("signature");
//   const selectedPlan = url.searchParams.get("plan"); // plan should be passed when creating the billing

//   if (!chargeId || !signature || !selectedPlan) {
//     console.error("Missing charge_id, signature, or plan");
//     return new Response("Missing charge information", {
//       status: 400,
//       headers: { "Content-Type": "application/json" },
//     });
//   }

//   // Optional: Connect to MongoDB if not already connected
//   await connectToDatabase?.(); // only if you use manual db connection

//   // Step 1: Verify the charge with Shopify
//   const response = await fetch(
//     `https://${session.shop}/admin/api/2024-01/recurring_application_charges/${chargeId}.json`,
//     {
//       method: "GET",
//       headers: {
//         "X-Shopify-Access-Token": session.accessToken!,
//       },
//     }
//   );

//   const chargeData = await response.json();
//   const chargeStatus = chargeData?.recurring_application_charge?.status;

//   if (chargeStatus === "accepted") {
//     console.log("Charge accepted, saving to DB...");

//     // Step 2: Save to MongoDB
//     await saveMerchantPlanToDB({
//       shop: session.shop,
//       plan: selectedPlan,
//       status: "active",
//     });

//     // Step 3: Redirect to dashboard or app home
//     return redirect(`/app?shop=${session.shop}`);
//   } else {
//     console.error("Charge not accepted:", chargeData);
//     return new Response("Subscription charge not accepted", {
//       status: 400,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// };
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin,session } = await authenticate.admin(request);
  const { shop } = session;

  // After successful billing confirmation, redirect back to the app
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/app?shop=${shop}`,
    },
  });
} 