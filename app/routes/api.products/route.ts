import { json } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

// GraphQL mutation to create a product
const CREATE_PRODUCT_MUTATION = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
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

// GraphQL mutation to add media to a product
const ADD_PRODUCT_MEDIA_MUTATION = `
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
      product {
        id
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

export const action = async ({ request }:any) => {
  const { admin, session } = await authenticate.admin(request);
  
  const body = await request.json();
  const { title, name } = body;
  
  if (!title || !name) {
    return json({ error: "Missing title or name" }, { status: 400 });
  }
  
  console.log("title>>>>>>>>>>>>>>>>>>", title);
  
  // First, create the product on Shopify
  const createResponse = await admin.graphql(CREATE_PRODUCT_MUTATION, {
    variables: {
      input: {
        title,
      },
    },
  });
  
  const createResult = await createResponse.json();
  const { productCreate } = createResult.data;
  
  if (productCreate.userErrors.length > 0) {
    return json({ error: productCreate.userErrors }, { status: 400 });
  }
  
  const shopifyProduct = productCreate.product;
  const productId = shopifyProduct.id;
  
  // Define a static image URL - replace with your actual image URL
  const staticImageUrl = "https://images.unsplash.com/photo-1744029829181-ad19c2ee248b?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  
  // Next, add an image to the product using productCreateMedia
  try {
    // The Shopify ID might include a prefix like "gid://shopify/Product/",
    // which we need to use as is (don't strip it if it's there)
    const imageResponse = await admin.graphql(ADD_PRODUCT_MEDIA_MUTATION, {
      variables: {
        productId: productId,
        media: [
          {
            originalSource: staticImageUrl,
            mediaContentType: "IMAGE",
            alt: `Image for ${title}`
          }
        ]
      },
    });
    
    const imageResult = await imageResponse.json();
    console.log("Image added result:", JSON.stringify(imageResult, null, 2));
    
    if (imageResult.data.productCreateMedia.mediaUserErrors && 
        imageResult.data.productCreateMedia.mediaUserErrors.length > 0) {
      console.error("Error adding image:", imageResult.data.productCreateMedia.mediaUserErrors);
    } else {
      console.log("Image successfully added to product");
      if (imageResult.data.productCreateMedia.media && 
          imageResult.data.productCreateMedia.media[0] && 
          imageResult.data.productCreateMedia.media[0].image) {
        shopifyProduct.imageUrl = imageResult.data.productCreateMedia.media[0].image.url;
      }
    }
  } catch (error) {
    console.error("Failed to add image to product:", error);
  }
  
  // Store in MongoDB (commented out as in your original code)
  // await connectDB();
  // const newProduct = new Product({
  //   shop: session.shop,
  //   title,
  //   name,
  //   shopifyProductId: shopifyProduct.id,
  //   imageUrl: shopifyProduct.imageUrl || staticImageUrl,
  // });
  // await newProduct.save();
  
  console.log(
    "shopifyProduct>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", shopifyProduct
  );
  
  return json({ 
    success: true,
    product: shopifyProduct
  });
};