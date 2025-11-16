# ⚡ Quick Start Guide

Get your LMS up and running in 5 minutes!

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Set Up Environment Variables

#### Backend (`server/.env`)
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret_key
CURRENCY=USD
```

#### Frontend (`client/.env`)
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_BACKEND_URL=http://localhost:5000
VITE_CURRENCY=$
```

### 3. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run server
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### 4. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

## 📋 Service Setup Checklist

- [ ] Clerk Account Created
- [ ] MongoDB Atlas Account Created (or Local MongoDB Running)
- [ ] Stripe Account Created (Test Mode)
- [ ] Cloudinary Account Created
- [ ] All Environment Variables Set

## 🎯 First Steps

1. **Sign Up** - Create an account via Clerk
2. **Become Educator** - Click "Become Educator" button
3. **Create Course** - Add your first course in Educator Dashboard
4. **Test Enrollment** - Enroll in a course as a student
5. **Test Payment** - Complete a test payment with Stripe

## 📖 Full Documentation

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## 🆘 Troubleshooting

- **Can't connect to MongoDB?** Check your connection string and IP whitelist
- **Auth not working?** Verify Clerk keys and webhook setup
- **Payment failing?** Check Stripe keys and webhook configuration
- **Image upload failing?** Verify Cloudinary credentials

For more help, see the [SETUP.md](./SETUP.md) troubleshooting section.


