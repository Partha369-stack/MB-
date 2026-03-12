
import { User, Order, Subscription, Authority, SalesTarget, SalesActivity, CODSettlement, CustomerFollowUp, UserAddress, Product } from '../types';
import { insforge } from '../lib/insforge';

const STORAGE_KEYS = {
    SESSION_USER: 'mb_user_session',
};

const logError = (context: string, error: any) => {
    console.error(`[StorageService] Error in ${context}:`, error);
    if (error?.message) console.error(`[StorageService] Message:`, error.message);
    if (error?.details) console.error(`[StorageService] Details:`, error.details);
    if (error?.hint) console.error(`[StorageService] Hint:`, error.hint);
};

const generateOrderId = () => {
    // Generate MB + 6 digit unique numeric code
    const digits = Math.floor(100000 + Math.random() * 900000).toString();
    return `MB${digits}`;
};

const generateSubscriptionOrderId = () => {
    // Generate MBS + 6 digit unique numeric code
    const digits = Math.floor(100000 + Math.random() * 900000).toString();
    return `MBS${digits}`;
};

// Internal status mapping to bypass DB constraints
const toDbStatus = (status: Order['status']): string => {
    // These statuses are now all supported in the DB through the updated constraint
    const safeStatuses = ['pending', 'confirmed', 'assigned', 'out_for_delivery', 'delivered', 'attempted', 'returned', 'cancelled'];
    if (safeStatuses.includes(status)) return status;
    // Map everything else to 'pending' as a safe fallback
    return 'pending';
};

const fromDbStatus = (o: any): Order['status'] => {
    // Virtual status flag logic is no longer needed since we support it natively,
    // but we can still check it for legacy purposes (if someone just updated the status recently)
    if (o.admin_notes === 'STATUS_ATTEMPTED' && o.status === 'pending') {
        return 'attempted';
    }

    // If it's pending in the DB, we infer more specific states for the UI if needed
    // (though out_for_delivery and assigned are now stored directly too)
    if (o.status === 'pending' || o.status === 'out_for_delivery' || o.status === 'assigned') {
        return o.status as Order['status'];
    }

    return (o.status as Order['status']) || 'pending';
};

export const storageService = {
    // Session (Local Cache)
    getUser: (): User | null => {
        const stored = localStorage.getItem(STORAGE_KEYS.SESSION_USER);
        return stored ? JSON.parse(stored) : null;
    },
    setUser: (user: User | null): void => {
        if (user) {
            localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
        }
    },

    // --- PROFILES ---
    getUserProfile: async (userId: string): Promise<User | null> => {
        const { data: profile, error } = await insforge.database
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) return null;

        const addresses = await storageService.getUserAddresses(userId);

        return {
            id: profile.id,
            name: profile.name,
            phone: profile.phone,
            email: profile.email,
            address: profile.address,
            role: profile.role,
            isActive: profile.is_active,
            isAvailable: profile.is_available,
            profilePic: profile.profile_pic,
            profilePicKey: profile.profile_pic_key,
            secondaryPhone: profile.secondary_phone,
            phoneVerified: profile.phone_verified,
            // @ts-ignore
            isSuperAdmin: profile.email === 'admin@motherbest.com' || profile.role === 'admin' && profile.is_super_admin,
            referredBy: profile.referred_by,
            assignedDeliveryPersonId: profile.assigned_delivery_person_id,
            addresses: addresses
        };
    },

    saveUserProfile: async (user: User): Promise<void> => {
        const updates: any = {
            id: user.id,
            updated_at: new Date().toISOString(),
            is_active: user.isActive,
            phone_verified: user.phoneVerified,
            name: user.name,
            phone: user.phone,
            secondary_phone: user.secondaryPhone || null,
            address: user.address,
            profile_pic: user.profilePic,
            profile_pic_key: user.profilePicKey ?? null,
            role: user.role,
            is_available: user.isAvailable,
            email: user.email,
            assigned_delivery_person_id: user.assignedDeliveryPersonId || null
        };

        // Safety check for UUID
        if (user.referredBy && user.referredBy.length === 36) {
            updates.referred_by = user.referredBy;
        }

        const { error } = await insforge.database
            .from('profiles')
            .upsert(updates);

        if (error) {
            logError('saveUserProfile', error);
            throw error;
        }

        const currentUser = storageService.getUser();
        if (currentUser && currentUser.id === user.id) {
            storageService.setUser({ ...currentUser, ...user });
        }
    },

    /**
     * Specialized partial update for delivery person availability
     */
    updateDeliveryAvailability: async (userId: string, isAvailable: boolean): Promise<{ error: any }> => {
        try {
            const { error } = await insforge.database
                .from('profiles')
                .update({
                    is_available: isAvailable,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (!error) {
                // Also update local storage user if it represents the current user
                const currentUser = storageService.getUser();
                if (currentUser && currentUser.id === userId) {
                    storageService.setUser({ ...currentUser, isAvailable });
                }
            }
            return { error };
        } catch (err) {
            return { error: err };
        }
    },

    getUsers: async (): Promise<User[]> => {
        const { data: profiles, error } = await insforge.database.from('profiles').select('*');
        if (error) {
            logError('getUsers', error);
            return [];
        }
        return (profiles || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            email: p.email,
            address: p.address,
            role: p.role,
            isActive: p.is_active,
            isAvailable: p.is_available,
            profilePic: p.profile_pic,
            secondaryPhone: p.secondary_phone,
            phoneVerified: p.phone_verified,
            isSuperAdmin: p.is_super_admin,
            referredBy: p.referred_by,
            assignedDeliveryPersonId: p.assigned_delivery_person_id,
            createdAt: p.created_at,
            addresses: []
        }));

    },

    saveUser: async (user: User): Promise<void> => {
        return storageService.saveUserProfile(user);
    },

    // --- PROFILE PICTURE ---
    /**
     * Upload a new profile picture and automatically delete the old one from storage.
     * Saves both the URL and the storage key to the database.
     */
    uploadProfilePictureWithDelete: async (
        userId: string,
        file: File | Blob,
        oldPicKey?: string | null
    ): Promise<{ url: string; key: string }> => {
        // Step 1: Delete old picture from storage if a key exists
        if (oldPicKey) {
            try {
                // @ts-ignore
                await insforge.storage.from('avatars').remove(oldPicKey);
            } catch (e) {
                console.warn('[ProfilePic] Failed to delete old pic, continuing:', e);
            }
        }

        // Step 2: Upload the new picture
        const mimeType = file.type || 'image/jpeg';
        const extension = mimeType.split('/')[1] || 'jpg';
        const fileName = `${userId}-${Date.now()}.${extension}`;

        // @ts-ignore
        const { data, error } = await insforge.storage
            .from('avatars')
            .upload(fileName, file);

        if (error || !data) {
            console.error('[ProfilePic] Upload failed:', error);
            throw new Error('Profile picture upload failed');
        }

        return { url: data.url, key: data.key };
    },

    uploadProfilePicture: async (userId: string, file: string | File | Blob): Promise<string> => {
        if (!file) return '';

        // If it's already a URL, return it
        if (typeof file === 'string' && file.startsWith('http')) return file;

        let fileToUpload: File | Blob;
        let mimeType = 'image/jpeg';

        if (typeof file === 'string') {
            // Convert Data URL to Blob
            try {
                const response = await fetch(file);
                fileToUpload = await response.blob();
                mimeType = fileToUpload.type;
            } catch (e) {
                console.error("Failed to convert DataURL to Blob:", e);
                return file; // Fallback to returning the string
            }
        } else {
            fileToUpload = file;
            if (file instanceof File) mimeType = file.type;
        }

        const extension = mimeType.split('/')[1] || 'jpg';
        const fileName = `${userId}-${Date.now()}.${extension}`;

        // @ts-ignore
        const { data, error } = await insforge.storage
            .from('avatars')
            .upload(fileName, fileToUpload);

        if (error) {
            console.error("Upload failed:", error);
            return typeof file === 'string' ? file : '';
        }

        // Return the direct URL from the upload response
        return data?.url || '';
    },

    uploadOriginalPicture: async (userId: string, file: File | Blob): Promise<string> => {
        if (!file) return '';

        const mimeType = file.type || 'image/jpeg';
        const extension = mimeType.split('/')[1] || 'jpg';
        const fileName = `${userId}-original-${Date.now()}.${extension}`;

        // @ts-ignore
        const { data, error } = await insforge.storage
            .from('user_original_pics')
            .upload(fileName, file);

        if (error) {
            console.error("Original upload failed:", error);
            return '';
        }

        return data?.url || '';
    },

    // Helper for uploading before we have a userId (for guest/reg flow)
    uploadTemporaryPicture: async (file: File | Blob, prefix: string = 'temp'): Promise<string> => {
        if (!file) return '';
        const mimeType = file.type || 'image/jpeg';
        const extension = mimeType.split('/')[1] || 'jpg';
        const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;

        // Use user_original_pics bucket for temp originals too
        // @ts-ignore
        const { data, error } = await insforge.storage
            .from('user_original_pics')
            .upload(fileName, file);

        if (error) {
            console.error("Temp upload failed:", error);
            return '';
        }

        return data?.url || '';
    },

    // --- AVATAR PRESETS ---
    getAvatarPresets: async (): Promise<{ id: string; url: string; isActive: boolean }[]> => {
        const { data, error } = await insforge.database
            .from('avatar_presets')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            logError('getAvatarPresets', error);
            return [];
        }

        return (data || []).map((p: any) => ({
            id: p.id,
            url: p.url,
            isActive: p.is_active
        }));
    },

    uploadAvatarPreset: async (file: File): Promise<string> => {
        const fileName = `preset-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;

        // @ts-ignore
        const { data, error } = await insforge.storage
            .from('avatar-presets')
            .upload(fileName, file);

        if (error) {
            logError('uploadAvatarPreset (storage)', error);
            throw error;
        }

        const url = data?.url || '';

        const { error: dbError } = await insforge.database
            .from('avatar_presets')
            .insert([{ url, is_active: true }]);

        if (dbError) {
            logError('uploadAvatarPreset (db)', dbError);
            throw new Error(`Database error: ${dbError.message || 'Unknown database error'}`);
        }

        return url;
    },

    deleteAvatarPreset: async (id: string, url: string): Promise<void> => {
        // Extract key from URL if possible, or just delete from DB if key management is complex
        // For simplicity with the current SDK, we'll deactivate it in DB
        const { error } = await insforge.database
            .from('avatar_presets')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            logError('deleteAvatarPreset', error);
            throw error;
        }
    },

    deleteProfilePicture: async (url: string): Promise<void> => {
        // No-op for safety
    },

    uploadProductImage: async (file: File): Promise<string> => {
        if (!file) {
            console.error("No file provided for uploadProductImage");
            return '';
        }

        const cleanName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '') : 'product-image.jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${cleanName}`;

        console.log("Starting product image upload:", fileName);

        // Use insforge storage upload
        // @ts-ignore
        const { data, error } = await insforge.storage
            .from('products')
            .upload(fileName, file);

        if (error) {
            console.error("Product image upload failed:", error);
            // Fallback - return empty or throw based on app needs, throwing error ensures UI shows feedback
            throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
        }

        // Return URL if data exists
        if (data?.url) {
            console.log("Product image uploaded successfully:", data.url);
            return data.url;
        }

        // If for some reason url is not returned but no error, try to construct it or assume success
        // This depends on insforge's specific return shape which we believe includes .url
        return '';
    },

    // --- ADDRESSES ---
    getUserAddresses: async (userId: string): Promise<UserAddress[]> => {
        const { data, error } = await insforge.database
            .from('user_addresses')
            .select('*')
            .eq('user_id', userId)
            .order('is_default', { ascending: false });

        if (error) return [];
        return (data || []).map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            fullName: a.full_name,
            phone: a.phone,
            village: a.village,
            areaOrPara: a.area_or_para,
            houseNo: a.house_no,
            landmark: a.landmark,
            postalCode: a.postal_code,
            latitude: a.latitude,
            longitude: a.longitude,
            isDefault: a.is_default
        }));
    },

    saveUserAddress: async (address: Partial<UserAddress> & { userId: string }): Promise<UserAddress> => {
        if (address.isDefault) {
            await insforge.database
                .from('user_addresses')
                .update({ is_default: false })
                .eq('user_id', address.userId);
        }

        const dbAddress: any = {
            user_id: address.userId,
            updated_at: new Date().toISOString()
        };
        if (address.fullName) dbAddress.full_name = address.fullName;
        if (address.phone) dbAddress.phone = address.phone;
        if (address.village) dbAddress.village = address.village;
        if (address.areaOrPara) dbAddress.area_or_para = address.areaOrPara;
        if (address.houseNo) dbAddress.house_no = address.houseNo;
        if (address.landmark) dbAddress.landmark = address.landmark;
        if (address.postalCode) dbAddress.postal_code = address.postalCode;
        if (address.latitude) dbAddress.latitude = address.latitude;
        if (address.longitude) dbAddress.longitude = address.longitude;
        if (address.isDefault !== undefined) dbAddress.is_default = address.isDefault;

        let result;
        if (address.id) {
            const { data, error } = await insforge.database
                .from('user_addresses')
                .update(dbAddress)
                .eq('id', address.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            // Smart Insert/Update: Check if user already has an address to prevent duplicates
            const { data: existingAddresses } = await insforge.database
                .from('user_addresses')
                .select('id')
                .eq('user_id', address.userId)
                .limit(1);

            if (existingAddresses && existingAddresses.length > 0) {
                // Update existing
                const { data, error } = await insforge.database
                    .from('user_addresses')
                    .update(dbAddress)
                    .eq('id', existingAddresses[0].id)
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            } else {
                // Real Insert
                dbAddress.created_at = new Date().toISOString();
                const { data, error } = await insforge.database
                    .from('user_addresses')
                    .insert([dbAddress])
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            }
        }

        return {
            id: result.id,
            userId: result.user_id,
            fullName: result.full_name,
            phone: result.phone,
            village: result.village,
            areaOrPara: result.area_or_para,
            houseNo: result.house_no,
            landmark: result.landmark,
            postalCode: result.postal_code,
            latitude: result.latitude,
            longitude: result.longitude,
            isDefault: result.is_default
        };
    },

    deleteUserAddress: async (addressId: string): Promise<void> => {
        await insforge.database.from('user_addresses').delete().eq('id', addressId);
    },

    // --- PRODUCTS ---
    getProducts: async (): Promise<Product[]> => {
        const { data, error } = await insforge.database
            .from('products')
            .select('*')
            .order('name');

        if (error) {
            console.error("Error fetching products:", error);
            return [];
        }

        return (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            unit: p.unit,
            categoryId: p.category_id,
            categoryName: p.category_name,
            category: p.category_name || 'Uncategorized',
            description: p.description,
            imageUrl: p.image_url,
            isAvailable: p.is_available,
            stockQuantity: p.stock_quantity,
            updatedAt: p.updated_at
        }));
    },

    saveProduct: async (product: Partial<Product>): Promise<void> => {
        const dbProduct: any = {
            name: product.name,
            price: product.price,
            unit: product.unit,
            category_id: product.categoryId, // Optional: link to categories table if needed
            category_name: product.category, // Storing strict category name
            description: product.description,
            image_url: product.imageUrl,
            is_available: product.isAvailable ?? true,
            stock_quantity: product.stockQuantity ?? 0,
            updated_at: new Date().toISOString()
        };

        if (product.id) {
            const { error } = await insforge.database
                .from('products')
                .update(dbProduct)
                .eq('id', product.id);
            if (error) throw error;
        } else {
            const { error } = await insforge.database
                .from('products')
                .insert([dbProduct]);
            if (error) throw error;
        }
    },

    deleteProduct: async (productId: string): Promise<void> => {
        const { error } = await insforge.database
            .from('products')
            .delete()
            .eq('id', productId);
        if (error) throw error;
    },

    // --- ORDERS ---
    getAllOrders: async (): Promise<Order[]> => {
        console.log('[StorageService] getAllOrders: Fetching from both tables...');
        const [regularRes, subRes] = await Promise.all([
            insforge.database.from('orders').select('*').order('created_at', { ascending: false }),
            insforge.database.from('subscription_orders').select('*').order('created_at', { ascending: false })
        ]);

        const mapOrder = (o: any): Order => ({
            id: o.id,
            userId: o.user_id,
            items: o.items,
            total: o.total,
            deliveryDate: o.delivery_date,
            status: fromDbStatus(o),
            paymentMethod: o.payment_method,
            orderType: o.order_type as Order['orderType'],
            createdAt: o.created_at,
            deliveryPersonId: o.delivery_person_id,
            deliveryOTP: o.delivery_otp,
            subscriptionId: o.subscription_id,
            paymentStatus: o.payment_status,
            returnConfirmed: o.return_confirmed,
            notes: o.admin_notes
        });

        const regularOrders = (regularRes.data || []).map(mapOrder);
        const subOrders = (subRes.data || []).map(mapOrder);

        return [...regularOrders, ...subOrders].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },

    getOrders: async (uid: string): Promise<Order[]> => {
        const [regularRes, subRes] = await Promise.all([
            insforge.database.from('orders').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
            insforge.database.from('subscription_orders').select('*').eq('user_id', uid).order('created_at', { ascending: false })
        ]);

        const mapOrder = (o: any): Order => ({
            id: o.id,
            userId: o.user_id,
            items: o.items,
            total: o.total,
            deliveryDate: o.delivery_date,
            status: fromDbStatus(o),
            paymentMethod: o.payment_method,
            orderType: o.order_type as Order['orderType'],
            createdAt: o.created_at,
            deliveryPersonId: o.delivery_person_id,
            deliveryOTP: o.delivery_otp,
            subscriptionId: o.subscription_id,
            paymentStatus: o.payment_status,
            returnConfirmed: o.return_confirmed,
            notes: o.admin_notes
        });

        const regularOrders = (regularRes.data || []).map(mapOrder);
        const subOrders = (subRes.data || []).map(mapOrder);

        return [...regularOrders, ...subOrders].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },

    saveOrder: async (orderData: Order | Omit<Order, 'id' | 'createdAt' | 'deliveryOTP'>): Promise<Order> => {
        const isSubscription = orderData.subscriptionId || (orderData as any).id?.startsWith('MBS') || orderData.orderType === 'Subscription';
        const table = isSubscription ? 'subscription_orders' : 'orders';

        const dbOrder: any = {
            user_id: orderData.userId,
            items: orderData.items,
            total: orderData.total,
            status: toDbStatus(orderData.status),
            payment_method: orderData.paymentMethod || 'COD',
            order_type: orderData.orderType || (orderData.subscriptionId ? 'Subscription' : 'Regular'),
            delivery_date: orderData.status === 'out_for_delivery'
                ? (orderData.deliveryDate || new Date().toISOString())
                : ((orderData.deliveryDate === 'Scheduled' || !orderData.deliveryDate) ? null : orderData.deliveryDate),
            delivery_person_id: orderData.deliveryPersonId || null,
            delivery_otp: (orderData as any).deliveryOTP || Math.floor(1000 + Math.random() * 9000).toString(),
            admin_notes: (orderData as any).notes || null,
            subscription_id: orderData.subscriptionId || null,
            payment_status: orderData.paymentStatus || 'pending',
            return_confirmed: (orderData as Order).returnConfirmed || false
        };

        if (!(orderData as Order).id) {
            const { data: profile } = await insforge.database
                .from('profiles')
                .select('is_active')
                .eq('id', orderData.userId)
                .single();

            if (profile && profile.is_active === false) {
                throw new Error("Cannot place order: User account is blocked.");
            }

            if (dbOrder.subscription_id || dbOrder.order_type === 'Subscription') {
                dbOrder.id = generateSubscriptionOrderId();
            } else {
                dbOrder.id = generateOrderId();
            }
            dbOrder.created_at = (orderData as any).createdAt || new Date().toISOString();
        } else {
            dbOrder.id = (orderData as Order).id;
        }

        const { data, error } = await insforge.database
            .from(table)
            .upsert(dbOrder)
            .select()
            .single();

        if (error) {
            logError(`saveOrder (${table})`, error);
            throw error;
        }

        return {
            id: data.id,
            userId: data.user_id,
            items: data.items,
            total: data.total,
            status: fromDbStatus(data),
            paymentMethod: data.payment_method,
            orderType: data.order_type as Order['orderType'],
            deliveryDate: data.delivery_date,
            createdAt: data.created_at,
            deliveryPersonId: data.delivery_person_id,
            deliveryOTP: data.delivery_otp,
            subscriptionId: data.subscription_id,
            paymentStatus: data.payment_status,
            returnConfirmed: data.return_confirmed,
            notes: data.admin_notes
        };
    },

    // --- SUBSCRIPTIONS ---
    getAllSubscriptions: async (): Promise<Subscription[]> => {
        const { data, error } = await insforge.database.from('subscriptions').select('*');
        if (error) return [];
        return (data || []).map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            products: s.products,
            frequency: s.frequency,
            deliveryDate: s.delivery_date,
            status: s.status,
            createdAt: s.created_at
        }));
    },

    getSubscriptions: async (uid: string): Promise<Subscription[]> => {
        const { data, error } = await insforge.database.from('subscriptions').select('*').eq('user_id', uid);
        if (error) return [];
        return (data || []).map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            products: s.products,
            frequency: s.frequency,
            deliveryDate: s.delivery_date,
            status: s.status,
            createdAt: s.created_at
        }));
    },

    saveSubscription: async (subData: Subscription | Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription> => {
        // Generate MBS + 6-digit numeric ID (stored directly in the database)
        const generateSubId = () => 'MBS' + String(Math.floor(100000 + Math.random() * 900000));

        const dbSub: any = {
            id: (subData as Subscription).id || generateSubId(),
            user_id: subData.userId,
            products: subData.products,
            frequency: subData.frequency,
            delivery_date: subData.deliveryDate,
            status: subData.status,
            created_at: (subData as Subscription).createdAt || new Date().toISOString()
        };

        const { data, error } = await insforge.database.from('subscriptions').upsert(dbSub).select().single();
        if (error) throw error;

        return {
            id: data.id,
            userId: data.user_id,
            products: data.products,
            frequency: data.frequency,
            deliveryDate: data.delivery_date,
            status: data.status,
            createdAt: data.created_at
        };
    },

    updateSubscription: async (subUpdate: Partial<Subscription> & { id: string }): Promise<void> => {
        const updates: any = {};
        if (subUpdate.status) updates.status = subUpdate.status;
        if (subUpdate.deliveryDate) updates.delivery_date = subUpdate.deliveryDate;
        if (subUpdate.products) updates.products = subUpdate.products;
        if (subUpdate.frequency) updates.frequency = subUpdate.frequency;

        await insforge.database.from('subscriptions').update(updates).eq('id', subUpdate.id);
    },

    deleteSubscription: async (id: string): Promise<void> => {
        await insforge.database.from('subscriptions').delete().eq('id', id);
    },

    // --- AUTHORITIES (ROLES) ---
    getAuthorities: async (): Promise<Authority[]> => {
        const { data, error } = await insforge.database
            .from('authorities')
            .select('*');

        if (error) {
            console.error("Error fetching authorities:", error);
            return [];
        }

        return (data || []).map((a: any) => ({
            id: a.id,
            userId: a.user_id,
            userName: a.user_name,
            role: a.role,
            permissions: a.permissions || [],
            isActive: a.is_active,
            lastActive: a.last_active,
            referralCode: a.referral_code
        }));
    },

    saveAuthority: async (auth: Authority): Promise<void> => {
        try {
            // 1. Update Profile (Primary Role & Basic Info)
            const { error: profileError } = await insforge.database.from('profiles')
                .update({
                    role: auth.role,
                    is_active: auth.isActive,
                    referral_code: auth.referralCode
                })
                .eq('id', auth.userId);

            if (profileError) throw profileError;

            // 2. Clear existing same-role authority record (to prevent duplicates if re-adding)
            await insforge.database.from('authorities')
                .delete()
                .eq('user_id', auth.userId)
                .eq('role', auth.role);

            // 3. Save to Authorities Table
            const { error: authError } = await insforge.database.from('authorities')
                .insert([{
                    user_id: auth.userId,
                    user_name: auth.userName,
                    role: auth.role,
                    permissions: auth.permissions,
                    is_active: auth.isActive,
                    last_active: auth.lastActive,
                    referral_code: auth.referralCode
                }]);

            // @ts-ignore
            if (authError) throw authError;

        } catch (error) {
            console.error("Error saving authority:", error);
            throw error;
        }
    },

    deleteAuthority: async (userId: string, role: string): Promise<void> => {
        try {
            // 1. Delete the specific authority role
            await insforge.database
                .from('authorities')
                .delete()
                .eq('user_id', userId)
                .eq('role', role);

            // 2. Check remaining roles for the user
            const { data: remainingRoles, error: fetchError } = await insforge.database
                .from('authorities')
                .select('role')
                .eq('user_id', userId);

            if (fetchError) throw fetchError;

            // 3. Update Profile Role
            // If they still have roles, set profile role to the first one found (or prioritize admin > sales > delivery)
            // If no roles left, revert to customer
            if (remainingRoles && remainingRoles.length > 0) {
                // Simple priority: admin > sales > delivery
                const roles = remainingRoles.map((r: any) => r.role);
                const primaryRole = roles.includes('admin') ? 'admin' :
                    roles.includes('sales') ? 'sales' :
                        roles.includes('delivery') ? 'delivery' : roles[0];

                await insforge.database.from('profiles')
                    .update({ role: primaryRole })
                    .eq('id', userId);
            } else {
                // No roles left, fully revert to customer
                await insforge.database.from('profiles')
                    .update({
                        role: 'customer',
                        is_active: true,
                        referral_code: null,
                        is_super_admin: false
                    })
                    .eq('id', userId);
            }

        } catch (error) {
            console.error("Error deleting authority:", error);
            throw error;
        }
    },

    deleteUser: async (userId: string): Promise<void> => {
        // Cascade delete should handle related data, but we explicitly delete from profiles
        const { error } = await insforge.database
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) {
            logError('deleteUser', error);
            throw error;
        }
    },

    // --- SALES TARGETS ---
    getSalesTargets: async (salesPersonId?: string): Promise<SalesTarget[]> => {
        let query = insforge.database.from('sales_targets').select('*');
        if (salesPersonId) query = query.eq('sales_person_id', salesPersonId);

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching sales targets:", error);
            return [];
        }
        return (data || []).map((t: any) => ({
            id: t.id,
            salesPersonId: t.sales_person_id,
            targetVisits: t.target_visits,
            targetConversions: t.target_conversions,
            currentVisits: t.current_visits,
            currentConversions: t.current_conversions,
            startDate: t.start_date,
            endDate: t.end_date,
            instructions: t.instructions,
            status: t.status
        }));
    },

    saveSalesTarget: async (target: SalesTarget): Promise<void> => {
        const dbTarget = {
            sales_person_id: target.salesPersonId,
            target_visits: target.targetVisits,
            target_conversions: target.targetConversions,
            current_visits: target.currentVisits,
            current_conversions: target.currentConversions,
            start_date: target.startDate,
            end_date: target.endDate,
            instructions: target.instructions,
            status: target.status
        };

        const isNew = !target.id || target.id.startsWith('TRG-') || target.id.startsWith('new');

        if (!isNew) {
            const { error } = await insforge.database.from('sales_targets').update(dbTarget).eq('id', target.id);
            if (error) {
                logError('saveSalesTarget (update)', error);
                throw error;
            }
        } else {
            const { error } = await insforge.database.from('sales_targets').insert([dbTarget]);
            if (error) {
                logError('saveSalesTarget (insert)', error);
                throw error;
            }
        }
    },

    getSalesActivities: async (salesPersonId?: string): Promise<SalesActivity[]> => {
        let query = insforge.database
            .from('sales_activities')
            .select('*');

        if (salesPersonId) query = query.eq('sales_person_id', salesPersonId);

        // Order by most recent first
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching sales activities:', error);
            return [];
        }

        const activities = data || [];

        // Separately fetch profile pics for converted customers (no FK required)
        const userIds = [...new Set(activities.map((a: any) => a.user_id).filter(Boolean))];
        let profilePicMap: Record<string, string> = {};
        if (userIds.length > 0) {
            const { data: profiles } = await insforge.database
                .from('profiles')
                .select('id, profile_pic')
                .in('id', userIds);
            if (profiles) {
                profiles.forEach((p: any) => {
                    if (p.profile_pic) profilePicMap[p.id] = p.profile_pic;
                });
            }
        }

        return activities.map((a: any) => ({
            id: a.id,
            salesPersonId: a.sales_person_id,
            personName: a.person_name,
            personPhone: a.person_phone,
            personAddress: a.person_address,
            activityType: a.activity_type,
            convertedToCustomer: a.converted_to_customer,
            notes: a.notes,
            timestamp: a.created_at,
            userId: a.user_id,
            customerProfilePic: a.user_id ? profilePicMap[a.user_id] : undefined
        }));
    },

    saveSalesActivity: async (activity: SalesActivity): Promise<void> => {
        const dbActivity = {
            sales_person_id: activity.salesPersonId,
            person_name: activity.personName,
            person_phone: activity.personPhone,
            person_address: activity.personAddress,
            activity_type: activity.activityType,
            converted_to_customer: activity.convertedToCustomer,
            notes: activity.notes,
            user_id: activity.userId
        };
        const { error } = await insforge.database.from('sales_activities').insert([dbActivity]);
        if (error) {
            logError('saveSalesActivity', error);
            throw error;
        }
    },

    getCODSettlements: async (): Promise<CODSettlement[]> => {
        const { data, error } = await insforge.database.from('cod_settlements').select('*');
        if (error) return [];
        return (data || []).map((s: any) => ({
            id: s.id,
            deliveryPersonId: s.delivery_person_id,
            deliveryPersonName: s.delivery_person_name || 'Unknown',
            orderId: s.order_id,
            amount: s.amount,
            collectedAt: s.collected_at,
            settledAt: s.settled_at,
            status: s.status,
            settledBy: s.settled_by,
            notes: s.notes
        }));
    },

    saveCODSettlement: async (settlement: CODSettlement): Promise<void> => {
        const { error } = await insforge.database.from('cod_settlements').insert([{
            delivery_person_id: settlement.deliveryPersonId,
            delivery_person_name: settlement.deliveryPersonName,
            order_id: settlement.orderId,
            amount: settlement.amount,
            collected_at: settlement.collectedAt,
            status: settlement.status,
            notes: settlement.notes
        }]);
        if (error) {
            logError('saveCODSettlement', error);
            throw error;
        }
    },

    updateCODSettlement: async (id: string, settlementUpdate: Partial<CODSettlement>): Promise<void> => {
        const updates: any = {};
        if (settlementUpdate.status) updates.status = settlementUpdate.status;
        if (settlementUpdate.settledAt) updates.settled_at = settlementUpdate.settledAt;
        if (settlementUpdate.settledBy) updates.settled_by = settlementUpdate.settledBy;
        await insforge.database.from('cod_settlements').update(updates).eq('id', id);
    },

    getCustomerFollowUpData: async (salesPersonId: string): Promise<CustomerFollowUp[]> => {
        const { data, error } = await insforge.database
            .from('customer_follow_ups')
            .select(`
                *,
                profiles:profiles!customer_follow_ups_customer_id_fkey (
                    name,
                    phone,
                    address,
                    profile_pic
                )
            `)
            .eq('sales_person_id', salesPersonId);

        if (error) return [];
        return (data || []).map((f: any) => ({
            id: f.id,
            customerId: f.customer_id,
            customerName: f.profiles?.name || 'Unknown',
            customerPhone: f.profiles?.phone || '',
            customerAddress: f.profiles?.address || '',
            customerProfilePic: f.profiles?.profile_pic,
            salesPersonId: f.sales_person_id,
            lastPurchaseDate: f.last_purchase_date,
            daysSinceLastPurchase: f.days_since_last_purchase,
            needsEmergencyFollowUp: f.needs_emergency_follow_up,
            lastFollowUpDate: f.last_follow_up_date,
            followUpNotes: f.follow_up_notes || '',
            status: f.status
        })) as CustomerFollowUp[];
    },

    getDeliveryPersonCODStats: async (deliveryPersonId: string) => {
        const { data: settlements, error } = await insforge.database
            .from('cod_settlements')
            .select('*')
            .eq('delivery_person_id', deliveryPersonId);

        if (error || !settlements) return {
            totalPending: 0,
            totalSettled: 0,
            pendingCount: 0,
            settledCount: 0,
            pendingSettlements: []
        };

        const pending = settlements.filter((s: any) => s.status === 'pending');
        const settled = settlements.filter((s: any) => s.status === 'settled');

        return {
            totalPending: pending.reduce((acc: number, s: any) => acc + s.amount, 0),
            totalSettled: settled.reduce((acc: number, s: any) => acc + s.amount, 0),
            pendingCount: pending.length,
            settledCount: settled.length,
            pendingSettlements: pending.map((s: any) => ({
                id: s.id,
                deliveryPersonId: s.delivery_person_id,
                orderId: s.order_id,
                amount: s.amount,
                collectedAt: s.collected_at,
                status: s.status
            }))
        };
    },

    resetAllMockData: async () => {
        // Disabled in prod
    },

    // --- REALTIME ---
    subscribedChannels: new Set<string>(),

    /**
     * Internal helper to ensure we are connected and subscribed to a channel
     */
    ensureSubscribed: async (channel: string): Promise<void> => {
        try {
            await insforge.realtime.connect();
            if (!storageService.subscribedChannels.has(channel)) {
                const res = await insforge.realtime.subscribe(channel);
                if (res.ok) {
                    storageService.subscribedChannels.add(channel);
                }
            }
        } catch (err) {
            console.warn(`[Realtime] Subscription error for ${channel}:`, err);
        }
    },

    /**
     * Subscribe to a specific table's changes.
     */
    subscribeToRealtimeTable: async (
        channel: string,
        onEvent: (payload: any) => void
    ): Promise<() => void> => {
        try {
            await storageService.ensureSubscribed(channel);
            // By convention, we listen for an event named the same as the channel
            insforge.realtime.on(channel, onEvent);
            console.log(`[Realtime] 📡 Listening on channel: ${channel}`);
            return () => {
                insforge.realtime.off(channel, onEvent);
                // We keep the subscription alive for other listeners or future publishes
            };
        } catch (err) {
            console.warn('[Realtime] Connection failed, falling back to polling.', err);
            return () => { };
        }
    },

    /**
     * Subscribe to a global system sync channel that receives ALL table changes.
     */
    subscribeToSystemSync: async (onUpdate: (payload: any) => void): Promise<() => void> => {
        const channel = 'system_sync';
        try {
            await storageService.ensureSubscribed(channel);
            const handler = (payload: any) => onUpdate(payload);
            insforge.realtime.on('table_change', handler);
            return () => {
                insforge.realtime.off('table_change', handler);
            };
        } catch (err) {
            console.warn('[Realtime] System sync subscription failed:', err);
            return () => { };
        }
    },

    /**
     * Publish a real-time event. Optimized with subscription caching.
     */
    publishRealtimeEvent: async (
        channel: string,
        event: string,
        payload: any
    ): Promise<void> => {
        try {
            await storageService.ensureSubscribed(channel);
            await insforge.realtime.publish(channel, event, payload);
            console.log(`[Realtime] 🚀 Instant Push: ${event} -> ${channel}`);
        } catch (err) {
            console.warn('[Realtime] Publish failed:', err);
        }
    },

    /**
     * Subscribe to real-time status updates for a specific order.
     * Used by customer panels to get instant updates when admin changes order status.
     *
     * @param orderId  - The order ID to subscribe to (e.g. 'MB1234567890')
     * @param onUpdate - Callback fired when the order status changes
     * @returns Unsubscribe function
     */
    subscribeToOrderChannel: async (
        orderId: string,
        onUpdate: (payload: { order_id: string; status: string; updated_at: string; user_id: string }) => void
    ): Promise<() => void> => {
        const channel = `order:${orderId}`;
        try {
            await insforge.realtime.connect();
            const res = await insforge.realtime.subscribe(channel);
            if (!res.ok) {
                console.warn(`[Realtime] Failed to subscribe to order channel '${channel}':`, (res as any).error);
                return () => { };
            }
            // Listen for DB-trigger fired event
            const handler = (payload: any) => onUpdate(payload);
            insforge.realtime.on('orderStatusUpdated', handler);

            console.log(`[Realtime] ✅ Subscribed to ${channel}`);
            return () => {
                insforge.realtime.off('orderStatusUpdated', handler);
                insforge.realtime.unsubscribe(channel);
                console.log(`[Realtime] 🔌 Unsubscribed from ${channel}`);
            };
        } catch (err) {
            console.warn('[Realtime] Order channel subscription failed:', err);
            return () => { };
        }
    },

    /**
     * Publish an instant client-side order status update event.
     * Called after admin saves a new order status so customers get instant push
     * (in addition to the DB trigger, this ensures the event fires client-to-client
     * if the DB trigger has any latency).
     *
     * @param orderId   - The order ID
     * @param status    - The new status value
     * @param userId    - The customer's user ID (for routing)
     */
    publishOrderStatusUpdate: async (
        orderId: string,
        status: string,
        userId: string
    ): Promise<void> => {
        const channel = `order:${orderId}`;
        try {
            await insforge.realtime.connect();
            const res = await insforge.realtime.subscribe(channel);
            if (!res.ok) {
                console.warn(`[Realtime] Could not subscribe to '${channel}' for publish:`, (res as any).error);
                return;
            }
            await insforge.realtime.publish(channel, 'orderStatusUpdated', {
                order_id: orderId,
                status,
                user_id: userId,
                updated_at: new Date().toISOString()
            });
            console.log(`[Realtime] 📡 Published orderStatusUpdated on ${channel} → status: ${status}`);
        } catch (err) {
            console.warn('[Realtime] Order status publish failed (non-critical):', err);
        }
    },

    disconnectRealtime: () => {
        try { insforge.realtime.disconnect(); } catch (_) { }
    },

    // --- APP SETTINGS (Razorpay & general config) ---
    getAppSettings: async (): Promise<{
        razorpayKeyId: string;
        razorpayKeySecret: string;
        razorpayWebhookSecret: string;
    }> => {
        const { data, error } = await insforge.database
            .from('app_settings')
            .select('razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret')
            .eq('id', 'singleton')
            .single();

        if (error || !data) {
            return { razorpayKeyId: '', razorpayKeySecret: '', razorpayWebhookSecret: '' };
        }
        return {
            razorpayKeyId: data.razorpay_key_id || '',
            razorpayKeySecret: data.razorpay_key_secret || '',
            razorpayWebhookSecret: data.razorpay_webhook_secret || '',
        };
    },

    saveAppSettings: async (settings: {
        razorpayKeyId?: string;
        razorpayKeySecret?: string;
        razorpayWebhookSecret?: string;
    }): Promise<void> => {
        const updates: any = {
            id: 'singleton',
            updated_at: new Date().toISOString()
        };
        if (settings.razorpayKeyId !== undefined) updates.razorpay_key_id = settings.razorpayKeyId;
        if (settings.razorpayKeySecret !== undefined) updates.razorpay_key_secret = settings.razorpayKeySecret;
        if (settings.razorpayWebhookSecret !== undefined) updates.razorpay_webhook_secret = settings.razorpayWebhookSecret;

        // Use upsert to ensure it works even if row doesn't exist
        const { error } = await insforge.database
            .from('app_settings')
            .upsert(updates);

        if (error) {
            logError('saveAppSettings', error);
            throw error;
        }
    },

    // Returns just the public Key ID for frontend JS (safe to expose via API response)
    getRazorpayKeyId: async (): Promise<string> => {
        const { data } = await insforge.database
            .from('app_settings')
            .select('razorpay_key_id')
            .eq('id', 'singleton')
            .single();
        return data?.razorpay_key_id || '';
    },

    updateOrder: async (orderId: string, updates: any): Promise<void> => {
        const table = orderId.startsWith('MBS') ? 'subscription_orders' : 'orders';
        const { error } = await insforge.database
            .from(table)
            .update(updates)
            .eq('id', orderId);

        if (error) {
            logError(`updateOrder (${table})`, error);
            throw error;
        }
    },
};
