# 🎫 Tour Ticket - Travel & Tour Booking Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.19-green)](https://www.mongodb.com/)
[![Stripe](https://img.shields.io/badge/Stripe-18.5-purple)](https://stripe.com/)

A comprehensive, full-stack tour booking platform built with Next.js 15, TypeScript, and MongoDB. Features include user authentication, tour management, booking system, payment processing, and a powerful admin dashboard.

> **For Developers**: See [CLAUDE.md](CLAUDE.md) for detailed architecture, development patterns, and coding conventions.

## ✨ Features

### User Features
- 🔐 **Authentication & Authorization** - Firebase authentication with Google OAuth + JWT for admins
- 🔍 **Advanced Search & Filtering** - Search tours by destination, category, interests with Fuse.js
- 📅 **Smart Booking System** - Date selection, participant management, and add-ons
- 🛒 **Shopping Cart & Wishlist** - Multi-tour cart and favorites management
- 💳 **Stripe Payment Integration** - Secure payment processing with Stripe
- 📱 **User Dashboard** - View bookings, manage profile, download tickets (PDF/QR)
- ⭐ **Reviews & Ratings** - User-generated tour reviews and ratings
- 📧 **Email Notifications** - Automated booking confirmations via Mailgun

### Admin Features
- 📊 **Analytics Dashboard** - Revenue tracking with Chart.js and Recharts
- 🎯 **Tour Management** - CRUD operations for tours, destinations, categories
- 📝 **Booking Management** - View, edit, and manage all bookings
- 👥 **User Management** - Monitor and manage user accounts
- 🏷️ **Discount System** - Create and manage promotional codes
- 📸 **Media Management** - Cloudinary integration for image uploads
- 🎨 **Dynamic Content** - Attraction pages, blog posts, hero settings
- 📦 **Bulk Operations** - Import/export data, bulk uploads

### Technical Features
- 🚀 **Server-Side Rendering** - Fast page loads with Next.js App Router
- 📱 **Responsive Design** - Mobile-first approach with Tailwind CSS
- 🎨 **Modern UI/UX** - Framer Motion animations, Lucide React icons
- 🔍 **Advanced Search** - Algolia-powered instant search with typo tolerance
- 🤖 **AI-Powered Search** - Intelligent tour recommendations with Vercel AI SDK
- 🛡️ **Error Tracking** - Sentry integration for monitoring
- 💬 **Customer Support** - Intercom integration
- 🔒 **Security** - Protected routes, input validation, secure sessions

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js 15.5](https://nextjs.org/) with App Router
- **Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 3.4](https://tailwindcss.com/)
- **UI Components:** Lucide React, Framer Motion
- **Charts:** Chart.js, Recharts
- **Forms:** React Day Picker, React Hot Toast

### Backend
- **Runtime:** Node.js 20+
- **Database:** [MongoDB](https://www.mongodb.com/) with [Mongoose ODM](https://mongoosejs.com/)
- **Search:** [Algolia](https://www.algolia.com/) for instant search
- **Authentication:** [Firebase Authentication](https://firebase.google.com/products/auth) + JWT (Jose), bcryptjs
- **Payment:** [Stripe](https://stripe.com/)
- **Email:** [Mailgun](https://www.mailgun.com/)
- **Storage:** [Cloudinary](https://cloudinary.com/)

### DevOps & Tools
- **Monitoring:** [Sentry](https://sentry.io/)
- **Customer Support:** [Intercom](https://www.intercom.com/)
- **PDF Generation:** jsPDF, PDFKit, PDF-lib
- **QR Codes:** qrcode
- **Package Manager:** pnpm

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or later
- **pnpm** 8.x or later
- **MongoDB** 6.x or later (local or Atlas)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain

# Firebase (User Authentication)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-side token verification)
# Use individual credentials to reduce environment variable size (AWS Lambda has 4KB limit)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----"

# Algolia Search (optional but recommended)
NEXT_PUBLIC_ALGOLIA_APP_ID=your_algolia_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=your_algolia_search_api_key
ALGOLIA_ADMIN_API_KEY=your_algolia_admin_api_key
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=tours

# Sentry (optional)
SENTRY_DSN=your_sentry_dsn

# Intercom (optional)
INTERCOM_APP_ID=your_intercom_app_id

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin bootstrap login (use an email address)
ADMIN_USERNAME=admin@youcompany.com
ADMIN_PASSWORD=super-secure-password
SUPPORT_EMAIL=support@yourcompany.com
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tourticket.git
   cd tourticket
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Seed the database** (optional)
   ```bash
   node seed-database.js
   ```

5. **Run development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📜 Available Scripts

```bash
# Development
pnpm dev                 # Start dev server with auto port detection (3000+)
pnpm dev:original        # Start dev server on port 3000 with Turbopack
pnpm build               # Build for production
pnpm start               # Start production server
pnpm lint                # Run ESLint

# Testing
pnpm test                # Run Jest tests
pnpm test:watch          # Run tests in watch mode
pnpm test:coverage       # Run tests with coverage

# Algolia Search
pnpm algolia:sync        # Sync all published tours to Algolia
pnpm algolia:clear-sync  # Clear index and resync all tours
pnpm algolia:sync-all    # Sync all tours (including unpublished)
```

> **Note**: The dev server automatically detects available ports starting from 3000, preventing port conflicts.

## 📁 Project Structure

```
tourticket/
├── app/                    # Next.js App Router pages
│   ├── [slug]/            # Dynamic tour detail pages (catch-all route)
│   ├── admin/             # Admin dashboard routes (protected)
│   ├── user/              # User dashboard routes (protected)
│   ├── api/               # API routes (Route Handlers)
│   └── ...                # Other routes (about, contact, etc.)
├── components/            # React components (Server + Client)
├── contexts/              # React Context providers (Client)
├── hooks/                 # Custom React hooks
├── lib/                   # Backend logic and Mongoose models
│   ├── models/           # Database schemas
│   ├── email/            # Email templates
│   └── ...               # Utilities, auth, integrations
├── scripts/               # Maintenance and utility scripts
├── utils/                 # Frontend helper functions
├── types/                 # TypeScript type definitions
├── public/                # Static assets
└── middleware.ts          # Route protection and middleware
```

## 🔐 Authentication

The application supports dual authentication methods:

### Firebase Authentication (Primary - User Accounts)
1. User signs up/logs in with email and password (or Google OAuth)
2. Firebase handles authentication and returns ID token
3. Server verifies Firebase token using Firebase Admin SDK
4. User data synced with MongoDB
5. Role-based access control (user/admin)

### JWT Authentication (Admin Accounts & Legacy)
1. Admin signs in with email and password
2. Password is hashed using bcryptjs
3. JWT token is generated and stored in HTTP-only cookies
4. Middleware validates tokens for protected routes
5. Used for admin dashboard authentication

**Note**: API routes automatically detect authentication method - Firebase tokens are tried first, with JWT fallback for backward compatibility.

## 💳 Payment Flow

1. User adds tours to cart
2. Proceeds to checkout
3. Stripe payment form is presented
4. Payment is processed securely
5. Booking is confirmed and stored in database
6. Confirmation email sent via Mailgun
7. PDF ticket with QR code generated

## 🎨 UI/UX Features

- **Responsive Design** - Works seamlessly on all devices
- **Smooth Animations** - Framer Motion transitions and micro-interactions
- **Toast Notifications** - React Hot Toast for user feedback
- **Loading States** - Skeleton screens and spinners for better perceived performance
- **Error Handling** - User-friendly error messages with fallback UI
- **AI Assistant** - Interactive AI-powered tour search and recommendations

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcryptjs
- HTTP-only cookies
- CSRF protection
- Input validation and sanitization
- Protected API routes
- Secure payment processing with Stripe

## 📊 Admin Dashboard

Access the admin panel at `/admin` (requires admin role):

- **Dashboard** - Revenue analytics, booking statistics
- **Tours** - Create, edit, delete tours
- **Bookings** - Manage all bookings
- **Users** - User management
- **Destinations** - Manage destinations
- **Categories** - Manage tour categories
- **Discounts** - Create promotional codes
- **Reviews** - Moderate user reviews
- **Content** - Blog posts, attraction pages
- **Settings** - Hero settings, site configuration

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms

The application can be deployed on any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Render
- DigitalOcean App Platform

### Build Command
```bash
pnpm build
```

### Start Command
```bash
pnpm start
```

## 🔍 Algolia Search Setup

This application uses Algolia for fast, typo-tolerant search functionality.

### Setting up Algolia

1. **Create an Algolia account** at [algolia.com](https://www.algolia.com/)

2. **Create a new application** in your Algolia dashboard

3. **Get your API credentials:**
   - Application ID
   - Search-Only API Key (for frontend)
   - Admin API Key (for backend operations)

4. **Add to your `.env` file:**
   ```env
   NEXT_PUBLIC_ALGOLIA_APP_ID=your_app_id
   NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=your_search_api_key
   ALGOLIA_ADMIN_API_KEY=your_admin_api_key
   NEXT_PUBLIC_ALGOLIA_INDEX_NAME=tours
   ```

5. **Initial index sync:**
   ```bash
   pnpm algolia:sync
   ```

### Algolia Features

- **Instant Search** - Results appear as you type
- **Typo Tolerance** - Finds results even with misspellings
- **Faceted Filters** - Filter by category, destination, price, rating
- **Custom Ranking** - Featured tours ranked higher
- **Auto-sync** - Tours automatically sync when created/updated/deleted
- **Fallback** - Falls back to MongoDB search if Algolia is unavailable

### Manual Sync Commands

```bash
# Sync all published tours to Algolia
pnpm algolia:sync

# Clear index and resync all tours
pnpm algolia:clear-sync
```

### API Endpoint for Admin Sync

```bash
# Trigger sync via API
POST /api/algolia/sync
```

## 🔥 Firebase Authentication Setup

This application uses Firebase for user authentication, providing secure email/password and Google OAuth login.

### Setting up Firebase

1. **Create a Firebase project** at [firebase.google.com](https://firebase.google.com/)

2. **Enable Authentication:**
   - Go to Authentication → Sign-in method
   - Enable Email/Password provider
   - (Optional) Enable Google provider for OAuth

3. **Get your Firebase config:**
   - Go to Project Settings → General
   - Scroll to "Your apps" and click the web icon (</>)
   - Copy the Firebase configuration

4. **Add client-side credentials to `.env`:**
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Generate Admin SDK credentials:**
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

6. **Extract individual credentials from the JSON:**
   - Open the downloaded JSON file
   - Extract `project_id`, `client_email`, and `private_key`

7. **Add server-side credentials to `.env`:**
   ```env
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
   Your_Private_Key_Here
   -----END PRIVATE KEY-----"
   ```

### Why Individual Credentials?

AWS Lambda (used by Netlify and Vercel) has a 4KB limit for environment variables. The full Firebase service account JSON is ~3KB, which combined with other variables exceeds this limit. By splitting the credentials into individual environment variables, we stay well under the limit (~1.7KB for Firebase credentials).

### Firebase Features

- **Email/Password Authentication** - Traditional signup/login
- **Google OAuth** - One-click Google sign-in
- **Token Verification** - Secure server-side token validation with Firebase Admin SDK
- **Automatic User Sync** - User data automatically synced with MongoDB
- **Dual Auth Support** - Works alongside JWT for admin accounts

### Important Notes

- Firebase credentials are split into client-side (`NEXT_PUBLIC_*`) and server-side (`FIREBASE_*`) variables
- Client-side variables are safe to expose (used in browser)
- Server-side variables must be kept secret (never expose private key)
- The application automatically detects Firebase tokens and falls back to JWT for backward compatibility

## 🧪 Testing

```bash
pnpm test                # Run all tests
pnpm test:watch          # Run tests in watch mode
pnpm test:coverage       # Generate coverage report
```

Tests are located in `__tests__` directories alongside the code they test. The project uses Jest with React Testing Library.

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset

### Tour Endpoints
- `GET /api/tours` - Get all tours
- `GET /api/tours/[slug]` - Get tour by slug
- `POST /api/tours` - Create tour (admin)
- `PUT /api/tours/[id]` - Update tour (admin)
- `DELETE /api/tours/[id]` - Delete tour (admin)

### Booking Endpoints
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/[id]` - Get booking details
- `PUT /api/bookings/[id]` - Update booking (admin)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Read [CLAUDE.md](CLAUDE.md) for architecture and coding conventions
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

### Development Guidelines

- Follow the patterns documented in [CLAUDE.md](CLAUDE.md)
- Always call `dbConnect()` before database operations
- Use Server Components by default; add `'use client'` only when needed
- Sync tours to Algolia after database updates
- Write tests for new features
- Ensure TypeScript types are properly defined

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Ranjit Rajput**

- GitHub: [@ranjitrajput](https://github.com/ranjitrajput)
- Project: [Tour Ticket](https://github.com/ranjitrajput/tourticket)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Vercel for hosting and deployment platform
- Stripe for payment processing
- MongoDB for database solutions
- All open-source contributors

## 📞 Support

For technical questions and development help, see [CLAUDE.md](CLAUDE.md) for architecture details and common gotchas.

## 🐛 Bug Reports

Found a bug? Please open an issue on [GitHub Issues](https://github.com/ranjitrajput/tourticket/issues) with:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, browser, etc.)

---

Made with ❤️ by Ranjit Rajput
