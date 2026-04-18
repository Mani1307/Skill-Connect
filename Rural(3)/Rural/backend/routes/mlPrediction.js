const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// @route   POST /api/ml/predict-wage
// @desc    Predict wage using Sharmma Mitra ML model
// @access  Private (Employer)
router.post('/predict-wage', async (req, res) => {
  try {
    const { experience, location, jobType, skillLevel, category } = req.body;

    // Validate input
    if (!experience || !location || !jobType || !skillLevel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: experience, location, jobType, skillLevel'
      });
    }

    console.log('🤖 Sharmma Mitra ML Prediction Request:', { experience, location, jobType, skillLevel, category });

    // Prepare data for your ML model - map frontend fields to model fields
    const inputData = {
      experience_years: parseFloat(experience),  // Your model expects 'experience_years'
      location: location,
      job_type: jobType,                           // Your model expects 'job_type'
      skill_level: skillLevel                       // Your model expects 'skill_level'
    };

    console.log('📊 Sending to ML model:', inputData);

    // Call Python ML script with your actual Sharmma Mitra model
    const pythonScript = path.join(__dirname, '../ml_models/wage_predictor.py');
    
    try {
      const result = await callPythonML(pythonScript, inputData);
      
      res.json({
        success: true,
        prediction: {
          predicted_wage: result.predicted_wage,
          confidence: result.confidence || 0.85,
          wage_range: {
            min: result.min_wage,
            max: result.max_wage
          },
          factors: result.factors || [],
          model_used: result.model_used || 'sharmma-mitra-ml'
        }
      });
    } catch (mlError) {
      console.error('❌ Sharmma Mitra ML Model Error:', mlError);
      
      // Fallback to rule-based prediction if ML fails
      const fallbackPrediction = calculateFallbackWage(inputData);
      
      res.json({
        success: true,
        prediction: fallbackPrediction,
        fallback: true,
        error: 'ML model unavailable, using fallback prediction'
      });
    }

  } catch (error) {
    console.error('❌ Wage prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error predicting wage',
      error: error.message
    });
  }
});

// Function to call Python ML script
function callPythonML(scriptPath, inputData) {
  return new Promise((resolve, reject) => {
    console.log('🐍 Calling Python script:', scriptPath);
    console.log('📊 Input data:', inputData);
    
    const python = spawn('python', [scriptPath, JSON.stringify(inputData)]);
    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
      result += data.toString();
      console.log('📤 Python stdout:', data.toString());
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
      console.log('❌ Python stderr:', data.toString());
    });

    python.on('close', (code) => {
      console.log('🔚 Python script closed with code:', code);
      console.log('📄 Final result:', result);
      console.log('📄 Final error:', error);
      
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${error}`));
        return;
      }

      try {
        const prediction = JSON.parse(result);
        resolve(prediction);
      } catch (parseError) {
        console.log('❌ JSON parse error:', parseError.message);
        reject(new Error(`Failed to parse ML output: ${parseError.message}`));
      }
    });
  });
}

// Fallback wage calculation (rule-based)
function calculateFallbackWage(input) {
  const baseRates = {
    painting: { beginner: 400, intermediate: 600, expert: 800 },
    electrical: { beginner: 500, intermediate: 700, expert: 900 },
    masonry: { beginner: 450, intermediate: 650, expert: 850 },
    plumbing: { beginner: 480, intermediate: 680, expert: 880 },
    carpentry: { beginner: 420, intermediate: 620, expert: 820 },
    welding: { beginner: 550, intermediate: 750, expert: 950 },
    construction: { beginner: 400, intermediate: 600, expert: 800 },
    cleaning: { beginner: 300, intermediate: 450, expert: 600 },
    gardening: { beginner: 350, intermediate: 500, expert: 700 },
    loading: { beginner: 380, intermediate: 530, expert: 680 },
    fabrication: { beginner: 500, intermediate: 700, expert: 900 },
    tiling: { beginner: 450, intermediate: 650, expert: 850 }
  };

  const categoryRates = baseRates[input.category] || baseRates.painting;
  const baseRate = categoryRates[input.skill_level] || 600;
  
  // Experience multiplier
  const experienceMultiplier = 1 + (input.experience_years * 0.05);
  
  // Location adjustment (you can customize this)
  const locationMultipliers = {
    'mumbai': 1.3, 'delhi': 1.25, 'bangalore': 1.2, 'hyderabad': 1.15,
    'chennai': 1.1, 'kolkata': 1.0, 'pune': 1.2, 'ahmedabad': 0.95
  };
  
  const locationMultiplier = locationMultipliers[input.location.toLowerCase()] || 1.0;
  
  const predictedWage = Math.round(baseRate * experienceMultiplier * locationMultiplier);
  const minWage = Math.round(predictedWage * 0.8);
  const maxWage = Math.round(predictedWage * 1.2);

  return {
    predicted_wage: predictedWage,
    confidence: 0.7,
    min_wage: minWage,
    max_wage: maxWage,
    factors: [
      `Base rate for ${input.category}: ₹${baseRate}`,
      `Experience adjustment: +${Math.round((experienceMultiplier - 1) * 100)}%`,
      `Location adjustment: ${locationMultiplier > 1 ? '+' : ''}${Math.round((locationMultiplier - 1) * 100)}%`
    ]
  };
}

module.exports = router;
