# SkillConnect - Daily Wage Worker Platform

A MERN stack platform connecting daily wage workers (painters, electricians, masons, helpers, etc.) with employers through intelligent matching, transparent pricing, and fair job distribution.

## Features

### For Workers
- **Profile Management**: Create profiles based on skills, experience, and ratings
- **Job Discovery**: Find jobs matching your skills and location
- **Transparent Earnings**: Track work history and earnings
- **Fair Ratings**: Build reputation through verified work history
- **Real-time Notifications**: Get notified of matching jobs instantly

### For Employers
- **Smart Matching**: AI-powered worker recommendations based on job requirements
- **Cost Estimation**: Automatic wage calculation with detailed breakdown
- **Verified Workers**: Hire based on experience, ratings, and work history
- **Job Management**: Post, manage, and track job progress
- **Expert Teams**: Option for expert-led group work

### Key Capabilities
- Experience-based matching (not certificate-dependent)
- Transparent wage calculation system
- Real-time job matching algorithm
- Work history tracking and analytics
- Rating and review system
- Single-worker and group job support

## Tech Stack

**Frontend:**
- React.js
- React Router
- Axios
- Socket.IO Client
- Context API for state management

**Backend:**
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Socket.IO for real-time features
- bcrypt for password hashing

## Project Structure

```
skillconnect/
├── backend/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication & validation
│   └── server.js        # Entry point
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/  # Reusable components
│       ├── pages/       # Page components
│       ├── context/     # Context providers
│       └── utils/       # Helper functions
└── package.json
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skillconnect
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRE=30d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

4. Start the backend server:
```bash
npm run dev
```

Backend will run on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

Frontend will run on http://localhost:3000

### Run Complete Application

From the root directory, you can run both servers:
```bash
npm run dev-all
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Workers
- `GET /api/workers/profile` - Get worker profile
- `PUT /api/workers/profile` - Update worker profile
- `GET /api/workers/available-jobs` - Get available jobs
- `POST /api/workers/apply/:jobId` - Apply for job
- `GET /api/workers/earnings` - Get earnings summary
- `GET /api/workers/search` - Search workers

### Employers
- `GET /api/employers/profile` - Get employer profile
- `PUT /api/employers/profile` - Update employer profile
- `GET /api/employers/dashboard` - Get dashboard stats

### Jobs
- `POST /api/jobs` - Create job (with auto wage calculation)
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `POST /api/jobs/:id/assign` - Assign workers
- `POST /api/jobs/:id/complete` - Mark job complete
- `POST /api/jobs/estimate` - Get cost estimation
- `GET /api/jobs/:id/matched-workers` - Get matched workers

### Ratings
- `POST /api/ratings` - Create rating
- `GET /api/ratings/user/:userId` - Get user ratings
- `GET /api/ratings/job/:jobId` - Get job ratings

### Work History
- `GET /api/work-history` - Get work history
- `PUT /api/work-history/:id/attendance` - Update attendance
- `PUT /api/work-history/:id/completion` - Update completion
- `GET /api/work-history/analytics/worker/:workerId` - Get analytics

## Key Features Explained

### Intelligent Matching Algorithm
Workers are matched based on:
- Skill compatibility (40% weight)
- Experience level (30% weight)
- Completed jobs (20% weight)
- Expert level (10% weight)
- Location proximity

### Transparent Wage Calculation
Automatic calculation considers:
- Job category base rates
- Worker experience and expertise
- Duration and complexity
- Expert guidance requirements
- Number of workers needed

### Rating System
Comprehensive rating with:
- Overall rating (1-5 stars)
- Category-specific ratings (quality, punctuality, communication, etc.)
- Written reviews
- Recommendation status

## Usage Guide

### For Workers:
1. Register as a worker and complete your profile
2. Add skills, experience, and location
3. Browse available jobs or wait for notifications
4. Apply for jobs with proposed rates
5. Complete work and build your rating

### For Employers:
1. Register as an employer
2. Post a job with detailed requirements
3. Review automatically matched workers
4. Accept applications or directly assign workers
5. Track progress and make payments
6. Rate workers after job completion

## Development Notes

- MongoDB connection required before starting the backend
- Socket.IO enables real-time notifications
- JWT tokens expire in 30 days (configurable)
- All API routes are prefixed with `/api`
- CORS is enabled for frontend-backend communication

## Future Enhancements

- Payment gateway integration
- Multi-language support
- Mobile applications (React Native)
- Advanced analytics dashboard
- Worker certifications and badges
- GPS-based location tracking
- Video profile introductions
- In-app messaging system

## License

This project is open source and available for educational purposes.

## Support

For issues and questions, please create an issue in the repository.
