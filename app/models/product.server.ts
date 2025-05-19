// app/models/product.server.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  shop: String,
  shopifyId: String,
  // Add other fields as needed
}, { timestamps: true });

// Check if model already exists to avoid model overwrite errors in development
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// Example query functions
export async function getProducts(shop:any) {
  return await Product.find({ shop }).sort({ createdAt: -1 });
}

export async function getProduct(id:any) {
  return await Product.findById(id);
}

export async function createProduct(data:any) {
  const product = new Product(data);
  return await product.save();
}

export async function updateProduct(id:any, data:any) {
  return await Product.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteProduct(id:any) {
  return await Product.findByIdAndDelete(id);
}