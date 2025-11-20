# Team Access Management - Validation Guide

## Quick Validation Checklist

### ✅ Pre-requisites
- [ ] Environment variables are set (see `.env.example`)
- [ ] Database is connected
- [ ] Email service (Mailgun) is configured
- [ ] You have admin access with `manageUsers` permission

### ✅ Core Functionality Tests

#### 1. Access the Team Management Page
```
URL: http://localhost:3000/admin/team
Expected: Page loads, shows "Team access" heading and invite form
```

#### 2. Invite a Team Member
**Steps:**
1. Fill in first name, last name, and email
2. Select default permissions (e.g., "Bookings")
3. Click "Invite teammate"

**Expected Results:**
- ✅ Success toast: "Invitation sent! Team member will receive an email to set their password."
- ✅ New member appears in "Current team" list
- ✅ Member status shows as inactive (grayed out)
- ✅ Invitation email sent to the provided address

#### 3. Accept Invitation
**Steps:**
1. Check inbox for invitation email
2. Click "Accept Invitation & Set Password" button
3. Enter password (min 8 characters)
4. Click "Activate Account"

**Expected Results:**
- ✅ Success message: "Welcome to the Team!"
- ✅ Redirect to `/admin` login page after 2 seconds
- ✅ Can now log in with the email and password

#### 4. Update Permissions
**Steps:**
1. Go to `/admin/team`
2. Find a team member
3. Click on permission badges to toggle them

**Expected Results:**
- ✅ Permission toggles immediately (visual feedback)
- ✅ Success toast: "Team member updated"
- ✅ Email sent to team member about permission change

#### 5. Revoke/Restore Access
**Steps:**
1. Click "Revoke access" button on a team member
2. Try logging in as that user
3. Click "Restore" to reactivate
4. Try logging in again

**Expected Results:**
- ✅ After revoke: Login fails with "account deactivated" message
- ✅ After restore: Login succeeds
- ✅ Emails sent for both actions

#### 6. Delete Team Member
**Steps:**
1. Click "Delete" button
2. Confirm deletion in popup

**Expected Results:**
- ✅ Member removed from list
- ✅ Success toast
- ✅ Deletion email sent to team member

### ✅ Permission Checks

Test that non-admin users cannot access team management:

1. **Create a user without `manageUsers` permission**
2. **Try to access `/admin/team`**
   - Expected: Access denied or redirected

3. **Try to call API directly:**
   ```bash
   curl -X GET http://localhost:3000/api/admin/team \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   - Expected: 403 Forbidden response

### ✅ Security Tests

#### Invalid Token Test
```bash
# Try to accept invitation with invalid token
curl -X POST http://localhost:3000/api/admin/accept-invitation \
  -H "Content-Type: application/json" \
  -d '{"token": "invalid-token", "password": "password123"}'
```
Expected: 400 Bad Request - "Invalid or expired invitation token"

#### Expired Token Test
1. Invite a user
2. Manually update the database to set `invitationExpires` to a past date
3. Try to accept the invitation
Expected: "Invalid or expired invitation token"

#### Weak Password Test
Try to set a password with less than 8 characters
Expected: "Password must be at least 8 characters long"

### ✅ Email Template Tests

Check that emails render correctly:

1. **Invitation Email** should contain:
   - Invitee name
   - Inviter name
   - Role (capitalized)
   - Permissions list (as pills/badges)
   - "Accept Invitation & Set Password" button
   - Security notice about 7-day expiration

2. **Access Update Email** should contain:
   - Team member name
   - Action taken (activated/deactivated/permissions_updated/deleted)
   - "Go to admin portal" button (if activated)
   - Support email contact

### ✅ Browser Console Checks

Open browser DevTools (F12) and check for:
- [ ] No JavaScript errors
- [ ] Network requests to `/api/admin/team` succeed (200 status)
- [ ] No CORS errors
- [ ] No authentication errors

### ✅ Database Verification

Check the database to ensure:

```javascript
// User document should have:
{
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "operations",
  permissions: ["manageDashboard", "manageBookings"],
  isActive: false, // true after accepting invitation
  invitationToken: "abc123...", // cleared after acceptance
  invitationExpires: "2024-11-27T...", // cleared after acceptance
  requirePasswordChange: false
}
```

## Troubleshooting Common Issues

### Issue: Emails not being sent

**Possible Causes:**
1. Mailgun credentials not set
2. MAILGUN_FROM_EMAIL not verified in Mailgun
3. Network connectivity issues

**Solutions:**
- Check `.env` file for Mailgun variables
- Verify domain in Mailgun dashboard
- Check server logs for email errors
- Test Mailgun API directly

### Issue: Invitation link doesn't work

**Possible Causes:**
1. `NEXT_PUBLIC_APP_URL` not set correctly
2. Token expired
3. Token not saved in database

**Solutions:**
- Verify `NEXT_PUBLIC_APP_URL` in `.env`
- Check invitation token expiration date
- Verify token is saved in user document

### Issue: Permission checks failing

**Possible Causes:**
1. User doesn't have `manageUsers` permission
2. JWT token expired
3. Token not being sent in Authorization header

**Solutions:**
- Check user permissions in database
- Refresh browser to get new token
- Check Network tab for Authorization header

### Issue: "Team Access" link not visible in sidebar

**Possible Causes:**
1. User doesn't have `manageUsers` permission
2. Sidebar not refreshing after permission change

**Solutions:**
- Logout and login again
- Check user permissions
- Verify sidebar filtering logic

## API Endpoint Reference

### GET /api/admin/team
List all team members (non-customers)

**Auth Required:** Yes (Bearer token with `manageUsers` permission)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "operations",
      "permissions": ["manageDashboard", "manageBookings"],
      "isActive": true,
      "createdAt": "2024-11-20T..."
    }
  ]
}
```

### POST /api/admin/team
Invite a new team member

**Auth Required:** Yes (Bearer token with `manageUsers` permission)

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "role": "operations",
  "permissions": ["manageDashboard", "manageBookings"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "operations",
    "permissions": ["manageDashboard", "manageBookings"],
    "isActive": false
  }
}
```

### PATCH /api/admin/team/:id
Update a team member

**Auth Required:** Yes (Bearer token with `manageUsers` permission)

**Request Body:**
```json
{
  "permissions": ["manageDashboard", "manageBookings", "manageReports"],
  "isActive": true
}
```

### DELETE /api/admin/team/:id
Delete a team member

**Auth Required:** Yes (Bearer token with `manageUsers` permission)

**Response:**
```json
{
  "success": true,
  "message": "Team member permanently deleted."
}
```

### GET /api/admin/accept-invitation?token=...
Verify invitation token

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "operations",
    "expiresAt": "2024-11-27T..."
  }
}
```

### POST /api/admin/accept-invitation
Accept invitation and set password

**Auth Required:** No

**Request Body:**
```json
{
  "token": "invitation-token-here",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account activated successfully. You can now log in.",
  "email": "john@example.com"
}
```

---

## Summary

If all the above tests pass, your team access management feature is fully functional and ready for production use. 

**Report any issues with:**
- Specific error messages
- Browser console logs
- Network request details
- Database state

Happy team managing! 🎉

