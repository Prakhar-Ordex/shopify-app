import mongoose from 'mongoose';

// Define Mongoose Schemas
const planSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  interval: { 
    type: String, 
    required: true, 
    enum: ['EVERY_30_DAYS', 'ANNUAL'] 
  },
  trialDays: { type: Number, default: 0 },
  features: [{ type: String }],
  popular: { type: Boolean, default: false }
}, { 
  timestamps: true, 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// If you need a string ID virtual, use a different name
planSchema.virtual('stringId').get(function() {
  return this._id.toString();
});

const subscriptionSchema = new mongoose.Schema({
  shopDomain: { type: String, required: true, index: true },
  planId: { type: String, required: true },
  planName: { type: String, required: true },
  chargeId: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['active', 'cancelled', 'expired', 'frozen'],
    default: 'active'
  },
  price: { type: Number, required: true },
  currency: { type: String, required: true, default: 'USD' },
  interval: { type: String, required: true },
  trialDays: { type: Number, default: 0 },
  features: [{ type: String }],
  currentPeriodEnd: { type: Date, default: null }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// If you need a string ID virtual, use a different name
subscriptionSchema.virtual('stringId').get(function() {
  return this._id.toString();
});

// Create Mongoose models (only if they don't already exist)
export const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema, 'subscriptionPlans');
export const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema, 'subscriptions');

// TypeScript interfaces for type safety
export interface IPlan {
  _id?: string;
  id: string;
  name: string;
  price: number;
  interval: 'EVERY_30_DAYS' | 'ANNUAL';
  trialDays: number;
  features: string[];
  popular?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISubscription {
  _id?: string;
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
  createdAt?: Date;
  updatedAt?: Date;
  currentPeriodEnd: Date | null;
}