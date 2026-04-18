const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillconnect');

// Import User model
const User = require('./backend/models/User');

async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('Test user already exists:', existingUser.email);
      console.log('User ID:', existingUser._id);
      console.log('Role:', existingUser.role);
      return;
    }

    // Create a new test user
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      password: 'password123',
      role: 'worker',
      location: {
        type: 'Point',
        coordinates: [-73.935242, 40.730610] // New York coordinates
      }
    });

    await user.save();
    console.log('Test user created successfully!');
    console.log('Email:', user.email);
    console.log('Password:', 'password123');
    console.log('User ID:', user._id);
  } catch (error) {
    console.error('Error creating test user:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

createTestUser();