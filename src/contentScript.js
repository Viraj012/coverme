// Content script - runs on each page the user visits
import detectJobDescription from './utils/jobDetection.js';

// Function to create and show notification
function showJobDetectedNotification() {
  // Create notification element
  const notification = document.createElement('div');

  // Style the notification
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '16px 20px';
  notification.style.backgroundColor = '#4CAF50';
  notification.style.color = 'white';
  notification.style.borderRadius = '8px';
  notification.style.zIndex = '10000';
  notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  notification.style.transition = 'all 0.3s ease';
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(-20px)';
  notification.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  notification.style.fontSize = '14px';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.gap = '8px';

  // Add an icon
  const icon = document.createElement('div');
  icon.innerHTML = '✓';
  icon.style.fontSize = '16px';
  icon.style.fontWeight = 'bold';
  notification.appendChild(icon);

  // Add text content
  const text = document.createElement('div');
  text.style.flex = '1';
  text.innerHTML = `
    <div style="font-weight: 500; margin-bottom: 2px">Job Description Detected</div>
    <div style="font-size: 12px; opacity: 0.9">Click the extension icon to generate a cover letter</div>
  `;
  notification.appendChild(text);

  document.body.appendChild(notification);

  // Animate in
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  });

  // Remove notification after 4 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Main function - runs when page loads
async function init() {
  console.log('CoverMe: Content script running');

  // Check if page is ready
  if (document.readyState === 'complete') {
    runJobDetection();
  } else {
    // Wait for page to fully load
    window.addEventListener('load', () => {
      // Give a short delay to ensure dynamic content is loaded
      setTimeout(runJobDetection, 1000);
    });
  }
}

// Function to run job detection
async function runJobDetection() {
  try {
    // Use the enhanced job detection module
    const jobDetails = await detectJobDescription();
    
    // Only proceed if valid job details were found
    if (jobDetails && jobDetails.description) {
      console.log('CoverMe: Job detected successfully', jobDetails);
      
      // Store the job details for use in the popup
      chrome.storage.local.set({ 
        currentJobDetails: jobDetails,
        manualInput: {
          description: jobDetails.description,
          title: jobDetails.title || 'Unknown Job Title',
          company: jobDetails.company || 'Unknown Company'
        }
      });
      
      // Notify background script
      chrome.runtime.sendMessage({ 
        action: 'jobDetected',
        jobDetails: jobDetails
      });
      
      // Show notification
      showJobDetectedNotification();
    } else {
      console.log('CoverMe: No job detected on this page');
    }
  } catch (error) {
    console.error('CoverMe: Error in job detection:', error);
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Respond to ping to check if content script is loaded
  if (request.action === 'ping') {
    sendResponse({ status: 'active' });
    return true;
  }
  
  // Handle job detection request from popup
  if (request.action === 'detectJob') {
    // Use our enhanced detection
    detectJobDescription().then(jobDetails => {
      if (jobDetails && jobDetails.description) {
        sendResponse({
          found: true,
          title: jobDetails.title || 'Unknown Job Title',
          company: jobDetails.company || 'Unknown Company',
          description: jobDetails.description
        });
      } else {
        sendResponse({ found: false });
      }
    }).catch(error => {
      console.error('CoverMe: Error detecting job from popup request:', error);
      sendResponse({ found: false, error: error.message });
    });
    
    return true; // Keep channel open for async response
  }
});

// Run the initialization
init();