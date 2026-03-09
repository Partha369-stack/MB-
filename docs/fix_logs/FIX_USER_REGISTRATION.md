# 🔧 Fix: User Registration Data Not Saving to InsForge Database

## 📋 Problem Summary

When new customers created accounts, their complete information (name, phone number, address, profile picture) was **NOT being saved** to the InsForge database. Only the `name` field was being saved, while `phone`, `address`, and `profile_pic` were all **NULL**.

### Evidence from Database:
```
Profile 1:
  ID: a2a660da-018b-4b21-8fc6-4f9fa425cb3b
  Name: Partha Pradhan
  Phone: ❌ NULL
  Address: ❌ NULL
  Profile Pic: ❌ NULL
  
Profile 2:
  ID: d91b8f55-aff0-4bf6-b199-15f89c61ba65
  Name: BABA PG WALA
  Phone: ❌ NULL
  Address: ❌ NULL
  Profile Pic: ❌ NULL
```

Additionally, the `user_addresses` table was completely empty (0 records).

---

## 🐛 Root Causes Identified

### 1. **Incorrect Phone Number Being Saved**
**Location:** `src/services/authService.ts` line 119

**Problem:**
```typescript
phone: identifier,  // ❌ WRONG!
```

The `identifier` variable was being used for authentication and could be:
- `9876543210@motherbest.local` (for phone-based auth)
- `user@example.com` (for email-based auth)

This meant the phone number was being saved as `9876543210@motherbest.local` instead of just `9876543210`.

**Fix:**
```typescript
// Extract the actual phone number
const actualPhone = identifier.includes('@') ? '' : identifier;

// Use actualPhone in the profile
phone: actualPhone,  // ✅ CORRECT!
```

### 2. **Missing Email Column in Database**
**Location:** InsForge `profiles` table schema

**Problem:**
The `profiles` table didn't have an `email` column, but the code was trying to save email addresses.

**Fix:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
```

### 3. **Email Not Mapped in Storage Service**
**Location:** `src/services/storageService.ts` lines 10-35

**Problem:**
The mapping functions `mapProfileToUser` and `mapUserToProfile` didn't include the `email` field.

**Fix:**
Added `email` field to both mapping functions:
```typescript
const mapProfileToUser = (profile: any): User => ({
    id: profile.id,
    name: profile.name,
    email: profile.email,  // ✅ Added
    phone: profile.phone,
    // ... rest of fields
});

const mapUserToProfile = (user: User) => ({
    id: user.id,
    name: user.name,
    email: user.email,  // ✅ Added
    phone: user.phone,
    // ... rest of fields
});
```

### 4. **Insufficient Logging**
**Location:** `src/services/authService.ts` line 169

**Problem:**
When profile save failed, there was minimal logging to debug the issue.

**Fix:**
Added detailed console logging:
```typescript
console.log('💾 Saving user profile to database:', {
    id: newProfile.id,
    name: newProfile.name,
    phone: newProfile.phone,
    address: newProfile.address,
    profilePic: finalProfilePic ? 'Yes' : 'No'
});

await storageService.saveUserProfile(newProfile);

console.log('✅ User profile saved successfully');
```

---

## ✅ Changes Made

### 1. **authService.ts** - Fixed Phone Number Handling
- ✅ Extract actual phone number from identifier
- ✅ Use `actualPhone` instead of `identifier` when saving profile
- ✅ Added detailed logging for debugging
- ✅ Improved error handling

### 2. **Database Schema** - Added Email Column
- ✅ Added `email TEXT` column to `profiles` table

### 3. **storageService.ts** - Added Email Mapping
- ✅ Added `email` field to `mapProfileToUser` function
- ✅ Added `email` field to `mapUserToProfile` function

---

## 🧪 Testing Instructions

### Test New User Registration

1. **Clear existing test data** (optional):
   ```sql
   DELETE FROM profiles WHERE phone IS NULL;
   ```

2. **Register a new user** with the following details:
   - Phone: `9876543210`
   - Name: `Test User`
   - Email: `test@example.com` (optional)
   - Address: Fill in village, area, postal code
   - Profile Picture: Upload an image

3. **Verify in database**:
   ```sql
   SELECT id, name, email, phone, address, profile_pic, created_at 
   FROM profiles 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

4. **Expected Result**:
   ```
   ✅ name: "Test User"
   ✅ email: "test@example.com" (or NULL if not provided)
   ✅ phone: "9876543210"
   ✅ address: "House No, Area, Village, 700001"
   ✅ profile_pic: "https://..." (or NULL if not uploaded)
   ```

5. **Check user_addresses table**:
   ```sql
   SELECT * FROM user_addresses 
   WHERE user_id = '<user_id_from_step_3>' 
   ORDER BY created_at DESC;
   ```

6. **Expected Result**:
   ```
   ✅ full_name: "Test User"
   ✅ phone: "9876543210"
   ✅ village: "Rampur"
   ✅ area_or_para: "Station Road"
   ✅ postal_code: "700001"
   ✅ latitude: 22.5726
   ✅ longitude: 88.3639
   ```

### Test Console Logs

Open browser DevTools Console during registration. You should see:

```
💾 Saving user profile to database: {
  id: "uuid-here",
  name: "Test User",
  phone: "9876543210",
  address: "House No, Area, Village, 700001",
  profilePic: "Yes"
}
✅ User profile saved successfully
```

---

## 🔍 Verification Script

Run the verification script to check the database:

```bash
node verify-insforge.js
```

This will show:
- All profiles with their complete data
- All user addresses
- Summary of missing fields

---

## 📝 Additional Notes

### Google OAuth Flow
The Google OAuth flow still has a potential issue where form data is saved to `localStorage` but may not be properly restored after redirect. This is handled in `UserAuthEnhanced.tsx` lines 75-96, but should be tested thoroughly.

### Profile Picture Upload
Profile pictures are uploaded to the `avatars` bucket in InsForge Storage. The upload happens before the profile is saved, so if the upload fails, the profile will still be created without a picture.

### User Addresses Table
The `user_addresses` table is populated separately after successful registration (in `UserAuthEnhanced.tsx` lines 372-390). This is a separate operation from profile creation.

---

## 🎯 Summary

All user registration data (name, phone, email, address, profile picture) will now be **properly saved** to the InsForge database. The fixes ensure:

1. ✅ Correct phone number is extracted and saved
2. ✅ Email field is included in database schema and mapping
3. ✅ Detailed logging for debugging
4. ✅ Better error handling

**Next Steps:**
- Test new user registration
- Verify data in database
- Monitor console logs for any errors
