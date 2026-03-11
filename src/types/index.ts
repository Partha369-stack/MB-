export type Product = {
  id: string;
  name: string;
  price: number;
  unit: 'kg' | 'litre' | 'unit';
  category: string;
  categoryId?: string;
  categoryName?: string;
  description: string;
  imageUrl: string;
  isAvailable?: boolean;
  stockQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type UserAddress = {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  village: string;
  areaOrPara: string;
  houseNo?: string;
  landmark: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type User = {
  id: string;
  name: string;
  phone: string | null;
  secondaryPhone?: string | null;
  email?: string; // Optional email for auth matching
  password?: string;
  address: string; // Keep for legacy/simplified access
  addresses?: UserAddress[];
  role: 'customer' | 'sales' | 'admin' | 'delivery' | 'logistic';
  referredBy?: string; // ID of the referring user
  phoneVerified: boolean;
  isActive: boolean;
  isAvailable?: boolean; // For delivery personnel availability
  profilePic?: string; // Base64 or URL
  profilePicKey?: string; // InsForge storage key for deletion of old photo
  originalProfilePicUrl?: string; // Link to the original high-res photo
  assignedDeliveryPersonId?: string; // ID of assigned delivery person for this customer
  isSuperAdmin?: boolean; // Added for explicit super admin checks
  permissions?: string[]; // Added for role-based access control
  createdAt?: string;
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
  status: 'pending' | 'confirmed' | 'assigned' | 'out_for_delivery' | 'delivered' | 'attempted' | 'returned' | 'cancelled';
  paymentMethod: 'COD' | 'Online';
  createdAt: string;
  deliveryPersonId?: string; // ID of the assigned delivery person
  deliveryOTP?: string; // 4-digit OTP for delivery confirmation
  notes?: string; // Additional notes (e.g., return reason, attempted status flag)
  subscriptionId?: string; // Link to the originating subscription if any
  returnConfirmed?: boolean; // Admin has officially received and acknowledged the return
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
};

export type Permission = {
  resource: 'orders' | 'products' | 'users' | 'authority' | 'stats' | 'logistic';
  action: 'read' | 'write' | 'delete' | 'all';
};

export type Authority = {
  id: string;
  userId: string;
  userName: string;
  role: 'admin' | 'sales' | 'delivery' | 'logistic';
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
  activityType: 'visit' | 'follow_up' | 'onboarding'; // Visit, follow-up, or automatic onboarding
  convertedToCustomer: boolean; // Did they become a customer?
  notes: string;
  timestamp: string;
  userId?: string; // If converted, this is their customer ID
  customerProfilePic?: string; // Profile picture if converted
};

export type CustomerFollowUp = {
  id: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerProfilePic?: string; // Optional profile picture URL
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
