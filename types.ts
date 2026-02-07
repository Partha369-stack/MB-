
export type Product = {
  id: string;
  name: string;
  price: number;
  unit: 'kg' | 'litre';
  category: string;
  description: string;
  imageUrl: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  password?: string;
  address: string;
  role: 'customer' | 'sales' | 'admin' | 'delivery';
  referredBy?: string; // ID of the referring user
  phoneVerified: boolean;
  isActive: boolean;
  profilePic?: string; // Base64 or URL
  assignedDeliveryPersonId?: string; // ID of assigned delivery person for this customer
};


export enum Frequency {
  MONTHLY = 'Every Month',
  BI_WEEKLY = 'Every 15 Days'
}

export type Subscription = {
  id: string;
  userId: string;
  products: { productId: string; quantity: number }[];
  frequency: Frequency;
  deliveryDate: number; // 5, 15, or 25
  status: 'active' | 'paused' | 'cancelled';
  createdAt: string;
};

export type Order = {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  deliveryDate: string;
  status: 'pending' | 'delivered';
  paymentMethod: 'COD';
  createdAt: string;
  deliveryPersonId?: string; // ID of the assigned delivery person
  deliveryOTP?: string; // 4-digit OTP for delivery confirmation
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
};

export type Permission = {
  resource: 'orders' | 'products' | 'users' | 'authority' | 'stats';
  action: 'read' | 'write' | 'delete' | 'all';
};

export type Authority = {
  id: string;
  userId: string;
  userName: string;
  role: 'admin' | 'sales' | 'staff' | 'delivery';
  permissions: Permission[];
  isActive: boolean;
  lastActive?: string;
  referralCode?: string; // New field for Sales personnel
};

// New Activity-Based Sales Tracking System
export type SalesTarget = {
  id: string;
  salesPersonId: string;
  targetVisits: number; // How many people to visit
  targetConversions: number; // How many people to convert to customers
  currentVisits: number;
  currentConversions: number;
  startDate: string;
  endDate: string;
  instructions: string;
  status: 'active' | 'completed' | 'failed';
};

export type SalesActivity = {
  id: string;
  salesPersonId: string;
  personName: string; // Name of the person visited
  personPhone: string; // Phone number
  personAddress: string; // Address
  activityType: 'visit' | 'follow_up'; // Visit or follow-up
  convertedToCustomer: boolean; // Did they become a customer?
  notes: string;
  timestamp: string;
  userId?: string; // If converted, this is their customer ID
};

export type CustomerFollowUp = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  salesPersonId: string;
  lastPurchaseDate: string | null;
  daysSinceLastPurchase: number;
  needsEmergencyFollowUp: boolean; // True if 30+ days without purchase
  lastFollowUpDate: string | null;
  followUpNotes: string;
  status: 'active' | 'inactive';
};



export type CODSettlement = {
  id: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  orderId: string;
  amount: number;
  collectedAt: string; // When the delivery person collected the cash
  settledAt?: string; // When the delivery person returned the cash to admin
  status: 'pending' | 'settled';
  settledBy?: string; // Admin ID who settled
  notes?: string;
};
