require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure Fallback key if the user's dotenv wrapper environment skips loading it
const API_KEY = process.env.GEMINI_API_KEY ;
console.log('Using API KEY:', API_KEY);

const genAI = new GoogleGenerativeAI(API_KEY);

const test = async () => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const promptText = `Analyze this civic issue description. Respond ONLY with valid JSON. {"category": "Safety", "priority": "critical"} \n\n DESCRIPTION: fire in the house`;
    console.log('Calling model...');
    const result = await model.generateContent([promptText]);
    const response = await result.response;
    console.log('Result:', response.text().trim());
  } catch (error) {
    console.error('API Error:', error.message);
  }
};

test();
