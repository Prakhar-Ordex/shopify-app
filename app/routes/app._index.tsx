import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  Text,
  BlockStack,
  Button,
  InlineStack,
} from "@shopify/polaris";


export const loader = async ({ request }:any) => {
  const { admin, session }:any = await authenticate.admin(request);
  
  // You can fetch initial data here
  // For example, counting total products
  try {
    const response = await admin.graphql(
      `query { 
        products(first: 1) { 
          edges { 
            node { id } 
          }
          pageInfo { 
            totalCount
          }
        }
      }`
    );
    
    const totalProducts = (await response.json()).data.products.pageInfo.totalCount;
    
    return json({
      shop: session.shop,
      totalProducts,
      isNewInstall: !session.hasBeenPreviouslyInstalled,
    });
  } catch (error) {
    return json({
      shop: session.shop,
      totalProducts: 0,
      isNewInstall: !session.hasBeenPreviouslyInstalled,
    });
  }
};

export default function Index() {
  const { shop, totalProducts, isNewInstall }:any = useLoaderData();
  
  return (
    <Page>
      <BlockStack gap="500">
        {isNewInstall ? (
          <Card>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Welcome to Your App!
                </Text>
                <Text as="p" variant="bodyMd">
                  This is your app's home page. Merchants will see this after installing your app.
                </Text>
              </BlockStack>
              
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Next steps
                </Text>
                <BlockStack gap="200">
                  <Text as="p">
                    Your Shopify store currently has {totalProducts} products.
                  </Text>
                  <Text as="p">
                    Use this app to manage and create products specifically for your business needs.
                  </Text>
                </BlockStack>
              </BlockStack>
              
              <InlineStack gap="300" align="center">
                <Button
                  variant="primary"
                  url="/app/productsdetail"
                >
                  View Products
                </Button>
                <Button
                  url="/app/products"
                >
                  Create Product
                </Button>  
                <Button
                  url="/app/subscription-plans"
                >
                  Subscriptions
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        ) : (
          <Card>
            <EmptyState
              heading="Manage Your Products"
              action={{
                content: "View Products",
                url: "/app/products",
              }}
              secondaryAction={{
                content: "Create Product",
                url: "/app/new-product",
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Track and manage products created with this app.</p>
            </EmptyState>
          </Card>
        )}
        
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              App Resources
            </Text>
            <BlockStack gap="200">
              <Text as="p">
                Here are some helpful resources to get you started:
              </Text>
              <ul style={{paddingLeft: "1rem"}}>
                <li>
                  <Text as="span" variant="bodyMd">
                    <a href="https://shopify.dev/docs/apps/tools/app-bridge" target="_blank" rel="noopener noreferrer">
                      App Bridge documentation
                    </a>
                  </Text>
                </li>
                <li>
                  <Text as="span" variant="bodyMd">
                    <a href="https://shopify.dev/docs/api/admin-graphql" target="_blank" rel="noopener noreferrer">
                      Shopify Admin API documentation
                    </a>
                  </Text>
                </li>
                <li>
                  <Text as="span" variant="bodyMd">
                    <a href="https://polaris.shopify.com/" target="_blank" rel="noopener noreferrer">
                      Polaris design system
                    </a>
                  </Text>
                </li>
              </ul>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}