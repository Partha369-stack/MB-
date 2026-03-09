# Enhanced User Registration - Implementation Plan

## User Requirements Summary

### Data to Collect:

1. **Identity (from Google Auth or Manual)**:
   - Email
   - Full Name
   - Profile Picture

2. **Contact Information**:
   - Phone Number (10 digits)

3. **Complete Address**:
   - Village
   - Area or Para
   - House No
   - Postal Code
   - Latitude (auto-detected)
   - Longitude (auto-detected)

4. **Optional**:
   - Referral Code

### Authentication Flow:

```
┌─────────────────────────────────────────┐
│  User Chooses Authentication Method     │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
   ┌───▼────┐      ┌────▼────┐
   │ Google │      │  Email/ │
   │  Auth  │      │  Phone  │
   │   ☑️   │      │  Auth   │
   └───┬────┘      └────┬────┘
       │                │
       └───────┬────────┘
               │
    ┌──────────▼──────────┐
    │  Auto-fill from     │
    │  Google (if used):  │
    │  • Name             │
    │  • Email            │
    │  • Profile Pic      │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  User Fills:        │
    │  • Phone Number     │
    │  • Address Details  │
    │  • Referral Code    │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  📍 Find My Location│
    │  Button (Optional)  │
    └──────────┬──────────┘
               │
       ┌───────┴────────┐
       │ YES            │ NO
   ┌───▼────┐      ┌────▼────┐
   │ Auto   │      │ Manual  │
   │ Detect │      │  Entry  │
   │ GPS    │      │         │
   └───┬────┘      └────┬────┘
       │                │
       │  ┌─────────────▼──────────────┐
       │  │  Reverse Geocoding:        │
       └─▶│  • Get Village from GPS    │
          │  • Get Area from GPS       │
          │  • Get Postal Code         │
          │  • Save Lat/Long           │
          └─────────────┬──────────────┘
                        │
             ┌──────────▼──────────┐
             │  User Reviews &     │
             │  Edits if Needed    │
             └──────────┬──────────┘
                        │
             ┌──────────▼──────────┐
             │  Submit Registration│
             └──────────┬──────────┘
                        │
             ┌──────────▼──────────┐
             │  Account Created    │
             │  with Complete Data │
             └─────────────────────┘
```

## Implementation Steps

### Step 1: Update UserAuth Component

Add new state variables for address fields:
```typescript
const [village, setVillage] = useState('');
const [areaOrPara, setAreaOrPara] = useState('');
const [houseNo, setHouseNo] = useState('');
const [postalCode, setPostalCode] = useState('');
const [latitude, setLatitude] = useState<number | undefined>();
const [longitude, setLongitude] = useState<number | undefined>();
const [useGoogleAuth, setUseGoogleAuth] = useState(false);
const [isDetectingLocation, setIsDetectingLocation] = useState(false);
```

### Step 2: Add Location Detection Function

```typescript
const handleFindMyLocation = async () => {
  setIsDetectingLocation(true);
  setError(null);
  
  try {
    // Get GPS coordinates
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
    
    const { latitude, longitude } = position.coords;
    setLatitude(latitude);
    setLongitude(longitude);
    
    // Reverse geocoding using locationService
    const addressData = await locationService.reverseGeocode(latitude, longitude);
    
    if (addressData) {
      setVillage(addressData.village || '');
      setAreaOrPara(addressData.area || '');
      setPostalCode(addressData.postalCode || '');
    }
    
  } catch (error: any) {
    console.error('Location detection error:', error);
    if (error.code === 1) {
      setError('Location permission denied. Please enable location access.');
    } else if (error.code === 2) {
      setError('Location unavailable. Please enter address manually.');
    } else if (error.code === 3) {
      setError('Location request timeout. Please try again.');
    } else {
      setError('Failed to detect location. Please enter address manually.');
    }
  } finally {
    setIsDetectingLocation(false);
  }
};
```

### Step 3: Update Form UI

Add address section in registration form:
```tsx
{/* Address Section - Only for REGISTER */}
{authMode === 'REGISTER' && (
  <>
    <div className="border-t border-slate-100 pt-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
          📍 Delivery Address
        </h3>
        <button
          type="button"
          onClick={handleFindMyLocation}
          disabled={isDetectingLocation}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition-all disabled:opacity-50"
        >
          {isDetectingLocation ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              Find My Location
            </>
          )}
        </button>
      </div>
      
      {/* Village */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          Village *
        </label>
        <div className="relative group">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
          <input
            type="text"
            className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200"
            placeholder="E.g. Rampur"
            value={village}
            onChange={(e) => setVillage(e.target.value)}
          />
        </div>
      </div>
      
      {/* Area or Para */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          Area / Para *
        </label>
        <div className="relative group">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
          <input
            type="text"
            className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200"
            placeholder="E.g. Station Road"
            value={areaOrPara}
            onChange={(e) => setAreaOrPara(e.target.value)}
          />
        </div>
      </div>
      
      {/* House No */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          House No (Optional)
        </label>
        <div className="relative group">
          <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
          <input
            type="text"
            className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200"
            placeholder="E.g. 123/A"
            value={houseNo}
            onChange={(e) => setHouseNo(e.target.value)}
          />
        </div>
      </div>
      
      {/* Postal Code */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          Postal Code *
        </label>
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-green-600 transition-colors" />
          <input
            type="text"
            className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:border-green-600 focus:bg-white focus:shadow-lg focus:shadow-green-900/5 outline-none text-sm font-bold transition-all placeholder:text-slate-200"
            placeholder="E.g. 700001"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
        </div>
      </div>
      
      {/* Location Coordinates (Hidden, auto-filled) */}
      {latitude && longitude && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-700 font-medium">
          <p className="font-black mb-1">✓ Location Detected</p>
          <p className="text-[10px]">
            Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  </>
)}
```

### Step 4: Add Google Auth Checkbox

```tsx
{/* Google Auth Option - Only for REGISTER */}
{authMode === 'REGISTER' && !existingUser && (
  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
    <input
      type="checkbox"
      id="useGoogleAuth"
      checked={useGoogleAuth}
      onChange={(e) => setUseGoogleAuth(e.target.checked)}
      className="w-5 h-5 rounded border-2 border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
    />
    <label htmlFor="useGoogleAuth" className="text-xs font-bold text-blue-700 cursor-pointer">
      Use Google Authentication (Auto-fill name, email, and photo)
    </label>
  </div>
)}
```

### Step 5: Update Validation

```typescript
const validateForm = (): string | null => {
  // ... existing validations ...
  
  // Address validations for registration
  if (authMode === 'REGISTER') {
    if (!village.trim()) {
      return "Village is required";
    }
    if (!areaOrPara.trim()) {
      return "Area/Para is required";
    }
    if (!postalCode.trim()) {
      return "Postal code is required";
    }
    if (postalCode.length !== 6) {
      return "Postal code must be 6 digits";
    }
  }
  
  return null;
};
```

### Step 6: Update Submit Handler

```typescript
const handleSubmit = async () => {
  // ... existing validation ...
  
  // If Google Auth is selected, trigger Google login first
  if (useGoogleAuth && authMode === 'REGISTER') {
    await handleGoogleLogin();
    return;
  }
  
  // Create address string
  const fullAddress = `${houseNo ? houseNo + ', ' : ''}${areaOrPara}, ${village}, ${postalCode}`;
  
  // Pass address data to authService
  const user = await authService.registerOrLogin(
    phone,
    password,
    authMode === 'REGISTER' ? fullName : undefined,
    fullAddress, // Complete address
    false,
    referralCode || undefined,
    profilePic,
    email || undefined
  );
  
  // Save additional address details to user_addresses table
  if (user && authMode === 'REGISTER') {
    await storageService.saveUserAddress({
      userId: user.id,
      fullName: fullName,
      phone: phone,
      village: village,
      areaOrPara: areaOrPara,
      houseNo: houseNo,
      postalCode: postalCode,
      latitude: latitude,
      longitude: longitude,
      landmark: '',
      isDefault: true
    });
  }
};
```

## Benefits of This Approach

1. **✅ Complete Data Collection**: All required fields collected upfront
2. **📍 GPS Integration**: Auto-detect location for accuracy
3. **🔄 Flexible Authentication**: Google or Email/Phone
4. **✏️ Manual Override**: Users can edit auto-detected address
5. **🎯 Accurate Delivery**: Lat/Long ensures precise delivery
6. **🎁 Referral Tracking**: Sales representative attribution
7. **📱 Mobile-Friendly**: GPS works great on mobile devices

## Next Steps

1. Implement the enhanced UserAuth component
2. Test location detection on mobile and desktop
3. Verify address data is saved correctly in Supabase
4. Test Google Auth flow with address collection
5. Add address validation and formatting

Would you like me to proceed with implementing this enhanced version?
