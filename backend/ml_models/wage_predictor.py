#!/usr/bin/env python3
import sys
import json
import joblib
import pandas as pd
import os

# Load your actual ML model and dependencies
print("Loading Sharmma Mitra ML model...")

try:
    # Load the model
    model_path = os.path.join(os.path.dirname(__file__), 'wage_prediction_model.joblib')
    skill_path = os.path.join(os.path.dirname(__file__), 'skill_mapping.joblib')
    
    model = joblib.load(model_path)
    skill_mapping = joblib.load(skill_path)
    
    print(f"✅ Model loaded successfully")
    print(f"✅ Skill mapping loaded: {list(skill_mapping.keys())}")
    
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None
    skill_mapping = {'Basic': 0, 'Intermediate': 1, 'Advanced': 2}

def predict_wage_from_model(input_data):
    """
    Use your actual Sharmma Mitra ML model for prediction
    """
    try:
        if model is None:
            raise Exception("Model not loaded")
        
        # Extract fields - using your model's expected field names
        experience = input_data.get('experience_years')
        location = input_data.get('location')
        job_type = input_data.get('job_type')
        skill_level = input_data.get('skill_level')  # Map from frontend skill_level
        
        # Map frontend skill levels to your model's skill levels
        skill_mapping_map = {
            'beginner': 'Basic',
            'intermediate': 'Intermediate', 
            'expert': 'Advanced'
        }
        
        skills = skill_mapping_map.get(skill_level, 'Basic')
        
        # Validate inputs
        if experience is None:
            raise Exception("Missing required field: experience_years")
        if location is None:
            raise Exception("Missing required field: location")
        if job_type is None:
            raise Exception("Missing required field: job_type")
        if skills is None:
            raise Exception("Missing required field: skills")
        
        # Validate skill level
        if skills not in skill_mapping:
            raise Exception(f'Invalid skill level. Use: {list(skill_mapping.keys())}')
        
        print(f"🤖 Predicting wage for: {experience} years, {location}, {job_type}, {skills}")
        
        # Create input dataframe for your model
        input_df = pd.DataFrame({
            'Experience Years': [float(experience)],
            'Location': [location],
            'Job Type': [job_type],
            'Skills_Encoded': [skill_mapping[skills]]
        })
        
        # Make prediction using your model
        prediction = model.predict(input_df)[0]
        
        # Calculate confidence based on prediction characteristics
        confidence = 0.85  # You can calculate this based on your model's confidence scores
        
        # Calculate wage range (±20%)
        predicted_wage = round(float(prediction), 2)
        min_wage = round(predicted_wage * 0.8, 2)
        max_wage = round(predicted_wage * 1.2, 2)
        
        # Generate factors for transparency
        factors = [
            f'Experience: {experience} years',
            f'Location: {location}',
            f'Job Type: {job_type}',
            f'Skill Level: {skills}'
        ]
        
        result = {
            'predicted_wage': int(predicted_wage),  # Convert to int for daily wage
            'confidence': confidence,
            'min_wage': int(min_wage),
            'max_wage': int(max_wage),
            'factors': factors,
            'model_used': 'sharmma-mitra-ml'
        }
        
        print(f"✅ Prediction complete: ₹{int(predicted_wage)}/day")
        return result
        
    except Exception as e:
        print(f"❌ Error in prediction: {str(e)}")
        # Return fallback prediction
        return {
            'predicted_wage': 500,
            'confidence': 0.5,
            'min_wage': 400,
            'max_wage': 600,
            'factors': ['Error in prediction, using fallback'],
            'model_used': 'fallback'
        }

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Please provide input data as JSON string'}))
        sys.exit(1)
    
    try:
        # Parse input from command line argument
        input_data = json.loads(sys.argv[1])
        
        # Make prediction
        result = predict_wage_from_model(input_data)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {str(e)}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'Prediction failed: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()
