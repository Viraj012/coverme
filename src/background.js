// Background script - runs when the extension is installed or updated
// console.log('Cover Letter Generator: Background script running');

// API endpoint configuration
const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

// Check if this is the first time the extension is installed
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // First time installation - redirect to profile setup page
    chrome.tabs.create({
      url: chrome.runtime.getURL('profile/profile.html')
    });
    
    // Initialize storage with empty user profile and settings
    chrome.storage.local.set({
      userProfile: {
        completed: false,
        name: '',
        email: '',
        phone: '',
        professionalSummary: '',
        skills: [],
        workExperience: [],
        education: [],
        personalTraits: []
      },
      settings: {
        apiKey: '',
        apiKeyConfigured: false
      },
      savedTemplates: [],
      preferences: {
        defaultTemplate: 'formal',
        defaultTone: 'professional'
      }
    });
    
    // After profile setup, redirect to API key setup page
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings/settings.html')
    });
  }
});

// Function to get the API key from storage
async function getApiKey() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['settings'], function(data) {
      // Check if API key is configured
      if (data.settings && data.settings.apiKey && data.settings.apiKeyConfigured) {
        // console.log('Using user-configured API key');
        resolve(data.settings.apiKey);
      } else {
        // console.log('No API key configured');
        reject(new Error('API key not configured. Please set up your API key in the settings.'));
      }
    });
  });
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'jobDetected') {
    // Content script has detected a job description
    // console.log('Job description detected on: ' + sender.tab.url);
    
    // Check if user profile is completed and API key is configured
    chrome.storage.local.get(['userProfile', 'settings'], function(data) {
      if (!data.userProfile || !data.userProfile.completed) {
        // If profile is not completed, redirect to profile setup
        chrome.tabs.create({
          url: chrome.runtime.getURL('profile/profile.html')
        });
        sendResponse({ status: 'profile_incomplete' });
        return;
      }
      
      if (!data.settings || !data.settings.apiKey || !data.settings.apiKeyConfigured) {
        // If API key is not configured, show settings page
        chrome.tabs.create({
          url: chrome.runtime.getURL('settings/settings.html')
        });
        sendResponse({ status: 'api_key_missing' });
        return;
      }
      
      sendResponse({ status: 'ready' });
    });
    
    return true; // Keep the message channel open for async response
  }
  
  if (message.action === 'generateCoverLetter') {
    // Handle cover letter generation request
    chrome.storage.local.get(['settings'], function(data) {
      if (!data.settings || !data.settings.apiKey || !data.settings.apiKeyConfigured) {
        sendResponse({ 
          status: 'error', 
          message: 'API key not configured. Please set up your Google Gemini API key in settings.'
        });
        return;
      }
      
      // Forward the request to Gemini API
      generateCoverLetterWithAI(
        message.jobDetails, 
        message.userProfile, 
        message.templateStyle, 
        message.tone
      )
        .then(response => {
          sendResponse({ status: 'success', coverLetter: response });
        })
        .catch(error => {
          sendResponse({ status: 'error', message: error.message });
        });
      
      return true; // Keep the message channel open for async response
    });

    return true; // Keep the message channel open for async response
  }
  
  if (message.action === 'analyzeJobDescription') {
    // Handle job description analysis request
    chrome.storage.local.get(['settings'], function(data) {
      if (!data.settings || !data.settings.apiKey || !data.settings.apiKeyConfigured) {
        sendResponse({ 
          status: 'error', 
          message: 'API key not configured. Please set up your Google Gemini API key in settings.'
        });
        return;
      }
      
      // Forward the request to Gemini API
      analyzeJobDescriptionWithAI(message.jobDescription)
        .then(response => {
          sendResponse({ status: 'success', analysis: response });
        })
        .catch(error => {
          sendResponse({ status: 'error', message: error.message });
        });
      
      return true; // Keep the message channel open for async response
    });

    return true; // Keep the message channel open for async response
  }
  
  // Add the custom edit handler
  if (message.action === 'customEditCoverLetter') {
    // Handle custom editing of cover letter
    chrome.storage.local.get(['settings'], function(data) {
      if (!data.settings || !data.settings.apiKey || !data.settings.apiKeyConfigured) {
        sendResponse({ 
          status: 'error', 
          message: 'API key not configured. Please set up your Google Gemini API key in settings.'
        });
        return;
      }
      
      // Forward the request to customEditCoverLetterWithAI
      customEditCoverLetterWithAI(message.currentLetter, message.customInstructions)
        .then(response => {
          sendResponse({ status: 'success', coverLetter: response });
        })
        .catch(error => {
          sendResponse({ status: 'error', message: error.message });
        });
      
      return true; // Keep the message channel open for async response
    });

    return true; // Keep the message channel open for async response
  }
  
  // Add handler for checking API key validity
  if (message.action === 'checkApiKey') {
    // Simple test call to verify the API key works
    const testApiKey = message.apiKey;
    if (!testApiKey) {
      sendResponse({ status: 'error', message: 'No API key provided' });
      return;
    }
    
    // Make a simple request to test the API key
    fetch(`${API_URL}?key=${testApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Hello, this is a test request to verify API key validity.'
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10
        }
      })
    })
    .then(response => {
      if (response.ok) {
        sendResponse({ status: 'success', message: 'API key is valid' });
      } else {
        response.json().then(errorData => {
          sendResponse({ 
            status: 'error', 
            message: 'Invalid API key: ' + (errorData.error?.message || 'Unknown error')
          });
        }).catch(error => {
          sendResponse({ status: 'error', message: 'Error validating API key' });
        });
      }
    })
    .catch(error => {
      sendResponse({ status: 'error', message: 'Network error: ' + error.message });
    });
    
    return true; // Keep the message channel open for async response
  }
});

// Function to generate cover letter using Gemini API
async function generateCoverLetterWithAI(jobDetails, userProfile, templateStyle, tone) {
  // Format the current date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Create the letter header with user's details
  const letterHeader = `${userProfile.name}
${userProfile.email}
${userProfile.phone}

${formattedDate}

${jobDetails.company}
${jobDetails.companyAddress || ''}

Dear Hiring Manager,

`;
//  Requirements: ${jobDetails.requirements?.join('\n') || 'Not specified'}
//  Responsibilities: ${jobDetails.responsibilities?.join('\n') || 'Not specified'}

  const prompt = `Generate a professional cover letter body for the following job and candidate. Do not include any headers, greetings, or closings as they will be added separately:

Job Details:
Title: ${jobDetails.title || 'Not specified'}
Company: ${jobDetails.company || 'Not specified'}

Candidate Profile:
Name: ${userProfile.name}
Professional Summary: ${userProfile.professionalSummary}
Skills: ${userProfile.skills.join(', ')}
Work Experience: ${userProfile.workExperience.map(exp => 
  `${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate}): ${exp.achievements}`
).join('\n')}
Education: ${userProfile.education.map(edu => 
  `${edu.degree} in ${edu.field} from ${edu.institution} (${edu.graduationYear})`
).join('\n')}
Personal Traits: ${userProfile.personalTraits.join(', ')}

Style: ${templateStyle || 'formal'}
Tone: ${tone || 'professional'}|

KEY INSTRUCTIONS:
1. Analyze the job details and identify 2-3 specific aspects to focus on
2. Write in a natural, conversational tone that reflects a real human's voice
3. Include 1-2 specific examples from the applicant's work history that directly relate to the job requirements
4. Incorporate one unique personal insight or approach the applicant might bring to the role
5. Vary sentence structure and avoid repetitive patterns
6. Eliminate generic phrases like "I believe I am the perfect candidate" or "I am writing to apply"
7. Use specific language about the company/position that shows genuine interest
8. Create a logical flow between paragraphs (3 paragraphs maximum)
9. Keep the total length under 300 words
10. Add subtle personality elements that match the requested tone
11. DO NOT use AI-giveaway phrases like "I am excited to submit my application" or "I am confident that my skills align perfectly"`;

  try {
    // Get the API key from storage - this will throw an error if not configured 
    const apiKey = await getApiKey();
    
    // console.log('Sending request to Gemini API...');
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    const data = await response.json();
    // console.log('Gemini API response:', data);

    if (!response.ok) {
      console.error('Gemini API error:', data);
      if (data.error?.message) {
        throw new Error(data.error.message);
      }
      throw new Error('Failed to generate cover letter: ' + response.statusText);
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    // Combine the header with the generated content and add a closing
    const letterBody = data.candidates[0].content.parts[0].text;
    const letterClosing = `\n\nSincerely,\n${userProfile.name}`;
    
    return letterHeader + letterBody + letterClosing;
  } catch (error) {
    console.error('Error generating cover letter:', error);
    // Check for common API key issues
    if (error.message.includes('401') || error.message.includes('invalid_api_key')) {
      throw new Error('Invalid API key. Please make sure you have entered a valid Google Gemini API key in settings.');
    } else if (error.message.includes('API key not configured')) {
      throw new Error('API key not configured. Please set up your API key in the settings before generating a cover letter.');
    }
    throw error;
  }
}

// Function to analyze job description using Gemini API
async function analyzeJobDescriptionWithAI(jobDescription) {
  const prompt = `Analyze the following job description and extract key information:

${jobDescription}

Please provide a structured analysis including:
1. Key requirements and qualifications
2. Main responsibilities
3. Required skills and experience
4. Company culture indicators
5. Any unique aspects of the role`;

  try {
    // Get the API key from storage
    const apiKey = await getApiKey();
    
    // console.log('Sending request to Gemini API...');
    
    // Using the correct Gemini API endpoint and format
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500
        }
      })
    });

    const data = await response.json();
    // console.log('Gemini API response:', data);

    if (!response.ok) {
      console.error('Gemini API error:', data);
      if (data.error?.message) {
        throw new Error(data.error.message);
      }
      throw new Error('Failed to analyze job description');
    }

    // Extract text from the Gemini response format
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Error analyzing job description:', error);
    throw error;
  }
}

// Function to apply custom edits to a cover letter using Gemini API
async function customEditCoverLetterWithAI(currentLetter, customInstructions) {
  const prompt = `Please modify the following cover letter according to these instructions: ${customInstructions}

Current cover letter:
${currentLetter}

Please provide the complete modified cover letter that incorporates the requested changes.
Include the entire letter with all sections (header, body, and closing).
Maintain the same general structure but implement the requested modifications.`;

  try {
    // Get the API key from storage
    const apiKey = await getApiKey();
    
    // console.log('Sending custom edit request to Gemini API...');
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    const data = await response.json();
    // console.log('Gemini API response for custom edit:', data);

    if (!response.ok) {
      console.error('Gemini API error:', data);
      if (data.error?.message) {
        throw new Error(data.error.message);
      }
      throw new Error('Failed to apply custom edits: ' + response.statusText);
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API for custom edit');
    }

    // Return the modified letter
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error applying custom edits to cover letter:', error);
    // Check for common API key issues
    if (error.message.includes('401') || error.message.includes('invalid_api_key')) {
      throw new Error('Invalid or expired API key. Please check your settings.');
    }
    throw error;
  }
}