import mongoose from 'mongoose';

let db: mongoose.Connection;

async function connectToDatabase() {
  const mongoUrlString = process.env.MONGODB_URI || "mongodb://localhost:27017/shopify-app";
  
  try {
    if (mongoose.connection.readyState === 0) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(mongoUrlString);
      db = mongoose.connection;
      
      db.on('error', (error) => {
        console.error('MongoDB connection error:', error);
      });
      
      db.once('open', () => {
        console.log('Successfully connected to MongoDB database');
      });
    }
    
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Initialize connection on server start
connectToDatabase().catch(err => {
  console.error('Could not connect to MongoDB:', err);
});

// Test the connection
async function testConnection() {
  try {
    const connection = await connectToDatabase();
    if (!connection.db) throw new Error("MongoDB connection has no db property");
    const collections = await connection.db.collections();
    console.log('Available collections:', collections.map(c => c.collectionName));
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

// Run connection test
testConnection();

export { db, connectToDatabase };