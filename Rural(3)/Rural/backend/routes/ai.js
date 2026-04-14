const express = require('express');
const router = express.Router();
const { auth, isEmployerOrWorker } = require('../middleware/auth');
const aiService = require('../utils/aiService');

// @route   POST /api/ai/analyze-job-description
// @desc    Analyze job description using AI to extract requirements
// @access  Private
router.post('/analyze-job-description', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Job description is required'
      });
    }

    const analysis = await aiService.extractJobRequirements(description);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('AI Job Analysis Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing job description with AI',
      error: error.message
    });
  }
});

// @route   POST /api/ai/estimate-job-time
// @desc    Estimate job completion time using AI
// @access  Private
router.post('/estimate-job-time', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const { jobDetails } = req.body;

    if (!jobDetails) {
      return res.status(400).json({
        success: false,
        message: 'Job details are required'
      });
    }

    const estimation = await aiService.estimateJobTime(jobDetails);

    res.json({
      success: true,
      estimation
    });
  } catch (error) {
    console.error('AI Job Time Estimation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error estimating job time with AI',
      error: error.message
    });
  }
});

// @route   POST /api/ai/match-workers
// @desc    Match workers to job using AI
// @access  Private
router.post('/match-workers', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const { jobRequirements, availableWorkers } = req.body;

    if (!jobRequirements || !availableWorkers) {
      return res.status(400).json({
        success: false,
        message: 'Job requirements and available workers are required'
      });
    }

    const matchedWorkers = await aiService.matchWorkersToJob(jobRequirements, availableWorkers);

    res.json({
      success: true,
      matchedWorkers
    });
  } catch (error) {
    console.error('AI Worker Matching Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error matching workers with AI',
      error: error.message
    });
  }
});

// @route   POST /api/ai/chat
// @desc    Chat with AI assistant
// @access  Private
router.post('/chat', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const response = await aiService.generateChatResponse(message, context || {});

    res.json({
      success: true,
      reply: response
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating chat response with AI',
      error: error.message
    });
  }
});

// @route   GET /api/ai/health
// @desc    Test AI service health and API key validity
// @access  Private
router.get('/health', auth, isEmployerOrWorker, async (req, res) => {
  try {
    const aiService = require('../utils/aiService');
    
    if (!aiService.model) {
      return res.json({
        success: false,
        message: 'AI model not initialized. Check API key configuration.',
        apiKeyExists: !!process.env.GEMINI_API_KEY
      });
    }
    
    // Try a simple test call
    try {
      const testResult = await aiService.generateText('Say hello');
      
      res.json({
        success: true,
        message: 'AI service is working correctly',
        testResponse: testResult ? 'API key valid and working' : 'API key may be invalid',
        modelInitialized: !!aiService.model
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'AI service error: ' + error.message,
        modelInitialized: !!aiService.model
      });
    }
  } catch (error) {
    console.error('AI Health Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during health check',
      error: error.message
    });
  }
});

module.exports = router;