// Admin Dashboard Test Data and API Endpoints
// This file demonstrates the expected API structure for the admin dashboard

const adminAPIEndpoints = {
  // Get admin statistics
  GET_ADMIN_STATS: '/admin/stats',
  
  // User Management
  GET_USERS: '/admin/users',
  GET_USER_BY_ID: '/admin/users/:id',
  UPDATE_USER: '/admin/users/:id',
  BLOCK_USER: '/admin/users/:id/block',
  UNBLOCK_USER: '/admin/users/:id/unblock',
  DELETE_USER: '/admin/users/:id/delete',
  
  // Worker Verification
  GET_WORKERS_FOR_VERIFICATION: '/admin/workers/verification',
  VERIFY_WORKER: '/admin/workers/:id/verify',
  REVOKE_VERIFICATION: '/admin/workers/:id/revoke',
  
  // Job Management
  GET_ALL_JOBS: '/admin/jobs',
  GET_JOB_BY_ID: '/admin/jobs/:id',
  UPDATE_JOB: '/admin/jobs/:id',
  CLOSE_JOB: '/admin/jobs/:id/close',
  REOPEN_JOB: '/admin/jobs/:id/reopen',
  DELETE_JOB: '/admin/jobs/:id/delete',
  FLAG_JOB: '/admin/jobs/:id/flag'
};

// Mock Data Structure Examples
const mockAdminStats = {
  totalUsers: 15420,
  totalWorkers: 12350,
  totalEmployers: 3070,
  verifiedWorkers: 8920,
  pendingApprovals: 145,
  activeJobs: 2340,
  flaggedJobs: 23
};

const mockUsers = [
  {
    _id: '1',
    name: 'Raj Kumar',
    email: 'raj.kumar@email.com',
    phone: '+91 9876543210',
    role: 'worker',
    status: 'active',
    verified: true,
    createdAt: '2024-01-15',
    location: 'Mumbai, Maharashtra',
    skills: ['Construction', 'Painting'],
    experience: '5 years'
  },
  {
    _id: '2',
    name: 'Amit Sharma',
    email: 'amit.sharma@company.com',
    phone: '+91 9876543211',
    role: 'employer',
    status: 'active',
    verified: true,
    createdAt: '2024-01-20',
    location: 'Delhi, NCR',
    company: 'BuildTech Solutions'
  },
  {
    _id: '3',
    name: 'Suresh Patel',
    email: 'suresh.patel@email.com',
    phone: '+91 9876543212',
    role: 'worker',
    status: 'pending',
    verified: false,
    createdAt: '2024-02-01',
    location: 'Ahmedabad, Gujarat',
    idProof: 'aadhar',
    idNumber: 'XXXX-XXXX-XXXX-1234'
  }
];

const mockJobs = [
  {
    _id: '1',
    title: 'Construction Worker Needed',
    category: 'Construction',
    employer: 'BuildTech Solutions',
    employerId: '2',
    location: 'Mumbai, Maharashtra',
    wage: '₹800/day',
    status: 'active',
    flagged: false,
    applicants: 12,
    createdAt: '2024-02-10',
    description: 'Looking for experienced construction workers for a commercial project'
  },
  {
    _id: '2',
    title: 'Plumbing Repair Work',
    category: 'Plumbing',
    employer: 'QuickFix Services',
    employerId: '5',
    location: 'Delhi, NCR',
    wage: '₹1200/day',
    status: 'flagged',
    flagged: true,
    flagReason: 'Suspicious wage rate',
    applicants: 8,
    createdAt: '2024-02-12',
    description: 'Urgent plumbing repair work required'
  }
];

// Backend Implementation Guide
/*
To implement the admin dashboard backend, you'll need to create the following:

1. Admin Model/Schema:
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String, // hashed
  role: 'admin',
  permissions: [String], // optional for granular permissions
  createdAt: Date,
  lastLogin: Date,
  isActive: Boolean
}

2. Admin Middleware:
- Verify admin role before allowing access to admin routes
- Log admin actions for audit trail
- Rate limiting for admin endpoints

3. API Controllers:

GET /admin/stats
- Returns platform statistics
- Cache for 5 minutes to improve performance

GET /admin/users?role=worker&status=active
- Paginated user listing
- Support filtering and search
- Include user counts

POST /admin/users/:id/block
- Block user account
- Send notification email
- Log action

POST /admin/workers/:id/verify
- Verify worker identity
- Update worker status
- Send confirmation email

GET /admin/jobs?status=flagged
- List all jobs with filtering
- Include employer details
- Show flag reasons

4. Database Indexes:
- Users: role, status, verified, createdAt
- Jobs: status, flagged, createdAt
- Workers: verification status, skills

5. Security Considerations:
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF tokens
- Rate limiting
- Audit logging

6. Email Templates:
- User blocked notification
- Worker verification confirmation
- Job flagged notification
- Account action summaries
*/

export {
  adminAPIEndpoints,
  mockAdminStats,
  mockUsers,
  mockJobs
};
