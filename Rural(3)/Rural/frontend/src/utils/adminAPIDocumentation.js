// Admin Dashboard API Documentation
// This file documents all API endpoints required for the admin dashboard

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// API ENDPOINTS FOR ADMIN DASHBOARD
export const ADMIN_ENDPOINTS = {
  // Get platform statistics
  GET_STATS: '/admin/stats',
  
  // User Management
  GET_USERS: '/admin/users',
  USER_ACTION: '/admin/users/:id/:action',
  
  // Worker Verification
  GET_WORKERS_VERIFICATION: '/admin/workers/verification',
  VERIFY_WORKER: '/admin/workers/:id/verify',
  
  // Job Management
  GET_JOBS: '/admin/jobs',
  JOB_ACTION: '/admin/jobs/:id/:action'
};

// Expected Response Formats
export const RESPONSE_FORMATS = {
  // Statistics response
  STATS: {
    success: true,
    stats: {
      totalUsers: 15420,
      totalWorkers: 12350,
      totalEmployers: 3070,
      verifiedWorkers: 8920,
      pendingApprovals: 145,
      activeJobs: 2340,
      flaggedJobs: 23
    }
  },
  
  // Users list response
  USERS: {
    success: true,
    users: [
      {
        _id: 'user_id',
        name: 'User Name',
        email: 'user@example.com',
        phone: '+91 9876543210',
        role: 'worker' || 'employer',
        status: 'active' || 'pending' || 'blocked',
        verified: true || false,
        createdAt: '2024-01-15T00:00:00.000Z',
        location: 'City, State',
        // Worker specific
        skills: ['Construction', 'Painting'],
        experience: '5 years',
        idProof: 'aadhar',
        idNumber: 'XXXX-XXXX-XXXX-1234',
        // Employer specific
        company: 'Company Name',
        businessType: 'Construction'
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 15420,
      pages: 1542
    }
  },
  
  // Workers verification response
  WORKERS_VERIFICATION: {
    success: true,
    workers: [
      {
        _id: 'worker_id',
        name: 'Worker Name',
        email: 'worker@example.com',
        phone: '+91 9876543210',
        role: 'worker',
        status: 'pending' || 'verified' || 'rejected',
        verified: false,
        idProof: 'aadhar',
        idNumber: 'XXXX-XXXX-XXXX-1234',
        skills: ['Construction', 'Painting'],
        experience: '5 years',
        createdAt: '2024-02-05T00:00:00.000Z',
        location: 'City, State',
        idProofUrl: 'https://example.com/id-proof.jpg',
        certificateUrl: 'https://example.com/certificate.jpg'
      }
    ]
  },
  
  // Jobs list response
  JOBS: {
    success: true,
    jobs: [
      {
        _id: 'job_id',
        title: 'Job Title',
        category: 'Construction' || 'Plumbing' || 'Electrical',
        employer: {
          _id: 'employer_id',
          name: 'Company Name',
          email: 'company@example.com'
        },
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          address: 'Full Address'
        },
        wage: {
          type: 'daily' || 'hourly' || 'fixed',
          amount: 800,
          currency: 'INR'
        },
        status: 'active' || 'closed' || 'flagged',
        flagged: true || false,
        flagReason: 'Suspicious wage rate',
        applicants: 12,
        createdAt: '2024-02-10T00:00:00.000Z',
        description: 'Job description'
      }
    ]
  }
};

// Database Schema Requirements
export const DATABASE_SCHEMAS = {
  USER: {
    _id: 'ObjectId',
    name: 'String',
    email: 'String',
    phone: 'String',
    password: 'String', // hashed
    role: 'worker|employer|admin',
    status: 'active|pending|blocked',
    verified: 'Boolean',
    createdAt: 'Date',
    updatedAt: 'Date',
    location: {
      city: 'String',
      state: 'String',
      address: 'String',
      coordinates: {
        latitude: 'Number',
        longitude: 'Number'
      }
    },
    // Worker specific
    skills: ['String'],
    experience: 'String',
    idProof: 'String',
    idNumber: 'String',
    idProofUrl: 'String',
    certificateUrl: 'String',
    // Employer specific
    company: 'String',
    businessType: 'String'
  },
  
  JOB: {
    _id: 'ObjectId',
    title: 'String',
    category: 'String',
    description: 'String',
    employer: 'ObjectId', // Reference to Users
    location: {
      city: 'String',
      state: 'String',
      address: 'String',
      coordinates: {
        latitude: 'Number',
        longitude: 'Number'
      }
    },
    wage: {
      type: 'String',
      amount: 'Number',
      currency: 'String'
    },
    status: 'active|closed|flagged',
    flagged: 'Boolean',
    flagReason: 'String',
    applicants: ['ObjectId'], // Reference to Users
    createdAt: 'Date',
    updatedAt: 'Date'
  }
};

export default {
  BASE_URL,
  ADMIN_ENDPOINTS,
  RESPONSE_FORMATS,
  DATABASE_SCHEMAS
};
