# ✅ COMPLETE FIX: User Profile Data Saving to Both Databases

## 🎯 Final Solution Summary

All user registration data (phone, address, profile picture) is now correctly saved to **BOTH** database locations:
1. ✅ `auth.users.profile` (InsForge's JSONB column)
2. ✅ `public.profiles` table (Your application's database)

---

## 🐛 Issues Fixed

### Issue 1: Duplicate Address Saves ✅
**Problem:** Address was being saved twice to `user_addresses` table
**Cause:** Both `UserAuthEnhanced.tsx` useEffect AND `authService.initializeSession()` were running
**Solution:** Removed duplicate OAuth callback handler from `UserAuthEnhanced.tsx`

### Issue 2: `public.profiles` Not Updated ✅
**Problem:** Phone, address, email, profile_pic were NULL in `public.profiles` table
**Cause:** `saveUserProfile()` function had bugs and wasn't handling errors properly
**Solution:** 
- Fixed `saveUserProfile()` with proper error handling and logging
- Added try-catch blocks
- Added console logging for debugging

### Issue 3: OAuth Callback Timing ✅
**Problem:** OAuth callback ran before session was established
**Cause:** `useEffect` in component ran too early
**Solution:** Moved OAuth callback logic to `authService.initializeSession()`

---

## 📝 Files Modified

### 1. `src/services/authService.ts`
**Updated `initializeSession()` function:**
```typescript
initializeSession: async (): Promise<User | null> => {
    const { data: { session }, error } = await insforge.auth.getCurrentSession();

    if (session?.user) {
        // ✅ Check for pending OAuth registration data
        const pendingData = localStorage.getItem('pending_registration_data');
        if (pendingData) {
            const data = JSON.parse(pendingData);
            
            // 1️⃣ Update auth.users.profile
            await insforge.auth.setProfile({...});
            
            // 2️⃣ Update public.profiles table
            await storageService.saveUserProfile(updatedUser);
            
            // 3️⃣ Save to user_addresses table
            await storageService.saveUserAddress({...});
            
            // Clear pending data
            localStorage.removeItem('pending_registration_data');
        }
        
        // Normal profile fetch if no pending data
        const profile = await storageService.getUserProfile(session.user.id);
        // ...
    }
}
```

### 2. `src/services/storageService.ts`
**Fixed `saveUserProfile()` function:**
```typescript
saveUserProfile: async (user: User): Promise<void> => {
    try {
        const profile = mapUserToProfile(user);
        console.log('💾 Attempting to save profile:', profile);
        
        // Check if profile exists
        const existing = await storageService.getUserProfile(user.id);
        
        if (existing) {
            console.log('📝 Updating existing profile...');
            const { error } = await insforge.database
                .from('profiles')
                .update(profile)
                .eq('id', user.id);
                
            if (error) throw error;
            console.log('✅ Profile updated successfully');
        } else {
            console.log('➕ Inserting new profile...');
            const { error } = await insforge.database
                .from('profiles')
                .insert(profile);
                
            if (error) throw error;
            console.log('✅ Profile inserted successfully');
        }
    } catch (error) {
        console.error('❌ saveUserProfile failed:', error);
        throw error;
    }
}
```

### 3. `src/components/UserAuthEnhanced.tsx`
**Removed duplicate OAuth callback handler:**
```typescript
// OAuth callback is now handled in authService.initializeSession()
// This prevents duplicate saves to user_addresses table
```

### 4. Database
**Synced existing data:**
```sql
-- Synced data from auth.users.profile to public.profiles
UPDATE profiles
SET 
  name = u.profile->>'name',
  email = u.email,
  phone = u.profile->>'phone',
  address = u.profile->>'address',
  profile_pic = u.profile->>'avatar_url',
  updated_at = NOW()
FROM auth.users u
WHERE profiles.id = u.id;

-- Deleted duplicate addresses
DELETE FROM user_addresses WHERE id IN (...);
```

---

## 🧪 Testing Results

### Latest User (Soma - babapgwala@gmail.com):

**✅ auth.users.profile:**
```json
{
  "name": "Soma",
  "phone": "7894561235",
  "address": "5675, Balipanda, Jadavpur, 700032",
  "avatar_url": "https://lh3.googleusercontent.com/..."
}
```

**✅ public.profiles table:**
```
id       | 5d77116e-3772-40a4-9c2b-ca3892d4e6b9
name     | Soma
email    | babapgwala@gmail.com
phone    | 7894561235
address  | 5675, Balipanda, Jadavpur, 700032
profile_pic | https://lh3.googleusercontent.com/...
```

**✅ user_addresses table:**
```
user_id     | 5d77116e-3772-40a4-9c2b-ca3892d4e6b9
full_name   | Soma
phone       | 7894561235
village     | Jadavpur
area_or_para| Balipanda
house_no    | 5675
postal_code | 700032
latitude    | 22.4969
longitude   | 88.3702
```

**✅ No duplicates!**

---

## 📊 Complete Data Flow

### Google OAuth Registration:

```
1. User fills registration form
   ↓
2. Clicks "Register with Google"
   ↓
3. Form data saved to localStorage as 'pending_registration_data'
   ↓
4. Redirect to Google OAuth
   ↓
5. User authenticates with Google
   ↓
6. Google redirects back to app
   ↓
7. App.tsx calls authService.initializeSession()
   ↓
8. initializeSession() detects pending_registration_data
   ↓
9. Updates auth.users.profile (setProfile)
   ✅ Console: "📦 Found pending registration data during session init"
   ↓
10. Updates public.profiles (saveUserProfile)
    ✅ Console: "💾 Attempting to save profile"
    ✅ Console: "📝 Updating existing profile..." OR "➕ Inserting new profile..."
    ✅ Console: "✅ Profile updated/inserted successfully"
   ↓
11. Saves to user_addresses table (saveUserAddress)
    ✅ Console: "✅ Saved to user_addresses table"
   ↓
12. Clears localStorage
    ✅ Console: "🧹 Cleared pending registration data"
   ↓
✅ ALL DATA SAVED IN ALL 3 LOCATIONS - NO DUPLICATES!
```

### Email/Password Registration:

```
1. User fills form, unchecks "Register with Google"
   ↓
2. Enters password
   ↓
3. Clicks "Register"
   ↓
4. authService.registerOrLogin() called
   ↓
5. Creates user with insforge.auth.signUp()
   ↓
6. Saves to auth.users.profile (setProfile)
   ↓
7. Saves to public.profiles (saveUserProfile)
   ↓
8. Saves to user_addresses table
   ↓
✅ ALL DATA SAVED IN ALL 3 LOCATIONS!
```

---

## 🎯 What to Expect Now

### When You Register a New User:

**Browser Console Output:**
```
📦 Found pending registration data during session init: {fullName: "...", phone: "...", ...}
✅ Updated auth.users.profile with OAuth data
💾 Attempting to save profile: {id: "...", name: "...", phone: "...", ...}
➕ Inserting new profile... (or 📝 Updating existing profile...)
✅ Profile inserted successfully (or ✅ Profile updated successfully)
✅ Saved to user_addresses table
🧹 Cleared pending registration data
```

**Database Result:**
- ✅ `auth.users.profile` has all data
- ✅ `public.profiles` has all data (phone, address, email, profile_pic)
- ✅ `user_addresses` has address details
- ✅ **NO DUPLICATES**

---

## ✅ Verification Commands

### Check auth.users.profile:
```sql
SELECT id, email, 
       profile->>'name' as name, 
       profile->>'phone' as phone, 
       profile->>'address' as address,
       profile->>'avatar_url' as avatar_url
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;
```

### Check public.profiles:
```sql
SELECT id, name, email, phone, address, 
       LEFT(profile_pic, 50) as profile_pic_preview 
FROM profiles 
ORDER BY updated_at DESC 
LIMIT 3;
```

### Check user_addresses:
```sql
SELECT user_id, full_name, phone, village, area_or_para, 
       house_no, postal_code, COUNT(*) as count
FROM user_addresses 
GROUP BY user_id, full_name, phone, village, area_or_para, house_no, postal_code
HAVING COUNT(*) > 1;
-- Should return 0 rows (no duplicates)
```

---

## 🎉 Summary

**All Issues Fixed:**
- ✅ User data saves to BOTH `auth.users.profile` AND `public.profiles`
- ✅ Phone, address, email, profile_pic all saved correctly
- ✅ No duplicate addresses in `user_addresses` table
- ✅ Works for Google OAuth registration
- ✅ Works for email/password registration
- ✅ Proper error handling and logging
- ✅ Existing data synced

**Test it now by registering a new user with Google OAuth!** 🚀

All data will be saved correctly to all 3 locations with no duplicates.
