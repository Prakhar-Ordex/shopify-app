// app/routes/create.jsx
import { Link } from "@remix-run/react";
import { useState } from "react";

export default function CreateProductForm() {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  async function createProductClient({ title, name }:any) {
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, name }),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || "Failed to create product");
      }
  
      return result.product;
    } catch (err:any) {
      console.error("API Error:", err.message);
      throw err;
    }
  }

  const handleSubmit = async (e:any) => {
    e.preventDefault();

    try {
      const product = await createProductClient({ title, name });
      setMessage(`✅ Created product: ${product.title}`);
    } catch (err:any) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border p-2 w-full"
            required
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          Create Product
        </button>
      </form>

      {message && <p className="mt-4">{message}</p>}
      <Link 
          to="/app/productsdetail" 
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          show product list 
        </Link>
    </div>
  );
}
