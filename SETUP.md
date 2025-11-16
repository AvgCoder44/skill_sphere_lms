# 🚀 LMS Project Setup Guide

This guide will help you set up the Learning Management System (LMS) project locally.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Cloud) or Local MongoDB
- **Git** - [Download](https://git-scm.com/)

## 🔑 Required Accounts

You'll need accounts for the following services:

1. **Clerk** - For authentication - [Sign Up](https://clerk.com/)
2. **Stripe** - For payments - [Sign Up](https://stripe.com/)
3. **Cloudinary** - For image storage - [Sign Up](https://cloudinary.com/)
4. **MongoDB Atlas** - For database (or use local MongoDB) - [Sign Up](https://www.mongodb.com/cloud/atlas)

---

## 📦 Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd lms
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../client
npm install
```

---

## ⚙️ Environment Configuration

### Backend Environment Variables

1. Navigate to the `server` directory
2. Create a `.env` file (copy from `.env.example`)
3. Fill in the following variables:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
CLERK_WEBHOOK_SECRET=whsec_your_clerk_webhook_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret_key
CURRENCY=USD
```

### Frontend Environment Variables

1. Navigate to the `client` directory
2. Create a `.env` file (copy from `.env.example`)
3. Fill in the following variables:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
VITE_BACKEND_URL=http://localhost:5000
VITE_CURRENCY=$
```

---

## 🔧 Service Setup Instructions

### 1. Clerk Setup (Authentication)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Copy the **Publishable Key** → Use in `client/.env`
4. Copy the **Secret Key** → Use in `server/.env`
5. Set up Webhooks:
   - Go to Webhooks section
   - Add endpoint: `http://localhost:5000/clerk` (or your production URL)
   - Subscribe to events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Webhook Secret** → Use in `server/.env`

### 2. MongoDB Setup

**Option A: MongoDB Atlas (Cloud - Recommended)**

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net`
6. Add `/lms` at the end: `mongodb+srv://username:password@cluster.mongodb.net/lms`

**Option B: Local MongoDB**

1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/lms`

### 3. Stripe Setup (Payments)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Toggle to **Test Mode**
3. Copy **Secret Key** → Use in `server/.env`
4. Set up Webhooks:
   - Go to Developers → Webhooks
   - Add endpoint: `http://localhost:5000/stripe` (or your production URL)
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the **Webhook Signing Secret** → Use in `server/.env`
5. Copy **Publishable Key** → Use in `client/.env` (if needed for frontend)

### 4. Cloudinary Setup (Image Storage)

1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Copy your **Cloud Name** → Use in `server/.env`
3. Copy your **API Key** → Use in `server/.env`
4. Copy your **API Secret** → Use in `server/.env`

---

## 🚀 Running the Application

### Start Backend Server

```bash
cd server
npm run server  # Development mode with nodemon (auto-restart)
# OR
npm start       # Production mode
```

The backend will run on `http://localhost:5000`

### Start Frontend Development Server

Open a new terminal:

```bash
cd client
npm run dev
```

The frontend will run on `http://localhost:5173` (or another port if 5173 is busy)

---

## 🧪 Testing the Setup

### 1. Test Backend

Visit `http://localhost:5000` - You should see "API Working"

### 2. Test Frontend

Visit `http://localhost:5173` - You should see the LMS homepage

### 3. Test Authentication

1. Click "Create Account" on the frontend
2. Sign up with Clerk
3. Verify user is created in MongoDB

### 4. Test Course Creation (Educator)

1. Sign in to your account
2. Click "Become Educator"
3. Navigate to Educator Dashboard
4. Try creating a course

---

## 📁 Project Structure

```
lms/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React Context
│   │   └── assets/        # Images, icons
│   └── .env               # Frontend environment variables
│
└── server/                # Node.js Backend
    ├── configs/           # Configuration files
    ├── controllers/       # Request handlers
    ├── models/            # MongoDB models
    ├── routes/            # API routes
    ├── middlewares/       # Custom middlewares
    └── .env               # Backend environment variables
```

---

## 🐛 Troubleshooting

### Issue: MongoDB Connection Failed

**Solution:**
- Check MongoDB connection string
- Verify IP address is whitelisted (MongoDB Atlas)
- Ensure MongoDB service is running (local)

### Issue: Clerk Authentication Not Working

**Solution:**
- Verify Clerk keys are correct
- Check webhook endpoint is accessible
- Ensure webhook secret matches

### Issue: Stripe Payment Fails

**Solution:**
- Verify Stripe keys are in test mode
- Check webhook endpoint is accessible
- Ensure webhook secret matches

### Issue: Image Upload Fails

**Solution:**
- Verify Cloudinary credentials
- Check image file size limits
- Ensure Multer is configured correctly

### Issue: Port Already in Use

**Solution:**
- Change PORT in `server/.env`
- Kill the process using the port:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:5000 | xargs kill
  ```

---

## 📚 Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)
- [React Documentation](https://react.dev/)
- [Express Documentation](https://expressjs.com/)

---

## 🎯 Next Steps

1. Create your first course as an educator
2. Test the enrollment flow
3. Test payment processing
4. Customize the UI/UX
5. Deploy to production (Vercel, Railway, etc.)

---

## 📝 Notes

- Always use test mode for Stripe during development
- Use test keys for Clerk during development
- Never commit `.env` files to version control
- Keep your secrets secure

---

## 🤝 Support

If you encounter any issues during setup, please check:
1. All environment variables are set correctly
2. All services are properly configured
3. Dependencies are installed correctly
4. Ports are not in use

For more help, refer to the main [README.md](./README.md) file.


