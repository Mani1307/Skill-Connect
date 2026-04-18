// Admin Credentials Setup
// This file contains admin credentials for testing the admin dashboard

const adminCredentials = {
  // Default admin account
  email: 'admin@skillconnect.com',
  password: 'admin123',
  name: 'Admin User',
  role: 'admin'
};

// Additional test admin accounts
const testAdmins = [
  {
    email: 'superadmin@skillconnect.com',
    password: 'super123',
    name: 'Super Admin',
    role: 'admin'
  },
  {
    email: 'moderator@skillconnect.com',
    password: 'mod123',
    name: 'Moderator',
    role: 'admin'
  }
];

// Function to check if credentials are valid
const validateAdminCredentials = (email, password) => {
  if (email === adminCredentials.email && password === adminCredentials.password) {
    return adminCredentials;
  }
  
  const testAdmin = testAdmins.find(admin => 
    admin.email === email && admin.password === password
  );
  
  return testAdmin || null;
};

// Function to create admin user in localStorage (for testing)
const createAdminInStorage = () => {
  const adminUser = {
    _id: 'admin_001',
    name: adminCredentials.name,
    email: adminCredentials.email,
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  
  localStorage.setItem('user', JSON.stringify(adminUser));
  localStorage.setItem('token', 'admin_token_' + Date.now());
  
  return adminUser;
};

// Login function for admin
const adminLogin = async (email, password) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const admin = validateAdminCredentials(email, password);
  
  if (admin) {
    const adminUser = createAdminInStorage();
    return {
      success: true,
      user: adminUser,
      message: 'Admin login successful'
    };
  }
  
  return {
    success: false,
    message: 'Invalid admin credentials'
  };
};

// Export for use in components
export {
  adminCredentials,
  testAdmins,
  validateAdminCredentials,
  adminLogin,
  createAdminInStorage
};

// Auto-setup admin credentials on page load (for testing)
if (typeof window !== 'undefined') {
  console.log('🔑 Admin Credentials:');
  console.log('Email:', adminCredentials.email);
  console.log('Password:', adminCredentials.password);
  console.log('\n📋 Additional Test Admins:');
  testAdmins.forEach((admin, index) => {
    console.log(`${index + 1}. Email: ${admin.email}, Password: ${admin.password}`);
  });
}
