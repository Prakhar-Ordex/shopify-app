import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "app/shopify.server";

// GraphQL query to fetch products
const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
          vendor
          productType
          createdAt
        }
      }
    }
  }
`;

export const loader = async ({ request }:any) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    // Fetch products from Shopify
    const response = await admin.graphql(GET_PRODUCTS_QUERY, {
      variables: {
        first: 50 // Adjust as needed
      },
    });
    
    const result = await response.json();
    
    const products = result.data.products.edges.map(({ node }:any) => ({
      id: node.id,
      title: node.title,
      imageUrl: node.images.edges[0]?.node.url || null,
      vendor: node.vendor,
      productType: node.productType,
      createdAt: new Date(node.createdAt).toLocaleDateString()
    }));
    
    return json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return json({ products: [], error: "Failed to fetch products" }, { status: 500 });
  }
};

export default function ProductsList() {
  const { products, error }:any = useLoaderData();
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link 
          to="/new-product" 
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          Add New Product
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 text-left">Image</th>
              <th className="py-2 px-4 text-left">Title</th>
              <th className="py-2 px-4 text-left">Vendor</th>
              <th className="py-2 px-4 text-left">Type</th>
              <th className="py-2 px-4 text-left">Created</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 px-4 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product:any) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.title}
                        style={{height:"19px",width:"19px"}}
                        className="w-10 h-12 object-cover"
                        onError={(e:any) => {
                          e.target.onerror = null;
                          e.target.src = "https://cdn.example.com/placeholder.jpg";
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-500">No image</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-4">{product.title}</td>
                  <td className="py-2 px-4">{product.vendor || "-"}</td>
                  <td className="py-2 px-4">{product.productType || "-"}</td>
                  <td className="py-2 px-4">{product.createdAt}</td>
                  <td className="py-2 px-4">
                    <Link
                      to={`/products/${product.id}`}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}