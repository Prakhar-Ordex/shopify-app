// app/routes/app.onboarding.jsx
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { Page, Layout, LegacyCard, ProgressBar, Button } from "@shopify/polaris";

export const loader = async ({ request }:any) => {
  const { admin, session } = await authenticate.admin(request);
  // Load onboarding state from session or database
  
  return json({
    shop: session.shop,
    onboardingStep: 1, // Could be stored in a database
  });
};

export const action = async ({ request }:any) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const step = formData.get("step");
  
  // Handle onboarding step completion
  // Update in database, etc.
  
  // Move to next step or redirect when complete
  if (step === "complete") {
    return redirect("/app/products");
  }
  
  return null;
};

export default function Onboarding() {
  const { shop, onboardingStep }:any = useLoaderData();
  
  return (
    <Page title="Welcome to Your App">
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned>
            <ProgressBar progress={onboardingStep * 25} />
            <div style={{marginTop: "20px"}}>
              <h2>Step</h2>
              {/* Show different content based on step */}
              {/* {renderStepContent(onboardingStep)} */}
              
              <Form method="post">
                <input type="hidden" name="step" value={onboardingStep + 1} />
                <Button  submit>Continue</Button>
              </Form>
            </div>
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}