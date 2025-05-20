import { connectToDatabase } from 'app/db.server';
import { MongoClient, ObjectId } from 'mongodb';

// Define TypeScript interfaces for plans and subscriptions
export interface Plan {
  _id?: string | ObjectId;
  id?: string;
  name: string;
  price: number;
  interval: 'EVERY_30_DAYS' | 'ANNUAL';
  trialDays: number;
  features: string[];
  popular?: boolean;
}

export interface Subscription {
  _id?: string | ObjectId;
  id?: string;
  shopDomain: string; 
  planId: string;
  planName: string;
  chargeId: string;
  status: 'active' | 'cancelled' | 'expired' | 'frozen';
  price: number;
  currency: string;
  interval: string;
  trialDays: number;
  features: string[];
  createdAt: Date;
  currentPeriodEnd: Date | null;
}

// Get all available subscription plans
export async function getAllPlans() {
  try {
    const { db }:any = await connectToDatabase();
    const plans = await db.collection('subscriptionPlans').find({}).toArray();
    
    return plans.map((plan: any) => ({
      ...plan,
      id: plan._id.toString()
    }));
  } catch (error) {
    console.error("Error fetching plans:", error);
    throw error;
  }
}

// Get a specific plan by ID
export async function getPlanById(planId: string) {
  try {
    const { db }:any = await connectToDatabase();
    
    let plan;
    // Try to find by ObjectId first (for MongoDB _id)
    try {
      plan = await db.collection('subscriptionPlans').findOne({ _id: new ObjectId(planId) });
    } catch (e) {
      // If not an ObjectId, try as a string id field
      plan = await db.collection('subscriptionPlans').findOne({ id: planId });
    }
    
    if (!plan) return null;
    
    return {
      ...plan,
      id: plan._id.toString()
    };
  } catch (error) {
    console.error(`Error fetching plan ${planId}:`, error);
    throw error;
  }
}

// Get a shop's current subscription
export async function getShopSubscription(shopDomain: string) {
  try {
    const { db }:any = await connectToDatabase();
    
    const subscription = await db.collection('subscriptions')
      .findOne({ 
        shopDomain: shopDomain,
        status: 'active'
      }, {
        sort: { createdAt: -1 }
      });
    
    if (!subscription) return null;
    
    return {
      ...subscription,
      id: subscription._id.toString()
    };
  } catch (error) {
    console.error(`Error fetching subscription for shop ${shopDomain}:`, error);
    throw error;
  }
}

// Create a new subscription record
export async function createSubscription(subscriptionData: Subscription) {
  try {
    const { db }:any = await connectToDatabase();
    
    // First, cancel any existing active subscriptions for this shop
    await db.collection('subscriptions').updateMany(
      {
        shopDomain: subscriptionData.shopDomain,
        status: 'active'
      },
      {
        $set: { status: 'cancelled' }
      }
    );
    
    // Create the subscription record
    const result = await db.collection('subscriptions').insertOne({
      ...subscriptionData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return {
      ...subscriptionData,
      _id: result.insertedId,
      id: result.insertedId.toString()
    };
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw error;
  }
}

// Update a subscription's status
export async function updateSubscriptionStatus(subscriptionId: string, status: 'active' | 'cancelled' | 'expired' | 'frozen') {
  try {
    const { db }:any = await connectToDatabase();
    
    const result = await db.collection('subscriptions').updateOne(
      { _id: new ObjectId(subscriptionId) },
      { 
        $set: { 
          status,
          updatedAt: new Date() 
        } 
      }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error(`Error updating subscription ${subscriptionId}:`, error);
    throw error;
  }
}

// Get all subscriptions for a shop
export async function getShopSubscriptions(shopDomain: string) {
  try {
    const { db }:any = await connectToDatabase();
    
    const subscriptions = await db.collection('subscriptions')
      .find({ shopDomain })
      .sort({ createdAt: -1 })
      .toArray();
    
    return subscriptions.map((subscription: any) => ({
      ...subscription,
      id: subscription._id.toString()
    }));
  } catch (error) {
    console.error(`Error fetching subscriptions for shop ${shopDomain}:`, error);
    throw error;
  }
}

// Initialize default plans if none exist
export async function initializeDefaultPlans() {
  const db = await connectToDatabase();
  const count = await db.collection('subscriptionPlans').countDocuments();
  
  if (count === 0) {
    await db.collection('subscriptionPlans').insertMany([
      {
        id: 'bronze',
        name: 'Bronze Plan',
        price: 5,
        trialDays: 7,
        interval: 'EVERY_30_DAYS',
        features: [
          'Basic features',
          'Email support',
          'Up to 100 products'
        ]
      },
      {
        id: 'silver',
        name: 'Silver Plan',
        price: 15,
        trialDays: 14,
        interval: 'EVERY_30_DAYS',
        popular: true,
        features: [
          'All Bronze features',
          'Priority support',
          'Up to 500 products',
          'Advanced analytics'
        ]
      },
      {
        id: 'gold',
        name: 'Gold Plan',
        price: 29,
        trialDays: 14,
        interval: 'EVERY_30_DAYS',
        features: [
          'All Silver features',
          'Premium support',
          'Unlimited products',
          'Advanced analytics',
          'Custom integrations'
        ]
      }
    ]);
  }
}