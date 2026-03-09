import { User, UserAddress } from '../types';
import { insforge } from '../lib/insforge';
import { storageService } from './storageService';

// Helper to resolve referral code to User ID (UUID)
const resolveReferrerId = async (code: string): Promise<string | null> => {
    if (!code || code.length === 0) return null;
    try {
        // First check if it's already a UUID
        if (code.length === 36 && code.includes('-')) return code;

        // Otherwise look it up in authorities table
        const { data, error } = await insforge.database
            .from('profiles')
            .select('id')
            .eq('referral_code', code.trim().toUpperCase())
            .single();

        if (error || !data) return null;
        return data.id;
    } catch (e) {
        console.error("Referral resolution error:", e);
        return null;
    }
}

// Helper to map DB profile to App User
const mapProfileToUser = async (authId: string, email?: string): Promise<User | null> => {
    try {
        // 1. Get Profile
        const { data: profile, error: profileError } = await insforge.database
            .from('profiles')
            .select('*')
            .eq('id', authId)
            .single();

        if (profileError || !profile) {
            console.error("Profile not found or error:", profileError);
            // Verify if user exists in auth but not profiles (edge case), return basic info
            return {
                id: authId,
                email: email,
                name: '',
                phone: null,
                address: '',
                role: 'customer',
                phoneVerified: false,
                isActive: true,
                addresses: []
            };
        }

        // 2. Get Addresses
        const { data: addresses, error: addressError } = await insforge.database
            .from('user_addresses')
            .select('*')
            .eq('user_id', authId);

        const mappedAddresses: UserAddress[] = (addresses || []).map((addr: any) => ({
            id: addr.id,
            userId: addr.user_id,
            fullName: addr.full_name,
            phone: addr.phone,
            village: addr.village,
            areaOrPara: addr.area_or_para,
            houseNo: addr.house_no,
            landmark: addr.landmark,
            postalCode: addr.postal_code,
            latitude: addr.latitude,
            longitude: addr.longitude,
            isDefault: addr.is_default,
            createdAt: addr.created_at,
            updatedAt: addr.updated_at
        }));

        // 3. Construct User Object
        const currentUser: User = {
            id: profile.id,
            email: profile.email || email,
            name: profile.name || '',
            phone: profile.phone,
            phoneVerified: profile.phone_verified,
            isActive: profile.is_active,
            profilePic: profile.profile_pic,
            originalProfilePicUrl: profile.original_pic,
            role: profile.role as 'customer' | 'admin' | 'sales' | 'delivery' || 'customer',
            referredBy: profile.referred_by,
            assignedDeliveryPersonId: profile.assigned_delivery_person_id,
            address: profile.address || '', // Legacy support
            isAvailable: profile.is_available,
            addresses: mappedAddresses
        };

        return currentUser;
    } catch (err) {
        console.error("Error mapping profile:", err);
        return null;
    }
}

// Helper to centralize referral side effects
const syncReferralEffects = async (userId: string, referrerUuid: string, userName: string, userPhone: string, userAddress: string = '', notes: string = 'Joined via Referral Code') => {
    try {
        // A. Log Activity (Conversion) - Check if ANY conversion activity already exists for this user
        const { data: existingActivity } = await insforge.database
            .from('sales_activities')
            .select('id')
            .eq('converted_user_id', userId)
            // Removed .eq('activity_type', 'visit') to be more robust - if we tracked them as converted, don't count again
            .limit(1);

        if (!existingActivity || existingActivity.length === 0) {
            await insforge.database
                .from('sales_activities')
                .insert([{
                    sales_person_id: referrerUuid,
                    person_name: userName || 'New Customer',
                    person_phone: userPhone || '',
                    person_address: userAddress || '',
                    activity_type: 'onboarding', // Automatic signup, not a physical visit
                    converted_to_customer: true,
                    notes: notes,
                    timestamp: new Date().toISOString(),
                    user_id: userId
                }]);

            // C. Update Sales Targets - REMOVED: Managed by Database Trigger 'on_sales_activity_created'
            // The trigger automatically increments current_conversions when a new activity with converted_to_customer=true is inserted.
        }

        // B. Add to Follow Up List
        const { data: existingFollowUp } = await insforge.database
            .from('customer_follow_ups')
            .select('id')
            .eq('customer_id', userId)
            .single();

        if (!existingFollowUp) {
            await insforge.database
                .from('customer_follow_ups')
                .insert([{
                    customer_id: userId,
                    sales_person_id: referrerUuid,
                    status: 'active',
                    last_purchase_date: new Date().toISOString(),
                    days_since_last_purchase: 0
                }]);
        } else if (existingFollowUp) {
            // Ensure it's active and assigned to referrer
            await insforge.database
                .from('customer_follow_ups')
                .update({
                    sales_person_id: referrerUuid,
                    status: 'active'
                })
                .eq('id', existingFollowUp.id);
        }

    } catch (refError) {
        console.error("Error processing referral side effects:", refError);
    }
};

export const authService = {
    // Check if current user is admin
    isAdmin: async (): Promise<boolean> => {
        const { data: { session } } = await insforge.auth.getCurrentSession();
        if (!session) return false;
        // Optimization: check metadata or fetch profile minimal
        const { data } = await insforge.database.from('profiles').select('role').eq('id', session.user.id).single();
        return data?.role === 'admin';
    },

    // Check if current user is super admin
    isSuperAdmin: async (): Promise<boolean> => {
        const { data: { session } } = await insforge.auth.getCurrentSession();
        if (!session) return false;
        const { data } = await insforge.database.from('profiles').select('role, email').eq('id', session.user.id).single();
        // Allow role-based admin check + specific authorized emails
        const authorizedSuperAdmins = ['admin@motherbest.com', 'pradhanparthasarthi3@gmail.com'];
        return data?.role === 'admin' && authorizedSuperAdmins.includes(data.email || '');
    },

    // Check permissions
    hasPermission: async (permissionName: string): Promise<boolean> => {
        // Simplified for now
        return authService.isAdmin();
    },

    getUserPermissions: async (): Promise<string[]> => {
        const isAdmin = await authService.isAdmin();
        return isAdmin ? ['all'] : [];
    },

    // Initialize Session
    initializeSession: async (): Promise<User | null> => {
        const { data: { session }, error } = await insforge.auth.getCurrentSession();
        if (error || !session) return null;

        // Check for pending Google registration data
        // This runs after a reload from Google Login
        const pendingData = localStorage.getItem('pending_registration_data');
        if (pendingData) {
            try {
                const data = JSON.parse(pendingData);
                // Update profile with pending data
                const updates: any = {};
                if (data.fullName) updates.name = data.fullName;
                if (data.phone) updates.phone = data.phone;
                if (data.profilePic) {
                    updates.profile_pic = await storageService.uploadProfilePicture(session.user.id, data.profilePic);
                }
                if (data.originalProfilePicUrl) {
                    updates.original_pic = data.originalProfilePicUrl;
                }

                // Construct legacy address field if address components exist
                const addressParts = [];
                if (data.houseNo) addressParts.push(data.houseNo);
                if (data.areaOrPara) addressParts.push(data.areaOrPara);
                if (data.village) addressParts.push(data.village);
                if (data.postalCode) addressParts.push(data.postalCode);

                if (addressParts.length > 0) {
                    updates.address = addressParts.join(', ');
                }

                // 1. Ensure Profile Exists / Update (Upsert)
                // We must do this BEFORE inserting user_addresses to satisfy potential foreign keys
                updates.id = session.user.id;
                updates.email = session.user.email;
                updates.updated_at = new Date().toISOString();

                // Check if profile exists to decide on 'created_at' (optional, but good for data integrity)
                const { data: existingProfile } = await insforge.database
                    .from('profiles')
                    .select('id')
                    .eq('id', session.user.id)
                    .single();

                if (!existingProfile) {
                    updates.created_at = new Date().toISOString();
                }

                // Resolve Referral Code
                let referrerUuid: string | null = null;
                if (data.referralCode) {
                    referrerUuid = await resolveReferrerId(data.referralCode);
                    if (referrerUuid) updates.referred_by = referrerUuid;
                }

                const { error: profileError } = await insforge.database
                    .from('profiles')
                    .upsert(updates);

                if (profileError) {
                    console.error("Error upserting profile:", profileError);
                }

                // Handle Referral Side Effects (Sales Tracking)
                if (referrerUuid) {
                    await syncReferralEffects(
                        session.user.id,
                        referrerUuid,
                        data.fullName,
                        data.phone,
                        updates.address || '',
                        'Joined via Referral Code (Google)'
                    );
                }

                // 2. Handle Address Insertion
                if (addressParts.length > 0) {
                    await authService.saveUserAddress({
                        userId: session.user.id,
                        fullName: data.fullName,
                        phone: data.phone,
                        village: data.village || '',
                        areaOrPara: data.areaOrPara || '',
                        houseNo: data.houseNo || '',
                        landmark: data.landmark,
                        postalCode: data.postalCode || '',
                        latitude: data.latitude,
                        longitude: data.longitude,
                        isDefault: true
                    });
                }

                localStorage.removeItem('pending_registration_data');
            } catch (e) {
                console.error("Error processing pending registration:", e);
            }
        } else {
            // Handle Direct Social Login (without pending registration)
            // If profile does not exist, create it from provider metadata
            const { data: existingProfile } = await insforge.database
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .single();

            if (!existingProfile) {
                // @ts-ignore
                const metadata = session.user.user_metadata || {};
                await insforge.database.from('profiles').insert([{
                    id: session.user.id,
                    email: session.user.email,
                    name: metadata.full_name || metadata.name || '',
                    profile_pic: metadata.avatar_url || metadata.picture || null,
                    role: 'customer',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);
            }
        }

        return await mapProfileToUser(session.user.id, session.user.email);
    },

    // Login for Customers (Hybrid)
    registerOrLogin: async (
        identifier: string, // phone or email
        password?: string,
        name?: string,
        address?: string, // Legacy/Simplified string address
        phoneVerified: boolean = false,
        referralCode?: string,
        profilePic?: string | File | null,
        realEmail?: string,
        loginMethod?: string,
        addressData?: Partial<UserAddress>, // Added for detailed address components
        originalPic?: File | null, // Added for original high-res picture
        originalPicUrl?: string // Added for pre-uploaded original picture URL
    ): Promise<User | null> => {

        // Normalize identifier
        const isEmail = identifier.includes('@');
        const emailToUse = isEmail ? identifier.trim().toLowerCase() : (realEmail || `${identifier.trim()}@motherbest.local`);
        const passwordToUse = password || `mb_user_${identifier.trim()}`; // Default password strategy for phone-only

        // 1. Try Login
        const { data: signInData, error: signInError } = await insforge.auth.signInWithPassword({
            email: emailToUse,
            password: passwordToUse
        });

        let userId = signInData?.user?.id;

        // 2. If Login fails, Try Register
        if (signInError || !userId) {
            if (loginMethod === 'LOGIN') {
                console.log("Login failed explicitly:", signInError?.message);
                if (signInError?.message?.toLowerCase().includes("invalid login credentials")) {
                    throw new Error("Invalid email or password. (Note: If you just created this user manually in the DB, please ensure 'Auto Confirm Users' is checked in your Auth settings, otherwise it will block the login!)");
                }
                throw new Error(signInError?.message || "Login failed. Please check your details.");
            }

            console.log("Login failed, attempting registration...", signInError?.message);

            if (!name) {
                throw new Error("New user detected. Please provide your details to join.");
            }

            // Sign Up
            const { data: signUpData, error: signUpError } = await insforge.auth.signUp({
                email: emailToUse,
                password: passwordToUse,
                name: name,
            });

            if (signUpError) {
                console.error("Registration failed:", signUpError);
                throw signUpError;
            }
            userId = signUpData?.user?.id;
        }

        if (!userId) return null;

        // 3. Ensure Profile Exists / Update (Using Upsert for robustness)
        const profileUpdates: any = {
            id: userId,
            email: emailToUse,
            updated_at: new Date().toISOString()
        };

        if (name) profileUpdates.name = name;
        if (!isEmail) profileUpdates.phone = identifier;
        if (address) profileUpdates.address = address;
        if (phoneVerified) profileUpdates.phone_verified = true;

        if (profilePic) {
            profileUpdates.profile_pic = await storageService.uploadProfilePicture(userId, profilePic as any);
        }

        if (originalPic) {
            profileUpdates.original_pic = await storageService.uploadOriginalPicture(userId, originalPic);
        } else if (originalPicUrl) {
            profileUpdates.original_pic = originalPicUrl;
        }

        // Resolve Referral Code
        let referrerUuid: string | null = null;
        if (referralCode) {
            referrerUuid = await resolveReferrerId(referralCode);
            if (referrerUuid) profileUpdates.referred_by = referrerUuid;
        }

        const { error: upsertError } = await insforge.database
            .from('profiles')
            .upsert(profileUpdates);

        if (upsertError) {
            console.error("Profile upsert failed:", upsertError);
        }

        // 3.5 Handle Referral Side Effects (Sales Tracking)
        if (referrerUuid) {
            await syncReferralEffects(
                userId,
                referrerUuid,
                name || 'New Customer',
                identifier,
                address || (addressData ? `${addressData.houseNo ? addressData.houseNo + ', ' : ''}${addressData.areaOrPara || ''}, ${addressData.village || ''}` : '') || '',
                'Joined via Referral Code'
            );
        }

        // 4. Handle Address - Prioritize detailed addressData over address string
        if (addressData || address) {
            await authService.saveUserAddress({
                userId: userId,
                fullName: name || addressData?.fullName || '',
                phone: isEmail ? (addressData?.phone || null) : identifier,
                isDefault: true,
                ...addressData,
                // If only string address provided, fallback to putting it in village/area
                village: addressData?.village || address || '',
                areaOrPara: addressData?.areaOrPara || address || ''
            });
        }

        return await mapProfileToUser(userId, emailToUse);
    },

    // Admin Login
    adminLogin: async (identifier: string, password: string): Promise<boolean> => {
        const { data, error } = await insforge.auth.signInWithPassword({
            email: identifier,
            password: password
        });

        if (error || !data.user) return false;

        // Verify admin role and active status
        const { data: profile } = await insforge.database.from('profiles').select('role, is_active').eq('id', data.user.id).single();
        return profile?.role === 'admin' && profile?.is_active !== false;
    },

    logout: async (): Promise<void> => {
        await insforge.auth.signOut();
        // Force reload or state clear handled by app
    },

    sendOTP: async (phone: string): Promise<boolean> => {
        // InsForge native phone auth not fully configured/exposed in this setup.
        // We will mock this Step OR use a custom edge function later.
        // For now, return true to allow the UI to proceed to 'registerOrLogin'
        console.log(`[MOCK] Sending OTP to ${phone}`);
        return true;
    },

    verifyOTP: async (phone: string, code: string): Promise<boolean> => {
        console.log(`[MOCK] Verifying OTP ${code} for ${phone}`);
        return code === '123456';
    },

    loginWithGoogle: async (): Promise<void> => {
        const { error } = await insforge.auth.signInWithOAuth({
            provider: 'google',
            redirectTo: window.location.origin
        });

        if (error) {
            console.error("Google Login Error:", error);
            throw error;
        }
    },

    loginWithFacebook: async (): Promise<void> => {
        const { error } = await insforge.auth.signInWithOAuth({
            provider: 'facebook',
            redirectTo: window.location.origin
        });

        if (error) {
            console.error("Facebook Login Error:", error);
            throw error;
        }
    },

    // Update User Profile
    updateProfile: async (userId: string, updates: Partial<User> & { originalPic?: File }): Promise<User | null> => {
        const profileUpdates: any = {
            id: userId,
            updated_at: new Date().toISOString()
        };

        if (updates.name) profileUpdates.name = updates.name;
        if (updates.phone) profileUpdates.phone = updates.phone;
        if (updates.address) profileUpdates.address = updates.address;
        if (updates.profilePic) {
            profileUpdates.profile_pic = await storageService.uploadProfilePicture(userId, updates.profilePic);
        }

        if (updates.originalPic) {
            profileUpdates.original_pic = await storageService.uploadOriginalPicture(userId, updates.originalPic);
        } else if (updates.originalProfilePicUrl) {
            profileUpdates.original_pic = updates.originalProfilePicUrl;
        }

        if (updates.email) profileUpdates.email = updates.email;

        // Referral Code / UUID resolution
        let referrerUuid: string | null = null;
        if (updates.referredBy) {
            referrerUuid = await resolveReferrerId(updates.referredBy);
            if (referrerUuid) profileUpdates.referred_by = referrerUuid;
        }

        const { error } = await insforge.database
            .from('profiles')
            .upsert(profileUpdates);

        if (error) {
            console.error("Failed to update profile:", error);
            throw error;
        }

        // Handle Referral Side Effects (Sales Tracking) - If referral code was JUST added/updated
        // We use the helper, but since updateProfile might not have all user details handy in arguments,
        // we use what's available in updates or fallback to generic values. Ideally we fetch profile but this is optimization.
        if (referrerUuid && updates.referredBy) {
            await syncReferralEffects(
                userId,
                referrerUuid,
                updates.name || profileUpdates.name || 'Updated Customer',
                updates.phone || profileUpdates.phone || '',
                updates.address || profileUpdates.address || '',
                'Referral Code Added Later'
            );
        }

        return await mapProfileToUser(userId);
    },

    // Save Address
    saveUserAddress: async (address: Partial<UserAddress> & { userId: string }): Promise<UserAddress | null> => {
        const dbAddress = {
            user_id: address.userId,
            full_name: address.fullName,
            phone: address.phone,
            village: address.village,
            area_or_para: address.areaOrPara,
            house_no: address.houseNo,
            landmark: address.landmark,
            postal_code: address.postalCode,
            latitude: address.latitude,
            longitude: address.longitude,
            is_default: address.isDefault,
            updated_at: new Date().toISOString()
        };

        let result;
        if (address.id) {
            // Update by specific ID
            const { data, error } = await insforge.database
                .from('user_addresses')
                .update(dbAddress)
                .eq('id', address.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            // Smart Insert/Update: Detect by user_id
            // Database now has a UNIQUE constraint on user_id, but we handle it here for clean logic
            const { data: existingAddresses } = await insforge.database
                .from('user_addresses')
                .select('id')
                .eq('user_id', address.userId)
                .limit(1);

            if (existingAddresses && existingAddresses.length > 0) {
                // Update the existing one
                const { data, error } = await insforge.database
                    .from('user_addresses')
                    .update(dbAddress)
                    .eq('id', existingAddresses[0].id)
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            } else {
                // Insert New
                // @ts-ignore
                dbAddress.created_at = new Date().toISOString();
                const { data, error } = await insforge.database
                    .from('user_addresses')
                    .insert([dbAddress])
                    .select()
                    .single();

                // If insert fails due to unique constraint (race condition), fallback to update
                if (error && error.message?.includes('unique_default_user_address')) {
                    const { data: secondTry } = await insforge.database
                        .from('user_addresses')
                        .select('id')
                        .eq('user_id', address.userId)
                        .single();

                    if (secondTry) {
                        const { data: updateRes, error: updateErr } = await insforge.database
                            .from('user_addresses')
                            .update(dbAddress)
                            .eq('id', secondTry.id)
                            .select()
                            .single();
                        if (updateErr) throw updateErr;
                        result = updateRes;
                    } else {
                        throw error;
                    }
                } else if (error) {
                    throw error;
                } else {
                    result = data;
                }
            }
        }

        // Return mapped address
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
            isDefault: result.is_default,
            createdAt: result.created_at,
            updatedAt: result.updated_at
        };
    },

    // Delete Address
    deleteUserAddress: async (addressId: string): Promise<void> => {
        const { error } = await insforge.database
            .from('user_addresses')
            .delete()
            .eq('id', addressId);

        if (error) throw error;
    },

    // Delete User
    deleteUser: async (userId: string): Promise<boolean> => {
        try {
            // 1. Delete user from auth (if using Supabase Auth admin API - but we are client side)
            // Client side cannot delete from auth.users directly usually.
            // We will deactivate the profile and clear sensitive data.

            // Delete address
            const { error: addressError } = await insforge.database
                .from('user_addresses')
                .delete()
                .eq('user_id', userId);

            if (addressError) console.error("Error deleting address", addressError);

            // Delete authorities
            const { error: authError } = await insforge.database
                .from('authorities')
                .delete()
                .eq('user_id', userId);

            if (authError) console.error("Error deleting authorities", authError);

            // Delete orders? Maybe keep for history but anonymize? 
            // For now, let's just Soft Delete the profile by marking inactive and clearing data
            const { error } = await insforge.database
                .from('profiles')
                .update({
                    is_active: false,
                    name: 'Deleted User',
                    phone: null,
                    address: null,
                    profile_pic: null,
                    original_pic: null,
                    email: `deleted_${userId}@motherbest.local`, // Keep unique constraint satisfy
                    referral_code: null
                })
                .eq('id', userId);

            if (error) throw error;

            // Sign out
            await insforge.auth.signOut();
            return true;

        } catch (error) {
            console.error("Delete user error:", error);
            return false;
        }
    },

    // Fetch all sales persons for referral dropdown
    getSalesPersons: async (): Promise<Array<{ id: string, name: string, referralCode: string, profilePic?: string }>> => {
        try {
            const { data, error } = await insforge.database
                .from('profiles')
                .select('id, name, referral_code, profile_pic')
                .eq('role', 'sales')
                .eq('is_active', true);

            if (error) throw error;

            return (data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                referralCode: p.referral_code,
                profilePic: p.profile_pic
            }));
        } catch (e) {
            console.error("Error fetching sales persons:", e);
            return [];
        }
    }
};
