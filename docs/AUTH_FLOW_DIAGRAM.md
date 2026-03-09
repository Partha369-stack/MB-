# Authentication Flow Diagram

## Visual Flow Chart

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER AUTHENTICATION SYSTEM                       │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │  User Visits │
                              │   Auth Page  │
                              └──────┬───────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
            ┌───────▼────────┐              ┌────────▼────────┐
            │  Already a     │              │  Join the       │
            │    Member      │              │    Family       │
            │   (LOGIN)      │              │  (REGISTER)     │
            └───────┬────────┘              └────────┬────────┘
                    │                                │
                    │                                │
        ┌───────────▼──────────┐         ┌──────────▼──────────┐
        │  Enter Credentials:  │         │  Fill Registration  │
        │  • Phone Number      │         │  Form:              │
        │  • Password          │         │  • Full Name        │
        └───────────┬──────────┘         │  • Phone Number     │
                    │                    │  • Email (opt)      │
                    │                    │  • Password         │
        ┌───────────▼──────────┐         │  • Confirm Pass     │
        │   Validate Input     │         │  • Photo (opt)      │
        └───────────┬──────────┘         │  • Referral (opt)   │
                    │                    └──────────┬──────────┘
                    │                               │
            ┌───────▼────────┐             ┌────────▼────────┐
            │  Valid?        │             │  Validate Form  │
            └───┬────────┬───┘             └────┬────────┬───┘
                │ NO     │ YES                  │ NO     │ YES
                │        │                      │        │
        ┌───────▼──┐     │              ┌───────▼──┐     │
        │  Show    │     │              │  Show    │     │
        │  Error   │     │              │  Error   │     │
        └──────────┘     │              └──────────┘     │
                         │                               │
                ┌────────▼────────┐          ┌───────────▼──────────┐
                │  Authenticate   │          │  Create Supabase     │
                │  with Supabase  │          │  Auth Account        │
                └────────┬────────┘          └───────────┬──────────┘
                         │                               │
                ┌────────▼────────┐          ┌───────────▼──────────┐
                │  Fetch User     │          │  Create User         │
                │  Profile        │          │  Profile             │
                └────────┬────────┘          └───────────┬──────────┘
                         │                               │
                ┌────────▼────────┐          ┌───────────▼──────────┐
                │  Fetch User     │          │  Assign Default      │
                │  Roles          │          │  'customer' Role     │
                └────────┬────────┘          └───────────┬──────────┘
                         │                               │
                ┌────────▼────────┐          ┌───────────▼──────────┐
                │  Create         │          │  Link Referral       │
                │  Session        │          │  Code (if provided)  │
                └────────┬────────┘          └───────────┬──────────┘
                         │                               │
                         │                    ┌──────────▼──────────┐
                         │                    │  Save Profile       │
                         │                    │  Picture (if any)   │
                         │                    └──────────┬──────────┘
                         │                               │
                         └───────────┬───────────────────┘
                                     │
                            ┌────────▼────────┐
                            │  Check User     │
                            │  Role           │
                            └────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼────────┐    ┌──────────▼──────────┐   ┌────────▼────────┐
│  Role:         │    │  Role:              │   │  Role:          │
│  Customer      │    │  Sales/Delivery     │   │  Admin          │
└───────┬────────┘    └──────────┬──────────┘   └────────┬────────┘
        │                        │                        │
┌───────▼────────┐    ┌──────────▼──────────┐   ┌────────▼────────┐
│  Profile       │    │  Navigate to        │   │  Navigate to    │
│  Complete?     │    │  Role Dashboard     │   │  Admin Panel    │
└───┬────────┬───┘    └─────────────────────┘   └─────────────────┘
    │ NO     │ YES
    │        │
┌───▼──┐  ┌──▼────┐
│Profile│ │Product│
│Setup  │ │ Hub   │
└───────┘ └───────┘


═══════════════════════════════════════════════════════════════════════════
                        ALTERNATIVE: GOOGLE SIGN-IN
═══════════════════════════════════════════════════════════════════════════

                    ┌──────────────────────┐
                    │  Click "Continue     │
                    │  with Google"        │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Google OAuth        │
                    │  Authentication      │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Supabase Creates    │
                    │  Auth Account        │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Auto-create Profile │
                    │  • Name from Google  │
                    │  • Email from Google │
                    │  • Photo from Google │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Assign 'customer'   │
                    │  Role                │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Navigate to         │
                    │  Profile Setup       │
                    └──────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                            ERROR HANDLING
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────┐
│  Validation Errors      │
├─────────────────────────┤
│  • Empty phone          │ → "Phone number is required"
│  • Invalid phone        │ → "Please enter valid 10-digit number"
│  • Empty password       │ → "Password is required"
│  • Weak password        │ → "Password must be 6+ characters"
│  • Empty name           │ → "Full name is required"
│  • Short name           │ → "Name must be 3+ characters"
│  • Invalid email        │ → "Please enter valid email"
│  • Password mismatch    │ → "Passwords do not match"
└─────────────────────────┘

┌─────────────────────────┐
│  Authentication Errors  │
├─────────────────────────┤
│  • Invalid credentials  │ → "Invalid phone or password"
│  • Duplicate account    │ → "Phone already registered"
│  • Network error        │ → "Check your connection"
│  • Google login failed  │ → "Google login failed"
└─────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                        DATABASE OPERATIONS
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE TABLES UPDATED                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. auth.users                                                           │
│     • id (UUID)                                                          │
│     • email                                                              │
│     • encrypted_password                                                 │
│     • created_at                                                         │
│                                                                          │
│  2. public.users                                                         │
│     • id (UUID) - matches auth.users.id                                  │
│     • name                                                               │
│     • phone                                                              │
│     • email                                                              │
│     • profile_picture_url                                                │
│     • status (active/inactive)                                           │
│     • phone_verified (boolean)                                           │
│     • referred_by (UUID) - links to referring user                       │
│     • created_at                                                         │
│     • updated_at                                                         │
│                                                                          │
│  3. public.user_roles                                                    │
│     • id (UUID)                                                          │
│     • user_id (UUID) - references users.id                               │
│     • role (customer/sales/delivery/admin)                               │
│     • is_active (boolean)                                                │
│     • created_at                                                         │
│                                                                          │
│  4. public.user_sessions                                                 │
│     • id (UUID)                                                          │
│     • user_id (UUID) - references users.id                               │
│     • token_hash                                                         │
│     • device_info                                                        │
│     • user_agent                                                         │
│     • ip_address                                                         │
│     • expires_at                                                         │
│     • is_active (boolean)                                                │
│     • created_at                                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                        COMPONENT STATE FLOW
═══════════════════════════════════════════════════════════════════════════

Initial State:
  authMode: 'LOGIN'
  phone: ''
  email: ''
  password: ''
  confirmPassword: ''
  fullName: ''
  referralCode: ''
  profilePic: undefined
  isLoading: false
  error: null

User Interaction → State Update → Validation → API Call → Success/Error

Example Flow:
1. User types phone → setPhone('9876543210')
2. User types password → setPassword('mypass123')
3. User clicks Login → setIsLoading(true)
4. Validation passes → authService.registerOrLogin()
5. API succeeds → onSuccess(user)
6. OR API fails → setError('Invalid credentials'), setIsLoading(false)


═══════════════════════════════════════════════════════════════════════════
                        SECURITY CONSIDERATIONS
═══════════════════════════════════════════════════════════════════════════

✓ Client-side validation (immediate feedback)
✓ Server-side validation (Supabase)
✓ Password hashing (Supabase Auth)
✓ HTTPS only (Supabase enforced)
✓ PKCE flow for OAuth (enhanced security)
✓ Session tokens (auto-refresh)
✓ Input sanitization (phone number formatting)
✓ XSS protection (React escaping)
✓ CSRF protection (Supabase built-in)

```

## Key Takeaways

1. **Two Main Paths**: Login (existing users) and Register (new users)
2. **Validation First**: All inputs validated before API calls
3. **Role-Based Routing**: Users redirected based on their role
4. **Error Handling**: Clear error messages at every step
5. **Database Integration**: Multiple tables updated in sequence
6. **Google OAuth**: Alternative authentication method
7. **Security**: Multiple layers of protection
8. **State Management**: Clean, predictable state updates

## Usage Example

```typescript
// In your component
<UserAuth
  onSuccess={(user) => {
    console.log('User authenticated:', user);
    // Handle navigation based on user.role
  }}
  onBack={() => {
    console.log('User clicked back');
    // Handle back navigation
  }}
  existingUser={currentUser}  // Optional
  logoComponent={<YourLogo />}
/>
```

---

**Note**: This diagram represents the complete authentication flow as implemented in `components/UserAuth.tsx`. All paths have been tested and validated against the Supabase database schema.
