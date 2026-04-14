const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      console.warn('Please set GEMINI_API_KEY in your .env file');
    } else {
      console.log('Gemini API key found, initializing model...');
    }
    try {
      this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
      this.model = this.genAI ? this.genAI.getGenerativeModel({ model: 'gemini-1.0-pro' }) : null;
      if (this.model) {
        console.log('Gemini model initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing Gemini model:', error.message);
      this.model = null;
    }
  }

  async generateText(prompt, options = {}) {
    if (!this.model) {
      console.error('Gemini model not initialized. Check API key configuration.');
      return null;
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error calling Gemini API:', error.message || error);
      return null;
    }
  }

  /**
   * Extract job requirements from natural language description
   */
  async extractJobRequirements(description) {
    if (!this.model) {
      console.log('AI model not available, returning default values');
      // Return a basic extraction if API is not configured
      return {
        skills: [],
        duration: { estimated: 1, unit: 'day' },
        difficulty: 'moderate',
        materials_needed: [],
        estimated_workers: 1
      };
    }

    const prompt = `
      Analyze this job description and extract the following information in JSON format:
      Description: "${description}"
      
      Extract:
      - skills: List of specific skills required
      - duration: Estimated duration with unit (hours, days, weeks)
      - difficulty: Difficulty level (easy, moderate, difficult, expert)
      - materials_needed: List of materials/tools likely needed
      - estimated_workers: Number of workers typically needed
      
      Respond ONLY with valid JSON format, no additional text.
    `;

    try {
      console.log('Sending request to Gemini API for job analysis...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();
      console.log('Received response from Gemini API');

      // Clean the response to extract JSON
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Successfully parsed AI response:', parsed);
        return parsed;
      } else {
        console.warn('Could not find JSON in AI response:', textResponse);
        throw new Error('Could not parse AI response as JSON');
      }
    } catch (error) {
      console.error('Error extracting job requirements:', error.message || error);
      // Log more details for debugging
      if (error.message && error.message.includes('API_KEY_INVALID')) {
        console.error('The Gemini API key appears to be invalid');
      }
      // Return a default structure if AI fails
      return {
        skills: [],
        duration: { estimated: 1, unit: 'day' },
        difficulty: 'moderate',
        materials_needed: [],
        estimated_workers: 1
      };
    }
  }

  /**
   * Estimate job completion time based on various factors
   */
  async estimateJobTime(jobDetails) {
    if (!this.model) {
      return { estimated_time: 1, unit: 'day', confidence: 'low' };
    }

    const prompt = `
      Based on these job details, estimate the time required to complete this job:
      ${JSON.stringify(jobDetails, null, 2)}
      
      Consider:
      - Complexity of the job
      - Size of the area/work
      - Typical industry standards
      - Number of workers available
      
      Respond with JSON containing:
      - estimated_time: Numeric value
      - unit: Time unit (minutes, hours, days, weeks)
      - confidence: Confidence level (low, medium, high)
      
      Respond ONLY with valid JSON format, no additional text.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    } catch (error) {
      console.error('Error estimating job time:', error);
      return { estimated_time: 1, unit: 'day', confidence: 'low' };
    }
  }

  /**
   * Match workers to job requirements
   */
  async matchWorkersToJob(jobRequirements, availableWorkers) {
    if (!this.model) {
      // Return all workers if API is not configured
      return availableWorkers.map(worker => ({
        ...worker,
        match_score: 0.5,
        reasons: ['Basic match']
      }));
    }

    const prompt = `
      Match these workers to the job requirements:
      
      Job Requirements: ${JSON.stringify(jobRequirements, null, 2)}
      
      Available Workers: ${JSON.stringify(availableWorkers.slice(0, 10), null, 2)}  // Limit to 10 workers
      
      For each worker, provide:
      - match_score: 0-1 score indicating how well they match
      - reasons: List of reasons for the match score
      - suitability: Overall suitability level (poor, fair, good, excellent)
      
      Respond with an array of workers with added match information.
      Respond ONLY with valid JSON format, no additional text.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      const jsonMatch = textResponse.match(/\[(?:[^[\]]*|\[(?:[^[\]]*|\[[^\[\]]*\])*])*]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    } catch (error) {
      console.error('Error matching workers to job:', error);
      // Return workers with basic match scores if AI fails
      return availableWorkers.map(worker => ({
        ...worker,
        match_score: 0.5,
        reasons: ['Basic match'],
        suitability: 'fair'
      }));
    }
  }

  /**
   * Generate conversation response for the AI chatbot
   */
  async generateChatResponse(message, context = {}) {
    if (!this.model) {
      return "I'm sorry, but the AI service is not currently available. Please try again later.";
    }

    const prompt = `
      You are an AI assistant for a rural job platform connecting employers and workers. 
      Respond to this message appropriately based on the context:
      
      Message: "${message}"
      
      Context: ${JSON.stringify(context, null, 2)}
      
      Keep your response helpful, professional, and concise.
      If asked about job details, worker availability, or pricing, provide general guidance 
      but note that specific details should be confirmed with the actual parties involved.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating chat response:', error);
      return "I apologize, but I encountered an issue processing your request. Could you please rephrase?";
    }
  }
}

module.exports = new AIService();