import { json } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

// GraphQL query to fetch a product by ID
const GET_PRODUCT_QUERY = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      description
      vendor
      productType
      tags
      images(first: 1) {
        edges {
          node {
            id
            url
          }
        }
      }
    }
  }
`;

export function parseProductId(wildcard:any) {
  // Handle all possible formats
  if (wildcard.includes("gid:")) {
    // If it's a full GID path with either single or double slash
    if (wildcard.includes("gid://")) {
      // For gid://shopify/Product/123 format
      return wildcard;
    } else if (wildcard.includes("gid:/")) {
      // For gid:/shopify/Product/123 format
      // Convert to double slash format if needed
      return wildcard.replace("gid:/", "gid://");
    }
  } else if (wildcard.match(/\d+$/)) {
    // If it's just a numeric ID or ends with a numeric ID
    const matches = wildcard.match(/(\d+)$/);
    return matches ? `gid://shopify/Product/${matches[0]}` : null;
  }
  
  return null;
}

// API endpoint for getting product details
export const loader = async ({ request, params }:any) => {
  const { admin } = await authenticate.admin(request);
  
  // Get the product ID from the URL
  const url = new URL(request.url);
  const productId = url.searchParams.get("id");
  
  console.log("Received product ID:", productId);
  
  if (!productId) {
    return json({ error: "Product ID is required" }, { status: 400 });
  }
  
  try {
    // Fetch the product details
    const response = await admin.graphql(GET_PRODUCT_QUERY, {
      variables: {
        id: productId,
      },
    });
    
    const result:any = await response.json();
    
    if (result.errors) {
      return json({ error: result.errors[0].message }, { status: 400 });
    }
    
    const product = result.data.product;
    
    return json({
      product,
      imageUrl: product.images.edges[0]?.node.url || "",
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return json({ error: "Failed to fetch product" }, { status: 500 });
  }
};