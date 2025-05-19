import { json } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

// GraphQL mutation to update a product
const UPDATE_PRODUCT_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// GraphQL mutation to update product media (if image URL changes)
const UPDATE_PRODUCT_MEDIA_MUTATION = `
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media {
        ... on MediaImage {
          id
          image {
            url
          }
        }
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

// API endpoint for updating product
export const action = async ({ request }:any) => {
  const { admin } = await authenticate.admin(request);
  
  // Get form data
  const formData = await request.formData();
  
  const productId = formData.get("productId");
  const title = formData.get("title");
  const description = formData.get("description");
  const vendor = formData.get("vendor");
  const productType = formData.get("productType");
  const tags = formData.get("tags");
  const imageUrl = formData.get("imageUrl");
  const currentImageUrl = formData.get("currentImageUrl");
  
  if (!productId) {
    return json({ error: "Product ID is required" }, { status: 400 });
  }
  
  try {
    // Update the product
    const updateResponse:any = await admin.graphql(UPDATE_PRODUCT_MUTATION, {
      variables: {
        input: {
          id: productId,
          title,
          descriptionHtml: description,
          vendor,
          productType,
          tags: tags ? tags?.split(",")?.map((tag: string) => tag.trim()) : [],
        },
      },
    });
    const updateResult:any = await updateResponse.json();
    
    if (updateResult.errors) {
      return json({ error: updateResult.errors[0].message }, { status: 400 });
    }
    
    if (updateResult.data.productUpdate.userErrors.length > 0) {
      return json({ error: updateResult.data.productUpdate.userErrors[0].message }, { status: 400 });
    }
    
    // If image URL has changed, update the product image
    if (imageUrl && imageUrl !== currentImageUrl) {
      const imageResponse = await admin.graphql(UPDATE_PRODUCT_MEDIA_MUTATION, {
        variables: {
          productId: productId,
          media: [
            {
              originalSource: imageUrl,
              mediaContentType: "IMAGE",
              alt: `Image for ${title}`
            }
          ]
        },
      });
      
      const imageResult:any = await imageResponse.json();
      
      if (imageResult.errors) {
        console.error("Error updating image:", imageResult.errors[0].message);
      } else if (imageResult.data.productCreateMedia.mediaUserErrors.length > 0) {
        console.error("Error updating image:", imageResult.data.productCreateMedia.mediaUserErrors[0].message);
      } else {
        console.log("Image successfully updated");
      }
    }
    
    return json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    return json({ error: "Failed to update product" }, { status: 500 });
  }
};