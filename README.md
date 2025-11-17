<div align="center">

# 🎓 SkillSphere

A modern, full-stack e-learning platform built with the MERN stack

[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

<br /><hr /><br />

<div align="center">

## LIVE - DEMO 🌐
  
VISIT 👉 [https://skillspherename.vercel.app](https://skillspherename.vercel.app)
</div>

<br/><hr/><br/>

## 🌟 Features

### For Students
- 📚 Browse and enroll in various courses
- 💳 Secure payment processing with Razorpay
- 📝 Real-time learning progress tracking
- ⏱️ Auto-completion of lectures based on watch time
- ⭐ Rate and review courses
- 👤 Personalized user dashboard
- 🎯 Access to enrolled course content
- 🔍 Search and filter courses

### For Educators
- 📝 Create and edit courses
- 📊 Track student enrollments
- 💰 Manage course pricing and discounts
- 📈 View analytics and earnings
- 🖼️ Upload course thumbnails via Cloudinary
- 📹 Organize course content and materials
- ✏️ Edit existing courses with ease

### General Features
- 🔐 Secure authentication with Clerk
- 💫 Modern and responsive UI
- 🌐 Real-time updates
- 📱 Mobile-friendly design
- 🔍 Advanced course search and filtering
- 🎨 Beautiful course cards and layout

## 🛠️ Technology Stack

### Frontend
- React.js with Vite for fast development
- React Router for navigation
- Tailwind CSS for styling
- Clerk for authentication UI components
- Razorpay Checkout for payment processing
- React YouTube for video playback
- Axios for API calls

### Backend
- Node.js & Express.js
- MongoDB with Mongoose ODM
- Clerk for user authentication
- Cloudinary for image management
- Razorpay for payment processing
- Webhook handling for Clerk and Razorpay

### Security Features
- JWT token authentication
- Secure webhook handling
- Environment variable protection
- Input validation and sanitization

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (MongoDB Atlas recommended)
- Clerk Account
- Razorpay Account
- Cloudinary Account

### Installation

1. Clone the repository
```bash
git clone https://github.com/AvgCoder44/SkillSphere.git
cd SkillSphere
```

2. Install dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

3. Set up environment variables

Create `.env` files in both client and server directories:

```env
# Server .env
PORT=5000
MONGODB_URI=your_mongodb_uri
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
CURRENCY=INR
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

```env
# Client .env
VITE_BACKEND_URL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

4. Start the application
```bash
# Start backend server
cd server
npm start

# Start frontend in a new terminal
cd client
npm run dev
```

## 📱 Application Structure

```
SkillSphere/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   ├── assets/        # Images and static assets
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
└── server/                # Backend Node.js application
    ├── configs/           # Configuration files
    ├── controllers/       # Request handlers
    ├── models/           # MongoDB models
    ├── routes/           # API routes
    └── utils/            # Helper functions
```

## 🔒 Security

- Authentication handled by Clerk
- Secure payment processing with Razorpay
- Protected API endpoints with Clerk middleware
- Secure file uploads with Cloudinary
- Input validation and sanitization
- Protected environment variables
- Webhook signature verification for Clerk and Razorpay

## 🚀 Deployment

- **Frontend**: Deployed on [Vercel](https://vercel.com)
- **Backend**: Deployed on [Render](https://render.com)
- **Database**: MongoDB Atlas

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
Made with ❤️ by <b>SkillSphere - Vardhan</b>
</div>