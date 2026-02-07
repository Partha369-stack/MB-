
import { storageService } from './storageService';
import { User as AppUser } from '../types';

export const authService = {
    registerOrLogin: async (identifier: string, password?: string, name?: string, address?: string, phoneVerified: boolean = false, referralCode: string = '', profilePic?: string): Promise<AppUser | null> => {
        const users = storageService.getUsers();
        let user = users.find(u => u.phone === identifier);

        if (user) {
            // Existing user - verify password if provided
            if (password && user.password && user.password !== password) {
                throw new Error("Invalid password for this phone number.");
            }

            // Update details if provided
            if (name) user.name = name;
            if (address) user.address = address;
            if (profilePic) user.profilePic = profilePic;
            user.isActive = true;
            if (phoneVerified) user.phoneVerified = phoneVerified;

            storageService.setUser(user);
            return user;
        } else {
            // New user registration
            if (!name || !address || !password) {
                throw new Error("New user detected. Please provide Name, Address, and a Password.");
            }

            // Check referral code
            let referredById: string | undefined = undefined;
            if (referralCode) {
                const authorities = storageService.getAuthorities();
                const salesAuth = authorities.find(a => a.role === 'sales' && a.referralCode === referralCode && a.isActive);
                if (salesAuth) {
                    referredById = salesAuth.userId;
                }
            }

            const newUser: AppUser = {
                id: 'USR-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                name,
                phone: identifier,
                password,
                address,
                role: 'customer',
                isActive: true,
                phoneVerified,
                referredBy: referredById,
                profilePic
            };

            storageService.setUser(newUser);
            return newUser;
        }
    },

    login: async (identifier: string, password?: string): Promise<AppUser | null> => {
        const users = storageService.getUsers();
        const user = users.find(u => u.phone === identifier);

        if (user) {
            if (password && user.password && user.password !== password) {
                throw new Error("Invalid password.");
            }
            storageService.setUser(user);
            return user;
        }
        return null;
    },

    logout: async () => {
        await storageService.clearUser();
    },

    getCurrentUser: (): AppUser | null => {
        return storageService.getUser();
    },

    isAdmin: (): boolean => {
        // For MVP/Disconnected mode, we just allow access
        return true;
    },

    adminLogin: async (identifier: string, password: string): Promise<boolean> => {
        // Disconnected backend: Always succeed for MVP
        console.log('Admin login bypassed');
        return true;
    }
};
