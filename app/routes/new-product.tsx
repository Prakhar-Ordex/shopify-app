import { json } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { authenticate } from "app/shopify.server";

// Import the product creation mutation
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

// Import the add product media mutation
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
  
  // Get form data
  const formData = await request.formData();
  const title = formData.get("title");
  const description = formData.get("description");
  const vendor = formData.get("vendor");
  const productType = formData.get("productType");
  const tags = formData.get("tags");
  const imageUrl = formData.get("imageUrl");
  
  if (!title) {
    return json({ error: "Title is required" }, { status: 400 });
  }
  
  try {
    // Create product on Shopify
    const createResponse = await admin.graphql(CREATE_PRODUCT_MUTATION, {
      variables: {
        input: {
          title,
          descriptionHtml: description,
          vendor,
          productType,
          tags: tags ? tags.split(",").map((tag: string) => tag.trim()) : [],
        },
      },
    });
    const createResult = await createResponse.json();
    const { productCreate } = createResult.data;
    
    if (productCreate.userErrors.length > 0) {
      return json({ error: productCreate.userErrors[0].message }, { status: 400 });
    }
    
    const shopifyProduct = productCreate.product;
    const productId = shopifyProduct.id;
    
    // If image URL is provided, add it to the product
    if (imageUrl) {
      try {
        const imageResponse = await admin.graphql(ADD_PRODUCT_MEDIA_MUTATION, {
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
        
        const imageResult = await imageResponse.json();
        console.log("Image added result:", JSON.stringify(imageResult, null, 2));
        
        if (imageResult.data.productCreateMedia.mediaUserErrors && 
            imageResult.data.productCreateMedia.mediaUserErrors.length > 0) {
          console.error("Error adding image:", imageResult.data.productCreateMedia.mediaUserErrors);
        } else {
          console.log("Image successfully added to product");
        }
      } catch (error) {
        console.error("Failed to add image to product:", error);
      }
    }
    
    return json({ 
      success: true, 
      message: "Product created successfully", 
      productId: productId 
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return json({ error: "Failed to create product" }, { status: 500 });
  }
};

export default function NewProduct() {
  const actionData:any = useActionData();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    vendor: "",
    productType: "",
    tags: "",
    imageUrl: "",
  });
  
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  // Update state when action data changes
  useEffect(() => {
    if (actionData) {
      if (actionData.error) {
        setError(actionData.error);
        setMessage("");
      } else if (actionData.success) {
        setMessage(actionData.message);
        setError("");
        // Optional: Clear form after successful submission
        setFormData({
          title: "",
          description: "",
          vendor: "",
          productType: "",
          tags: "",
          imageUrl: "",
        });
      }
    }
  }, [actionData]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Product</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}
      
      <Form method="post" className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            name="title"
            id="title"
            value={formData.title}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            id="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        
        <div>
          <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">
            Vendor
          </label>
          <input
            type="text"
            name="vendor"
            id="vendor"
            value={formData.vendor}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        
        <div>
          <label htmlFor="productType" className="block text-sm font-medium text-gray-700">
            Product Type
          </label>
          <input
            type="text"
            name="productType"
            id="productType"
            value={formData.productType}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
            Tags (comma separated)
          </label>
          <input
            type="text"
            name="tags"
            id="tags"
            value={formData.tags}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="tag1, tag2, tag3"
          />
        </div>
        
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
            Image URL
          </label>
          <input
            type="url"
            name="imageUrl"
            id="imageUrl"
            value={formData.imageUrl}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="https://example.com/image.jpg"
          />
        </div>
        
        {formData.imageUrl && (
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">
              Preview Image
            </p>
            <img
              src={formData.imageUrl}
              alt="Product preview"
              className="w-40 h-40 object-cover border border-gray-300"
              onError={(e:any) => {
                e.target.onerror = null;
                e.target.src = "https://cdn.example.com/placeholder.jpg";
                e.target.alt = "Failed to load image";
              }}
            />
          </div>
        )}
        
        <div>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Create Product
          </button>
        </div>
      </Form>
    </div>
  );
}