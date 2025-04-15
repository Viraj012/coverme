// // Add to the message listener
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   // ... existing message handlers ...

  
//   if (request.action === 'customEditCoverLetter') {
//     handleCustomEdit(request.currentLetter, request.customInstructions)
//       .then(response => sendResponse(response))
//       .catch(error => sendResponse({ status: 'error', message: error.message }));
//     return true; // Will respond asynchronously
//   }
// });

// // Add the custom edit handler function
// async function handleCustomEdit(currentLetter, customInstructions) {
//   try {
//     // Get the API key
//     const apiKey = await chrome.storage.local.get('apiKey');
//     if (!apiKey.apiKey) {
//       throw new Error('API key not configured');
//     }

//     // Prepare the prompt for the AI
//     const prompt = `Please modify the following cover letter according to these instructions: ${customInstructions}\n\nCurrent cover letter:\n${currentLetter}`;

//     // Call the Gemini API
//     const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${apiKey.apiKey}`
//       },
//       body: JSON.stringify({
//         contents: [{
//           parts: [{
//             text: prompt
//           }]
//         }],
//         generationConfig: {
//           temperature: 0.7,
//           topK: 40,
//           topP: 0.95,
//           maxOutputTokens: 1024,
//         },
//         safetySettings: [
//           {
//             category: "HARM_CATEGORY_HARASSMENT",
//             threshold: "BLOCK_MEDIUM_AND_ABOVE"
//           },
//           {
//             category: "HARM_CATEGORY_HATE_SPEECH",
//             threshold: "BLOCK_MEDIUM_AND_ABOVE"
//           },
//           {
//             category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
//             threshold: "BLOCK_MEDIUM_AND_ABOVE"
//           },
//           {
//             category: "HARM_CATEGORY_DANGEROUS_CONTENT",
//             threshold: "BLOCK_MEDIUM_AND_ABOVE"
//           }
//         ]
//       })
//     });

//     if (!response.ok) {
//       throw new Error('Failed to generate response');
//     }

//     const data = await response.json();
//     if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
//       throw new Error('Invalid response format');
//     }

//     const modifiedLetter = data.candidates[0].content.parts[0].text;
//     return {
//       status: 'success',
//       coverLetter: modifiedLetter
//     };
//   } catch (error) {
//     console.error('Error in handleCustomEdit:', error);
//     throw new Error('Failed to process custom edit request');
//   }
// } 