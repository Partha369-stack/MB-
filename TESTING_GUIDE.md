# 🧪 Testing Guide - Activity-Based Sales System

## Testing Steps

### 1. **Login as Sales Person**
- Use your sales credentials to login
- You'll be redirected to the new Sales Dashboard

### 2. **Check Dashboard Overview**
- You should see:
  - ✅ Activity-based target display (if admin has set one)
  - ✅ Quick stats cards (Visits, Conversions, Follow-Ups, Emergency Alerts)
  - ✅ **NO MONETARY AMOUNTS ANYWHERE**
  - ✅ Recent activities section

### 3. **Log a Visit**
1. Click **"Log New Visit"** button
2. Fill in the form:
   - Select "🚶 New Visit"
   - Enter person's name (required)
   - Enter phone number (required)
   - Enter address (optional)
   - Add detailed notes (required)
   - Check "Converted to Customer" if applicable
3. Click "Save Activity Record"
4. Verify the visit appears in:
   - Overview tab (Recent Activities)
   - My Visits tab
   - Activity Log tab

### 4. **Check Follow-Ups Tab**
- View all your customers
- Look for **Emergency Follow-Ups** section (red alerts)
- Customers shown here if:
  - They haven't purchased in 30+ days
  - They were converted but never ordered

### 5. **Test Conversion Tracking**
1. Log a new visit
2. Check the "Converted to Customer" checkbox
3. Verify:
   - Visit shows ✓ Converted badge
   - Conversion count increases in stats
   - Target progress updates

### 6. **Navigation Test**
Test all tabs:
- 📊 Dashboard (Overview)
- 📍 My Visits
- 👥 Follow-Ups
- 📅 Activity Log
- 🌐 View Website (should redirect to customer site)

---

## Expected Behavior

### ✅ What You SHOULD See:
- Number of visits completed
- Number of conversions achieved
- Progress bars (%)
- Emergency follow-up alerts
- Customer names and contact info
- Activity logs with notes

### ❌ What You SHOULD NOT See:
- Sales amounts
- Order values
- Revenue figures
- Money/rupee symbols (₹)
- Any monetary targets

---

## Admin Testing (For Creating Targets)

### Create a New Target for Sales Person:
**Note**: You'll need to update the Admin Dashboard to create activity-based targets.

Target should include:
```json
{
  "salesPersonId": "SALES-PERSON-ID",
  "targetVisits": 50,
  "targetConversions": 15,
  "currentVisits": 0,
  "currentConversions": 0,
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "instructions": "Focus on rural areas, visit 2-3 people daily",
  "status": "active"
}
```

---

## Test Scenarios

### Scenario 1: First Day Sales Person
1. Login as new sales person
2. No target assigned yet
3. Should see "No Active Target" message
4. Can still log visits
5. Stats should track even without target

### Scenario 2: Active Target
1. Admin assigns target (50 visits, 15 conversions)
2. Sales person logs 10 visits
3. Progress bar shows 20% (10/50)
4. Sales person marks 3 as converted
5. Conversion progress shows 20% (3/15)

### Scenario 3: Emergency Follow-Up
1. Customer created 31 days ago
2. Customer has not ordered in 31 days
3. Should appear in Emergency Follow-Ups (red section)
4. Alert banner should show on dashboard
5. Badge count on Follow-Ups tab

### Scenario 4: Mobile Testing
1. Open on mobile device
2. Sidebar should collapse
3. All buttons should be tappable
4. Modal should be scrollable
5. Forms should be easy to fill

---

## Common Issues & Solutions

### Issue: "No customers in follow-up list"
**Solution**: Customers only appear if they were referred by this sales person (referredBy field matches)

### Issue: "Target not showing"
**Solution**: Admin needs to create an active target with status='active'

### Issue: "Can't log activity"
**Solution**: All required fields must be filled (Name, Phone, Notes)

### Issue: "Conversion not counting"
**Solution**: Make sure to check the "Converted to Customer" checkbox when logging the visit

---

## Data Verification

### Check localStorage (Browser DevTools):
```javascript
// Check sales targets
localStorage.getItem('mb_sales_targets')

// Check sales activities
localStorage.getItem('mb_sales_activities')

// Check all users
localStorage.getItem('mb_all_users')
```

---

## Performance Checks

### Dashboard Should:
- ✅ Load within 2 seconds
- ✅ Smooth tab transitions
- ✅ No lag when opening modal
- ✅ Instant stat updates after logging activity
- ✅ Responsive on mobile (< 768px width)

---

## Reporting Bugs

If you find issues, note:
1. Which tab you were on
2. What action you took
3. What you expected to happen
4. What actually happened
5. Browser console errors (F12 → Console)

---

## Success Criteria

The system is working correctly if:
1. ✅ Sales person can log visits with full details
2. ✅ Conversions are tracked separately
3. ✅ NO money/amounts visible to sales person
4. ✅ Emergency follow-ups are flagged automatically
5. ✅ Progress bars update in real-time
6. ✅ All tabs are accessible and functional
7. ✅ Mobile responsive design works
8. ✅ Data persists after page reload

---

**Happy Testing! 🎉**
