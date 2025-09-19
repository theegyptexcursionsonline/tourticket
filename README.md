
# Egypt Excursions Online

Welcome to Egypt Excursions Online, a comprehensive tour booking platform built with the latest web technologies. This application provides a seamless experience for users to discover, book, and manage their travel excursions, while offering a powerful administration panel for tour operators to manage their offerings.

## Features

  - **User Authentication**: Secure sign-up and login functionality for users.
  - **Tour Discovery**: Browse and search for tours by destination, category, or interest.
  - **Detailed Tour Pages**: View comprehensive information about each tour, including itineraries, inclusions, and pricing.
  - **Booking System**: An easy-to-use booking system with date selection, participant information, and add-on options.
  - **Shopping Cart**: Add multiple tours to the cart before proceeding to checkout.
  - **Wishlist**: Save tours for later consideration.
  - **User Dashboard**: Registered users can view their booking history and manage their profile.
  - **Admin Panel**: A feature-rich administration panel for managing tours, bookings, destinations, categories, and more.
  - **Stripe Integration**: Secure payment processing is handled by Stripe.
  - **Responsive Design**: The application is fully responsive and works on all devices.

## Tech Stack

  - **Framework**: [Next.js](https://nextjs.org/)
  - **Language**: [TypeScript](https://www.typescriptlang.org/)
  - **Styling**: [Tailwind CSS](https://tailwindcss.com/)
  - **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
  - **Authentication**: [JWT](https://jwt.io/)
  - **Payment Processing**: [Stripe](https://stripe.com/)

## Getting Started

### Prerequisites

  - [Node.js](https://nodejs.org/en/) (v18.x or later)
  - [pnpm](https://pnpm.io/)
  - [MongoDB](https://www.mongodb.com/)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/your-repo.git
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Set up your environment variables. Create a `.env.local` file in the root of the project and add the following:
    ```env
    MONGODB_URI=<your_mongodb_uri>
    JWT_SECRET=<your_jwt_secret>
    STRIPE_SECRET_KEY=<your_stripe_secret_key>
    ```
4.  Seed the database with sample data:
    ```bash
    pnpm seed
    ```
5.  Run the development server:
    ```bash
    pnpm dev
    ```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) in your browser to see the result.

## Deployment

This application is ready to be deployed on [Netlify](https://www.netlify.com/).

[](https://www.google.com/search?q=%5Bhttps://app.netlify.com/start/deploy%3Frepository%3Dhttps://github.com/your-username/your-repo%5D\(https://app.netlify.com/start/deploy%3Frepository%3Dhttps://github.com/your-username/your-repo\))

For more information on deploying Next.js applications to Netlify, see the [Next.js on Netlify documentation](https://www.google.com/search?q=https://docs.netlify.com/frameworks/next-js/).
