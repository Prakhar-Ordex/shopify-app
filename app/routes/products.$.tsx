import { useState, useEffect } from "react";
import { parseProductId } from "./api.getproduct/route";

export default function EditProduct() {
  const [product, setProduct] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    vendor: "",
    productType: "",
    tags: "",
    imageUrl: "",
    currentImageUrl: "",
    productId: "",
  });
  
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Extract product ID from the URL
  useEffect(() => {
    const pathname = window.location.pathname;
    const segments = pathname.split("/");
    const wildcard = segments[segments.length - 1];
    
    const productId = parseProductId(wildcard);
    
    if (productId) {
      fetchProductDetails(productId);
      setFormData(prev => ({
        ...prev,
        productId
      }));
    } else {
      setError("Invalid product ID");
      setLoading(false);
    }
  }, []);
  
  // Fetch product details from the API
  const fetchProductDetails = async (productId:any) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/getproduct?id=${encodeURIComponent(productId)}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setProduct(data.product);
        setFormData({
          title: data.product.title || "",
          description: data.product.description || "",
          vendor: data.product.vendor || "",
          productType: data.product.productType || "",
          tags: data.product.tags?.join(", ") || "",
          imageUrl: data.imageUrl || "",
          currentImageUrl: data.imageUrl || "",
          productId: productId,
        });
      }
    } catch (err) {
      setError("Failed to fetch product details");
      console.error("Error fetching product:", err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e:any) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e:any) => {
    e.preventDefault();
    
    try {
      setMessage("");
      setError("");
      
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      
      const response = await fetch("/api/productedit", {
        method: "POST",
        body: formDataToSend,
      });
      
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setMessage(result.message);
        // Refresh product data
        fetchProductDetails(formData.productId);
      }
    } catch (err) {
      setError("Failed to update product");
      console.error("Error updating product:", err);
    }
  };
  
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p>Loading product details...</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      
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
      
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <input
            type="hidden"
            name="currentImageUrl"
            value={formData.currentImageUrl}
          />
          <input
            type="hidden"
            name="productId"
            value={formData.productId}
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
            Update Product
          </button>
        </div>
      </form>
    </div>
  );
}