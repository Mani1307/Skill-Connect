// Admin Dashboard API Documentation
// This file documents all API endpoints required for the admin dashboard

// ==================== BASE API CONFIGURATION ====================
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// ==================== AUTHENTICATION HEADERS ====================
// All admin requests must include:
// Authorization: Bearer <admin_token>
// Content-Type: application/json

// ==================== ADMIN DASHBOARD API ENDPOINTS ====================

// 1. GET ADMIN STATISTICS
// URL: GET /admin/stats
// Description: Get platform statistics for admin dashboard
// Response:
{
  "success": true,
  "stats": {
    "totalUsers": 15420,
    "totalWorkers": 12350,
    "totalEmployers": 3070,
    "verifiedWorkers": 8920,
    "pendingApprovals": 145,
    "activeJobs": 2340,
    "flaggedJobs": 23
  }
}

// 2. GET ALL USERS (User Management)
// URL: GET /admin/users?role={role}&search={search}&page={page}&limit={limit}
// Parameters:
// - role: "all" | "worker" | "employer" (optional)
// - search: string to search by name/email/phone (optional)
// - page: page number (optional, default: 1)
// - limit: items per page (optional, default: 10)
// Response:
{
  "success": true,
  "users": [
    {
      "_id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "phone": "+91 9876543210",
      "role": "worker" | "employer",
      "status": "active" | "pending" | "blocked",
      "verified": true | false,
      "createdAt": "2024-01-15T00:00:00.000Z",
      "location": "City, State",
      // Worker specific fields
      "skills": ["Construction", "Painting"],
      "experience": "5 years",
      "idProof": "aadhar" | "voter" | "pan",
      "idNumber": "XXXX-XXXX-XXXX-1234",
      // Employer specific fields
      "company": "Company Name",
      "businessType": "Construction" | "Manufacturing"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15420,
    "pages": 1542
  }
}

// 3. USER ACTIONS
// URL: POST /admin/users/{userId}/{action}
// Actions: block, unblock, delete, approve, reject
// Response:
{
  "success": true,
  "message": "User blocked successfully"
}

// 4. GET WORKERS FOR VERIFICATION
// URL: GET /admin/workers/verification?status={status}&page={page}&limit={limit}
// Parameters:
// - status: "all" | "pending" | "verified" | "rejected" (optional)
// Response:
{
  "success": true,
  "workers": [
    {
      "_id": "worker_id",
      "name": "Worker Name",
      "email": "worker@example.com",
      "phone": "+91 9876543210",
      "role": "worker",
      "status": "pending" | "verified" | "rejected",
      "verified": false,
      "idProof": "aadhar",
      "idNumber": "XXXX-XXXX-XXXX-1234",
      "skills": ["Construction", "Painting"],
      "experience": "5 years",
      "createdAt": "2024-02-05T00:00:00.000Z",
      "location": "City, State",
      "idProofUrl": "https://example.com/id-proof.jpg",
      "certificateUrl": "https://example.com/certificate.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 145,
    "pages": 15
  }
}

// 5. WORKER VERIFICATION ACTIONS
// URL: POST /admin/workers/{workerId}/verify
// Body:
{
  "action": "approve" | "reject" | "revoke",
  "reason": "Optional reason for rejection/revocation"
}
// Response:
{
  "success": true,
  "message": "Worker verified successfully"
}

// 6. GET ALL JOBS (Job Management)
// URL: GET /admin/jobs?status={status}&search={search}&page={page}&limit={limit}
// Parameters:
// - status: "all" | "active" | "closed" | "flagged" (optional)
// Response:
{
  "success": true,
  "jobs": [
    {
      "_id": "job_id",
      "title": "Job Title",
      "category": "Construction" | "Plumbing" | "Electrical",
      "employer": {
        "_id": "employer_id",
        "name": "Company Name",
        "email": "company@example.com"
      },
      "location": {
        "city": "Mumbai",
        "state": "Maharashtra",
        "address": "Full Address"
      },
      "wage": {
        "type": "daily" | "hourly" | "fixed",
        "amount": 800,
        "currency": "INR"
      },
      "status": "active" | "closed" | "flagged",
      "flagged": true | false,
      "flagReason": "Suspicious wage rate",
      "applicants": 12,
      "createdAt": "2024-02-10T00:00:00.000Z",
      "description": "Job description"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2340,
    "pages": 234
  }
}

// 7. JOB ACTIONS
// URL: POST /admin/jobs/{jobId}/{action}
// Actions: close, reopen, delete, flag, unflag
// Body for flag action:
{
  "reason": "Reason for flagging"
}
// Response:
{
  "success": true,
  "message": "Job closed successfully"
}

// ==================== DATABASE SCHEMA REQUIREMENTS ====================

// USERS COLLECTION
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  password: String, // hashed
  role: "worker" | "employer" | "admin",
  status: "active" | "pending" | "blocked",
  verified: Boolean,
  createdAt: Date,
  updatedAt: Date,
  location: {
    city: String,
    state: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // Worker specific fields
  skills: [String],
  experience: String,
  idProof: String,
  idNumber: String,
  idProofUrl: String,
  certificateUrl: String,
  // Employer specific fields
  company: String,
  businessType: String
}

// JOBS COLLECTION
{
  _id: ObjectId,
  title: String,
  category: String,
  description: String,
  employer: ObjectId, // Reference to Users collection
  location: {
    city: String,
    state: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  wage: {
    type: String,
    amount: Number,
    currency: String
  },
  status: "active" | "closed" | "flagged",
  flagged: Boolean,
  flagReason: String,
  applicants: [ObjectId], // Reference to Users collection
  createdAt: Date,
  updatedAt: Date
}

// ==================== MIDDLEWARE REQUIREMENTS ====================

// 1. AUTHENTICATION MIDDLEWARE
// - Verify JWT token
// - Check if user role is 'admin'
// - Attach admin user to request object

// 2. RATE LIMITING
// - Apply stricter rate limits to admin endpoints
// - Prevent brute force attacks

// 3. AUDIT LOGGING
// - Log all admin actions
// - Track: admin_id, action, target_id, timestamp, ip_address

// ==================== ERROR RESPONSES ====================

// Unauthorized (401)
{
  "success": false,
  "message": "Unauthorized access"
}

// Forbidden (403)
{
  "success": false,
  "message": "Admin access required"
}

// Not Found (404)
{
  "success": false,
  "message": "User/Job not found"
}

// Validation Error (400)
{
  "success": false,
  "message": "Invalid input data",
  "errors": ["field1 is required", "field2 is invalid"]
}

// Server Error (500)
{
  "success": false,
  "message": "Internal server error"
}

export default {
  BASE_URL,
  ENDPOINTS: {
    STATS: '/admin/stats',
    USERS: '/admin/users',
    USER_ACTION: '/admin/users/:id/:action',
    WORKERS_VERIFICATION: '/admin/workers/verification',
    WORKER_VERIFY: '/admin/workers/:id/verify',
    JOBS: '/admin/jobs',
    JOB_ACTION: '/admin/jobs/:id/:action'
  }
};
