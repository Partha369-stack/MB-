
# Local Authentication Guide

- **Admin Login:**
  - **Username/Email:** `admin` (or `admin@motherbest.com`)
  - **Password:** `admin`
  - **Access URL:** `/admin`

- **Customer Login:**
  - Enter any 10-digit phone number.
  - OTP is mocked: `123456`

- **Data Persistence:**
  - All data (Users, Orders, etc.) is stored in your browser's Local Storage.
  - Supabase database has been removed.
  - Use "Clear Mock Data" in Admin Dashboard to reset data.

- **Note on "Clean Auth System":**
  - The login system is now fully local and requires no backend setup.
  - Admin panel is accessible only to users with 'admin' role. The fallback/hardcoded super-admin is removed and replaced with a proper seeded admin user.
