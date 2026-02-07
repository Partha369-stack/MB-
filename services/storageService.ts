
import { Order, Subscription, User as AppUser, Frequency, Authority, SalesTarget, SalesActivity, CODSettlement, CustomerFollowUp } from '../types';

const STORAGE_KEYS = {
  USER: 'mb_user',
  ORDERS: 'mb_orders',
  SUBSCRIPTIONS: 'mb_subscriptions',
  ALL_USERS: 'mb_all_users',
  AUTHORITY: 'mb_authority',
  SALES_TARGETS: 'mb_sales_targets',
  SALES_ACTIVITIES: 'mb_sales_activities',
  COD_SETTLEMENTS: 'mb_cod_settlements'
};

// Helper for localStorage
const getLocal = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocal = <T>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const storageService = {
  getUser: (): AppUser | null => {
    return getLocal<AppUser | null>(STORAGE_KEYS.USER, null);
  },

  setUser: (user: AppUser | null) => {
    setLocal(STORAGE_KEYS.USER, user);
    // Also update in "all users" list if it's a new or existing user
    if (user) {
      const users = storageService.getUsers();
      const exists = users.find(u => u.id === user.id);
      if (!exists) {
        setLocal(STORAGE_KEYS.ALL_USERS, [...users, user]);
      } else {
        setLocal(STORAGE_KEYS.ALL_USERS, users.map(u => u.id === user.id ? user : u));
      }
    }
  },

  saveUser: async (user: AppUser) => {
    // Update in all users list
    const users = storageService.getUsers();
    const updatedUsers = users.map(u => u.id === user.id ? user : u);
    setLocal(STORAGE_KEYS.ALL_USERS, updatedUsers);

    // If this is the current logged-in user, update that too
    const currentUser = storageService.getUser();
    if (currentUser && currentUser.id === user.id) {
      setLocal(STORAGE_KEYS.USER, user);
    }
  },

  getUsers: (): AppUser[] => {
    return getLocal<AppUser[]>(STORAGE_KEYS.ALL_USERS, []);
  },

  getAuthorities: (): Authority[] => {
    const authorities = getLocal<Authority[]>(STORAGE_KEYS.AUTHORITY, []);
    if (authorities.length === 0) {
      // Default initial authority for Super Admin if none exists
      return [{
        id: 'AUTH-1',
        userId: 'SUPER-ADMIN',
        userName: 'Super Admin',
        role: 'admin',
        permissions: [
          { resource: 'orders', action: 'all' },
          { resource: 'products', action: 'all' },
          { resource: 'users', action: 'all' },
          { resource: 'authority', action: 'all' }
        ],
        isActive: true,
        lastActive: new Date().toISOString()
      }];
    }
    return authorities;
  },

  saveAuthority: async (auth: Authority) => {
    const authorities = getLocal<Authority[]>(STORAGE_KEYS.AUTHORITY, []);
    const exists = authorities.find(a => a.id === auth.id);
    let updated;
    if (exists) {
      updated = authorities.map(a => a.id === auth.id ? auth : a);
    } else {
      updated = [...authorities, auth];
    }
    setLocal(STORAGE_KEYS.AUTHORITY, updated);
  },

  clearUser: async () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getOrders: async (userId: string): Promise<Order[]> => {
    const allOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
    return allOrders.filter(o => o.userId === userId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  saveOrder: async (orderData: Order | Omit<Order, 'id' | 'createdAt'>) => {
    const allOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);

    // Check if this is an update (has id) or a new order
    if ('id' in orderData && orderData.id) {
      // Update existing order
      const updatedOrders = allOrders.map(order =>
        order.id === orderData.id ? orderData as Order : order
      );
      setLocal(STORAGE_KEYS.ORDERS, updatedOrders);
    } else {
      // Create new order with OTP
      const deliveryOTP = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit OTP

      // Auto-assign delivery person if customer has one assigned
      let deliveryPersonId = orderData.deliveryPersonId;
      if (!deliveryPersonId && orderData.userId) {
        const allUsers = getLocal<any[]>(STORAGE_KEYS.ALL_USERS, []);
        const customer = allUsers.find(u => u.id === orderData.userId);
        if (customer?.assignedDeliveryPersonId) {
          deliveryPersonId = customer.assignedDeliveryPersonId;
        }
      }

      const newOrder: Order = {
        ...orderData,
        id: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        createdAt: new Date().toISOString(),
        deliveryOTP,
        deliveryPersonId
      };
      setLocal(STORAGE_KEYS.ORDERS, [newOrder, ...allOrders]);
    }
  },

  getSubscriptions: async (userId: string): Promise<Subscription[]> => {
    const allSubs = getLocal<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    return allSubs.filter(s => s.userId === userId);
  },

  saveSubscription: async (subData: Omit<Subscription, 'id' | 'createdAt'>) => {
    const allSubs = getLocal<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);

    // Deactivate existing
    const updatedSubs = allSubs.map(s =>
      (s.userId === subData.userId && s.status === 'active') ? { ...s, status: 'paused' as const } : s
    );

    const newSub: Subscription = {
      ...subData,
      id: 'SUB-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      createdAt: new Date().toISOString()
    };
    setLocal(STORAGE_KEYS.SUBSCRIPTIONS, [newSub, ...updatedSubs]);
  },

  updateSubscription: async (sub: Partial<Subscription> & { id: string }) => {
    const allSubs = getLocal<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    const updated = allSubs.map(s => s.id === sub.id ? { ...s, ...sub } : s);
    setLocal(STORAGE_KEYS.SUBSCRIPTIONS, updated);
  },

  deleteSubscription: async (subId: string) => {
    const allSubs = getLocal<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    setLocal(STORAGE_KEYS.SUBSCRIPTIONS, allSubs.filter(s => s.id !== subId));
  },

  getAllOrders: async (): Promise<Order[]> => {
    return getLocal<Order[]>(STORAGE_KEYS.ORDERS, []).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getAllSubscriptions: async (): Promise<Subscription[]> => {
    return getLocal<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
  },

  resetAllMockData: async (): Promise<void> => {
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTIONS);
    localStorage.removeItem(STORAGE_KEYS.ALL_USERS);
    localStorage.removeItem(STORAGE_KEYS.AUTHORITY);
    localStorage.removeItem(STORAGE_KEYS.SALES_TARGETS);
    localStorage.removeItem(STORAGE_KEYS.SALES_ACTIVITIES);
    // Note: We don't remove STORAGE_KEYS.USER to keep the current session active,
    // but the underlying lists are cleared.
    console.log("Mock data cleared from localStorage (Orders, Users, Subscriptions, Authorities, Sales)");
  },

  // Sales Management Methods
  getSalesTargets: (salesPersonId?: string): SalesTarget[] => {
    const targets = getLocal<SalesTarget[]>(STORAGE_KEYS.SALES_TARGETS, []);
    return salesPersonId ? targets.filter(t => t.salesPersonId === salesPersonId) : targets;
  },

  saveSalesTarget: (target: SalesTarget) => {
    const targets = getLocal<SalesTarget[]>(STORAGE_KEYS.SALES_TARGETS, []);
    const exists = targets.find(t => t.id === target.id);
    const updated = exists ? targets.map(t => t.id === target.id ? target : t) : [...targets, target];
    setLocal(STORAGE_KEYS.SALES_TARGETS, updated);
  },

  getSalesActivities: (salesPersonId?: string): SalesActivity[] => {
    const activities = getLocal<SalesActivity[]>(STORAGE_KEYS.SALES_ACTIVITIES, []);
    return salesPersonId ? activities.filter(a => a.salesPersonId === salesPersonId) : activities;
  },

  saveSalesActivity: (activity: SalesActivity) => {
    const activities = getLocal<SalesActivity[]>(STORAGE_KEYS.SALES_ACTIVITIES, []);
    setLocal(STORAGE_KEYS.SALES_ACTIVITIES, [...activities, activity]);
  },

  // COD Settlement Methods
  getCODSettlements: (deliveryPersonId?: string): CODSettlement[] => {
    const settlements = getLocal<CODSettlement[]>(STORAGE_KEYS.COD_SETTLEMENTS, []);
    return deliveryPersonId
      ? settlements.filter(s => s.deliveryPersonId === deliveryPersonId)
      : settlements;
  },

  saveCODSettlement: (settlement: CODSettlement) => {
    const settlements = getLocal<CODSettlement[]>(STORAGE_KEYS.COD_SETTLEMENTS, []);
    const existing = settlements.find(s => s.id === settlement.id);
    if (existing) {
      setLocal(STORAGE_KEYS.COD_SETTLEMENTS, settlements.map(s => s.id === settlement.id ? settlement : s));
    } else {
      setLocal(STORAGE_KEYS.COD_SETTLEMENTS, [...settlements, settlement]);
    }
  },

  updateCODSettlement: (settlementId: string, updates: Partial<CODSettlement>) => {
    const settlements = getLocal<CODSettlement[]>(STORAGE_KEYS.COD_SETTLEMENTS, []);
    setLocal(STORAGE_KEYS.COD_SETTLEMENTS, settlements.map(s =>
      s.id === settlementId ? { ...s, ...updates } : s
    ));
  },

  getDeliveryPersonCODStats: (deliveryPersonId: string) => {
    const settlements = storageService.getCODSettlements(deliveryPersonId);
    const pending = settlements.filter(s => s.status === 'pending');
    const settled = settlements.filter(s => s.status === 'settled');

    return {
      totalPending: pending.reduce((sum, s) => sum + s.amount, 0),
      totalSettled: settled.reduce((sum, s) => sum + s.amount, 0),
      pendingCount: pending.length,
      settledCount: settled.length,
      pendingSettlements: pending,
      settledSettlements: settled
    };
  },

  // Customer Follow-Up Tracking
  getCustomerFollowUpData: async (salesPersonId: string): Promise<CustomerFollowUp[]> => {
    const allUsers = getLocal<AppUser[]>(STORAGE_KEYS.ALL_USERS, []);
    const allOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);

    // Get customers referred by this salesperson (all users, regardless of role)
    const customers = allUsers.filter(u => u.referredBy === salesPersonId);

    const followUpData: CustomerFollowUp[] = customers.map(customer => {
      // Get all orders for this customer
      const customerOrders = allOrders.filter(o => o.userId === customer.id);

      // Find last purchase date
      let lastPurchaseDate: string | null = null;
      let daysSinceLastPurchase = 0;

      if (customerOrders.length > 0) {
        const sortedOrders = customerOrders.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        lastPurchaseDate = sortedOrders[0].createdAt;

        // Calculate days since last purchase
        const lastPurchase = new Date(lastPurchaseDate);
        const today = new Date();
        daysSinceLastPurchase = Math.floor((today.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Check if needs emergency follow-up (30+ days or never purchased)
      const needsEmergencyFollowUp = customerOrders.length === 0 || daysSinceLastPurchase >= 30;

      return {
        id: `FU-${customer.id}`,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        salesPersonId: salesPersonId,
        lastPurchaseDate,
        daysSinceLastPurchase,
        needsEmergencyFollowUp,
        lastFollowUpDate: null, // Can be extended to track follow-up activities
        followUpNotes: '',
        status: customer.isActive ? 'active' : 'inactive'
      };
    });

    return followUpData;
  }
};
