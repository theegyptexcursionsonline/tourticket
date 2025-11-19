# Admin Portal Setup Guide

## Quick Start

### 1. Configure Environment Variables

Add these variables to your `.env` file:

```env
# Admin Bootstrap Login (temporary, for first-time setup)
ADMIN_USERNAME=admin@yourcompany.com
ADMIN_PASSWORD=create-a-strong-password-here

# Email Configuration (for sending invites)
SUPPORT_EMAIL=support@yourcompany.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Make sure these are also configured:
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=generate-a-random-jwt-secret
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
```

### 2. Restart Your Development Server

**IMPORTANT:** After updating `.env`, you must restart:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
pnpm dev
```

### 3. Access the Admin Portal

1. Go to: `http://localhost:3000/admin`
2. Login with the credentials from your `.env`:
   - **Email:** `admin@yourcompany.com` (or whatever you set in `ADMIN_USERNAME`)
   - **Password:** Your `ADMIN_PASSWORD` value

### 4. Invite Your Team

Once logged in:

1. Navigate to **Admin → Team Access**
2. Click **"Invite Team Member"**
3. Fill in:
   - First Name
   - Last Name  
   - Email (their work email)
   - Role (Operations, Content, etc.)
   - Permissions (what they can access)
4. Click **"Send Invitation"**
5. The team member will receive an email with a secure invitation link

### 5. Team Member Accepts Invitation

New team members will:

1. Receive an email with an invitation link (expires in 7 days)
2. Click the link to open the acceptance page
3. Set their own secure password
4. Their account is activated automatically
5. They can then log in at `http://localhost:3000/admin`

## Roles & Permissions

### Available Roles

- **Super Admin** - Full access to everything (you, the owner)
- **Admin** - Nearly full access
- **Operations** - Manage bookings, manifests, discounts
- **Content** - Manage tours, pricing, blog, reviews
- **Viewer** - Read-only access to reports

### Granular Permissions

You can override default role permissions with:

- `manageDashboard` - View analytics
- `manageBookings` - Edit bookings
- `manageTours` - Create/edit tours
- `managePricing` - Update tour prices
- `manageContent` - Manage blog/reviews
- `manageDiscounts` - Create discount codes
- `manageUsers` - Invite/remove team members
- `manageReports` - View reports

## Troubleshooting

### "Invalid credentials" error

- Check that `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set in `.env`
- Make sure you restarted the dev server after adding them
- Verify the email matches exactly (it's case-insensitive, but must match)

### "Failed to execute 'text' on 'Response'" error

- This was a bug that has been fixed
- Make sure you have the latest code
- Restart your dev server

### Can't see any pages after login

- The user might not have the right permissions
- Go to **Team Access**, edit the user, and add the required permissions

### Emails not sending

- Verify `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` are correct
- Check Mailgun dashboard for error logs
- Emails are sent when you:
  - Invite a team member
  - Toggle their access status
  - Customer makes a booking (separate from admin features)

## Security Notes

- The `ADMIN_USERNAME` / `ADMIN_PASSWORD` env variables are ONLY for bootstrapping
- Once you've invited yourself as a proper admin user in the database, you can remove those env vars
- All passwords are hashed with bcrypt
- JWT tokens expire after 8 hours
- Inactive users cannot log in

## Next Steps

After setting up your first admin account:

1. Create a real admin user for yourself via "Team Access"
2. Remove or comment out `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env`
3. From now on, all admin access goes through database users
4. You can revoke/suspend team members anytime from the Team Access page

---

Need help? Check the main [README.md](./README.md) or contact support.

