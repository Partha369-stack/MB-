# ✅ DUAL PROFILE SAVE - COMPLETE FIX

## 🎯 What You Wanted

You want user profile data to be saved in **BOTH** locations:

1. ✅ **`auth.users.profile`** (JSONB column) - InsForge's auth system
2. ✅ **`public.profiles`** table - Your application's database

---

## 🔧 What I Fixed

### **Problem:**
- Data was only being saved to `auth.users.profile` (InsForge auth)
- The `public.profiles` table was empty
- Your app couldn't query user data from the `profiles` table

### **Solution:**
Now the system saves to **BOTH** locations automatically!

---

## 📝 Changes Made

### 1. **`src/services/authService.ts`**

**During Registration (Email/Password OR Phone):**

```typescript
// ✅ DUAL SAVE: Saves to BOTH locations

// 1️⃣ Save to InsForge's auth.users.profile (JSONB)
await insforge.auth.setProfile({
    name: name,
    phone: actualPhone,
    email: userEmail,
    address: address,
    role: 'customer',
    phone_verified: phoneVerified,
    is_active: true,
    avatar_url: finalProfilePic,
    referred_by: referredByUserId
});
console.log('✅ Saved to auth.users.profile (InsForge auth system)');

// 2️⃣ Save to public.profiles table (for app queries)
await storageService.saveUserProfile(newProfile);
console.log('✅ Saved to public.profiles table');
```

### 2. **`src/components/UserAuthEnhanced.tsx`**

**After Google OAuth Callback:**

```typescript
// When user returns from Google OAuth with pending registration data

// 1️⃣ Save to InsForge's auth.users.profile (JSONB)
await insforge.auth.setProfile({
    phone: data.phone,
    address: fullAddress,
    village: data.village,
    // ... all fields
});
console.log('✅ Profile updated in auth.users.profile (InsForge auth system)');

// 2️⃣ Save to public.profiles table
await storageService.saveUserProfile(updatedUser);
console.log('✅ Profile saved to public.profiles table');

// 3️⃣ Save to user_addresses table
await storageService.saveUserAddress({...});
console.log('✅ Address saved to user_addresses table');
```

---

## 🧪 How to Test

### **Step 1: Register a New User**

**Option A: Email/Password Registration**
1. Fill out the form
2. Uncheck "Register with Google"
3. Enter password
4. Click Register

**Option B: Google OAuth Registration**
1. Fill out the form
2. Keep "Register with Google" checked
3. Click Register
4. Authenticate with Google
5. Return to app

### **Step 2: Check Browser Console**

You should see:
```
💾 Saving user profile to BOTH locations: {...}
✅ Saved to auth.users.profile (InsForge auth system)
✅ Saved to public.profiles table
```

For Google OAuth, you'll also see:
```
📦 Found pending registration data: {...}
✅ User authenticated, updating profile with saved data...
✅ Profile updated in auth.users.profile (InsForge auth system)
✅ Profile saved to public.profiles table
✅ Address saved to user_addresses table
🧹 Cleared pending registration data
```

### **Step 3: Verify in Database**

Run the verification script:
```bash
node verify-dual-save.js
```

**Expected Output:**
```
1️⃣ Checking auth.users.profile (InsForge auth system)...

📊 auth.users.profile:
────────────────────────────────────────────────────────────────────────────────
1. Test User
   Email: test@example.com
   Phone: 9876543210
   Address: Test Area, Test Village, 700001

2️⃣ Checking public.profiles table (App database)...

📊 public.profiles:
────────────────────────────────────────────────────────────────────────────────
1. Test User
   Email: test@example.com
   Phone: 9876543210
   Address: Test Area, Test Village, 700001
   Profile Pic: Yes

🔄 Comparison:
────────────────────────────────────────────────────────────────────────────────
✅ Both tables have the same number of records
   1 users found in each location

✅ Verification complete!
```

### **Step 4: Manual Database Check**

**Check auth.users.profile:**
```sql
SELECT id, email, profile->>'name' as name, profile->>'phone' as phone, profile->>'address' as address
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;
```

**Check public.profiles:**
```sql
SELECT id, name, email, phone, address, profile_pic
FROM profiles 
ORDER BY created_at DESC 
LIMIT 3;
```

**Both queries should return the SAME user data!**

---

## 📊 Data Flow Diagram

```
User Registration
        ↓
┌───────────────────────────────────────┐
│  authService.registerOrLogin()        │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│  1️⃣ insforge.auth.setProfile()        │
│     → Saves to auth.users.profile     │
│       (JSONB column)                  │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│  2️⃣ storageService.saveUserProfile()  │
│     → Saves to public.profiles table  │
└───────────────────────────────────────┘
        ↓
    ✅ BOTH SAVED!
```

---

## 🎉 Result

**Now when a user registers, their data is saved in BOTH locations:**

### **Location 1: `auth.users.profile` (JSONB)**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "profile": {
    "name": "Test User",
    "phone": "9876543210",
    "email": "user@example.com",
    "address": "Full Address",
    "role": "customer",
    "phone_verified": false,
    "is_active": true,
    "avatar_url": "https://...",
    "village": "Village Name",
    "area_or_para": "Area Name",
    "postal_code": "700001",
    "latitude": 22.5726,
    "longitude": 88.3639,
    "referred_by": null
  }
}
```

### **Location 2: `public.profiles` table**
```
id          | user-uuid
name        | Test User
email       | user@example.com
phone       | 9876543210
address     | Full Address
role        | customer
phone_verified | false
is_active   | true
profile_pic | https://...
referred_by | null
created_at  | 2026-02-16 23:30:00
updated_at  | 2026-02-16 23:30:00
```

### **Location 3: `user_addresses` table**
```
user_id     | user-uuid
full_name   | Test User
phone       | 9876543210
village     | Village Name
area_or_para| Area Name
house_no    | 123
postal_code | 700001
latitude    | 22.5726
longitude   | 88.3639
is_default  | true
```

---

## ✅ Summary

**What's Fixed:**
- ✅ Dual profile save (both auth.users.profile AND public.profiles)
- ✅ Works for email/password registration
- ✅ Works for Google OAuth registration
- ✅ Saves to user_addresses table
- ✅ Detailed console logging
- ✅ Proper error handling

**What You Can Do Now:**
- ✅ Query user data from `public.profiles` table
- ✅ Query user data from `auth.users.profile` (JSONB)
- ✅ Both will have the same information
- ✅ Your app can use either source

**Test It:**
1. Register a new user (with Google or email/password)
2. Check browser console for success messages
3. Run `node verify-dual-save.js` to verify both locations
4. Check database manually to confirm

---

## 🔧 Files Modified

1. ✅ `src/services/authService.ts` - Added dual save logic
2. ✅ `src/components/UserAuthEnhanced.tsx` - Updated OAuth callback
3. ✅ `verify-dual-save.js` - New verification script

---

**The fix is complete! Test it now by registering a new user.** 🚀
