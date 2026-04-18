const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Worker = require('../models/Worker');
const Job = require('../models/Job');
const { auth } = require('../middleware/auth');
const locationService = require('../utils/locationService');
/**
 * @route   POST /api/location/geocode
 * @desc    Geocode an address to get coordinates
 * @access  Public
 */
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }
    const coordinates = await locationService.geocodeAddress(address);
    if (!coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Could not geocode address. Please check and try again.'
      });
    }
    res.json({
      success: true,
      data: coordinates
    });
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({
      success: false,
      message: 'Error geocoding address',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/location/nearby-workers/:jobId
 * @desc    Get workers near a job location
 * @access  Private (Employer only)
 */
router.get('/nearby-workers/:jobId', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.employer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this job'
      });
    }

    if (!job.location.coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Job location coordinates not available'
      });
    }
    // Fetch all workers with the required skills
    const workers = await Worker.find({
      skills: { $in: job.requiredSkills },
      isActive: true
    })
    .select('name email phone skills experience rating location profileImage')
    .lean();
    // Find nearby workers
    const nearbyWorkers = locationService.findNearbyWorkers(
      job.location.coordinates,
      workers
    );

    // Enrich with additional data
    const enrichedWorkers = nearbyWorkers.map(worker => ({
      _id: worker._id,
      name: worker.name,
      email: worker.email,
      phone: worker.phone,
      skills: worker.skills,
      experience: worker.experience,
      rating: worker.rating,
      profileImage: worker.profileImage,
      location: worker.location,
      distance: worker.distance,
      distanceText: `${worker.distance} km away`
    }));

    res.json({
      success: true,
      data: {
        jobId: job._id,
        jobLocation: job.location,
        workersFound: enrichedWorkers.length,
        workers: enrichedWorkers,
        searchRadius: process.env.OSM_SEARCH_RADIUS_KM || 15
      }
    });
  } catch (error) {
    console.error('Nearby workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby workers',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/location/distance
 * @desc    Calculate distance between two coordinates
 * @access  Public
 */
router.get('/distance', async (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.query;

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return res.status(400).json({
        success: false,
        message: 'All coordinates are required (lat1, lon1, lat2, lon2)'
      });
    }

    const distance = locationService.calculateDistance(
      parseFloat(lat1),
      parseFloat(lon1),
      parseFloat(lat2),
      parseFloat(lon2)
    );

    res.json({
      success: true,
      data: {
        distanceKm: parseFloat(distance.toFixed(2)),
        distanceMeters: parseInt(distance * 1000)
      }
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating distance',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/location/travel-time
 * @desc    Get travel time between two locations
 * @access  Public
 */
router.get('/travel-time', async (req, res) => {
  try {
    const { originLat, originLon, destLat, destLon } = req.query;

    if (!originLat || !originLon || !destLat || !destLon) {
      return res.status(400).json({
        success: false,
        message: 'All coordinates are required'
      });
    }

    const travelData = await locationService.getTravelTime(
      { latitude: parseFloat(originLat), longitude: parseFloat(originLon) },
      { latitude: parseFloat(destLat), longitude: parseFloat(destLon) }
    );

    if (!travelData) {
      return res.status(400).json({
        success: false,
        message: 'Could not calculate travel time'
      });
    }

    res.json({
      success: true,
      data: travelData
    });
  } catch (error) {
    console.error('Travel time error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating travel time',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/location/update-coordinates
 * @desc    Update user location coordinates (for workers)
 * @access  Private
 */
router.post('/update-coordinates', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!locationService.isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        'location.coordinates': { latitude, longitude }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        location: user.location
      }
    });
  } catch (error) {
    console.error('Update coordinates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/location/reverse-geocode
 * @desc    Get address details from coordinates using OpenStreetMap
 * @access  Public
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const addressData = await locationService.reverseGeocode(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    if (!addressData) {
      return res.status(400).json({
        success: false,
        message: 'Could not reverse geocode coordinates'
      });
    }

    res.json({
      success: true,
      data: addressData
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reverse geocoding coordinates',
      error: error.message
    });
  }
});

module.exports = router;
