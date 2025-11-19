# 🎫 Tour Ticket - Travel & Tour Booking Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.19-green)](https://www.mongodb.com/)
[![Stripe](https://img.shields.io/badge/Stripe-18.5-purple)](https://stripe.com/)

A comprehensive, full-stack tour booking platform built with Next.js 15, TypeScript, and MongoDB. Features include user authentication, tour management, booking system, payment processing, and a powerful admin dashboard.

## ✨ Features

### User Features
- 🔐 **Authentication & Authorization** - Secure JWT-based authentication with bcrypt password hashing
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
- **Authentication:** JWT (Jose), bcryptjs
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
pnpm dev                # Start development server with Turbopack
pnpm build              # Build for production
pnpm start              # Start production server
pnpm lint               # Run ESLint
pnpm algolia:sync       # Sync all tours to Algolia search index
pnpm algolia:clear-sync # Clear and resync Algolia index
```

## 📁 Project Structure

```
tourticket/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard routes
│   ├── user/              # User dashboard routes
│   ├── tour/              # Tour pages
│   ├── api/               # API routes
│   └── ...
├── components/            # Reusable React components
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── lib/                   # Database models & utilities
├── utils/                 # Helper functions
├── public/                # Static assets
├── types/                 # TypeScript type definitions
└── middleware.ts          # Next.js middleware
```

## 🔐 Authentication

The application uses JWT-based authentication with the following flow:
1. User signs up/logs in with email and password
2. Password is hashed using bcryptjs
3. JWT token is generated and stored in HTTP-only cookies
4. Middleware validates tokens for protected routes
5. Role-based access control (user/admin)

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
- **Dark Mode Support** - (If implemented)
- **Smooth Animations** - Framer Motion transitions
- **Toast Notifications** - React Hot Toast for user feedback
- **Loading States** - Skeleton screens and spinners
- **Error Handling** - User-friendly error messages

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

## 🧪 Testing

```bash
# Run tests (if configured)
pnpm test
```

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
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Ranjit Rajput**

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Vercel for hosting and deployment platform
- Stripe for payment processing
- MongoDB for database solutions
- All open-source contributors

## 📞 Support

For support, email your.email@example.com or join our Discord channel.

## 🐛 Bug Reports

Found a bug? Please open an issue on [GitHub Issues](https://github.com/yourusername/tourticket/issues).

---

Made with ❤️ by Ranjit Rajput
