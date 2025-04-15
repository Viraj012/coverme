// Content script - runs on each page the user visits

// Job detection patterns with improved selectors and heuristics
const jobDescriptionPatterns = {
  // Common job posting indicators - prioritized and expanded
  keywords: [
    // Primary high-confidence indicators
    'job description', 'responsibilities', 'requirements', 
    'qualifications', 'skills required', 'experience required',
    'job details', 'about the role', 'position summary',
    
    // Secondary indicators
    'what you\'ll do', 'what we\'re looking for', 
    'role overview', 'job summary', 'essential functions',
    'key responsibilities', 'required experience', 'minimum qualifications',
    'preferred qualifications', 'basic qualifications', 'job requirements',
    'position requirements', 'who we\'re looking for', 'desired skills',
    
    // Common job posting sections
    'benefits', 'perks', 'compensation', 'salary range', 
    'apply now', 'application instructions', 'about us',
    'company overview', 'the team', 'our culture',
    
    // Action verbs common in job descriptions
    'manage', 'lead', 'develop', 'create', 'implement',
    'collaborate', 'analyze', 'design', 'build', 'maintain',
    'communicate', 'report', 'coordinate', 'support', 'improve'
  ],
  
  // Common job sites domains - expanded list
  jobSites: [
    // Major job boards
    'linkedin.com/jobs', 'indeed.com', 'glassdoor.com', 
    'monster.com', 'ziprecruiter.com', 'simplyhired.com',
    'dice.com', 'careerbuilder.com', 'jobs.', 'careers.',
    
    // ATS (Applicant Tracking Systems)
    'workday.com', 'lever.co', 'greenhouse.io', 'recruitee.com',
    'jobvite.com', 'smartrecruiters.com', 'boards.greenhouse.io',
    'jobs.lever.co', 'apply.workday.com', 'wellfound.com',
    
    // Other common job posting platforms
    'remoteco.com', 'remote.co', 'weworkremotely.com', 'remoteok.com',
    'flexjobs.com', 'upwork.com', 'freelancer.com', 'talent.com',
    'adzuna.com', 'hired.com', 'stackoverflow.com/jobs',
    'angel.co/jobs', 'wellfound.com/jobs', 'theladders.com',
    'themuse.com/jobs', 'powertofly.com', 'jobsremotelyhub.com'
  ],

  // URL patterns that indicate a job posting
  urlPatterns: [
    '/job/', '/career/', '/careers/', '/jobs/', 
    '/position/', '/opening/', '/opportunity/',
    '/apply/', '/vacancy/', '/posting/',
    'job-detail', 'job-description', 'job-posting',
    'career-opportunity', 'career-detail', 'position-detail'
  ],

  // Schema.org job posting microdata - for structured detection
  schemaSelectors: [
    '[itemtype="http://schema.org/JobPosting"]',
    '[itemtype="https://schema.org/JobPosting"]',
    '[typeof="JobPosting"]',
    'script[type="application/ld+json"]'
  ],

  // Tag-based selectors for job descriptions with common patterns prioritized
  descriptionSelectors: [
    // High-confidence selectors
    '[data-testid="job-description"]',
    '[data-automation="jobDescriptionText"]',
    '[data-cy="job-description"]',
    '#job-description',
    '.job-description',
    '.jobDescriptionText',
    '.description-section',
    
    // Common description containers
    'div[class*="description"]:not([class*="meta"]):not([class*="image"])',
    'section[class*="description"]:not([class*="meta"]):not([class*="image"])',
    'div[id*="description"]:not([id*="meta"]):not([id*="image"])',
    'section[id*="description"]:not([id*="meta"]):not([id*="image"])',
    'div[class*="jobDescription"]',
    'div[class*="job-description"]',
    'div[class*="job_description"]',
    
    // Role/responsibility sections
    'div[class*="responsibilities"]',
    'section[class*="responsibilities"]',
    'div[id*="responsibilities"]',
    'section[id*="responsibilities"]',
    'div[class*="requirements"]',
    'section[class*="requirements"]',
    'div[id*="requirements"]',
    'section[id*="requirements"]',
    
    // Other common selectors
    '.posting-requirements',
    '.job-details',
    '.job-content',
    '.role-details',
    '.position-details'
  ],
  
  // Tag-based selectors for job titles with prioritization
  titleSelectors: [
    // High-confidence selectors
    '[data-testid="job-title"]',
    '[data-automation="jobTitle"]',
    '[data-cy="job-title"]',
    '#job-title',
    '.job-title',
    '.jobTitle',
    
    // Common title patterns
    'h1.title', 
    'h1[class*="title"]',
    'h1[class*="job-title"]',
    'h1[class*="jobTitle"]',
    'h1[class*="position-title"]',
    'h1[class*="role-title"]',
    
    // Secondary heading elements
    'h2.title',
    'h2[class*="title"]:not([class*="section"])',
    'h3[class*="title"]:not([class*="section"])',
    
    // Other common patterns
    '.posting-headline h2',
    '.job-headline h2',
    '.position-headline h2',
    '.posting-title',
    '.position-title',
    '.role-title'
  ],
  
  // Tag-based selectors for company names with prioritization
  companySelectors: [
    // High-confidence selectors
    '[data-testid="company-name"]',
    '[data-automation="companyName"]',
    '[data-cy="company-name"]',
    '#company-name',
    '.company-name',
    '.companyName',
    
    // Common company name patterns
    'a[class*="company"]',
    'div[class*="company-name"]',
    'div[class*="companyName"]',
    'div[class*="employer-name"]',
    'div[class*="employerName"]',
    'span[class*="company-name"]',
    'span[class*="companyName"]',
    
    // Secondary patterns
    '.job-company',
    '.posting-company',
    '.employer-name',
    '.organization-name',
    '.company-info a'
  ]
};

// Initialize detection state
const detectionState = {
isJobSite: false,
urlContainsJobPattern: false,
keywordMatches: [],
containsJobSchema: false,
descriptionElement: null,
titleElement: null,
companyElement: null,
confidence: 0
};

// Function to check if text contains any of the patterns
function containsAny(text, patterns) {
if (!text) return false;
const lowerText = text.toLowerCase();
return patterns.some(pattern => lowerText.includes(pattern.toLowerCase()));
}

// Function to find element by selectors with fallback strategy
function findElementBySelectors(selectors, minTextLength = 0) {
// Try each selector in order
for (const selector of selectors) {
  try {
    const elements = document.querySelectorAll(selector);
    
    // Filter elements to find those with meaningful content
    for (const element of elements) {
      const text = element.textContent.trim();
      
      // Skip elements with no text or text that's too short
      if (!text || text.length < minTextLength) continue;
      
      // Skip elements that are likely navigation or footer items
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      
      // Skip hidden elements
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      
      return element;
    }
  } catch (e) {
    console.log('Error with selector:', selector, e);
  }
}

return null;
}

// Function to extract text from job schema
function extractFromJobSchema() {
try {
  // Check for schema.org job posting in JSON-LD
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      
      // Check if it's a job posting
      if (data['@type'] === 'JobPosting' || 
          (data['@graph'] && data['@graph'].some(item => item['@type'] === 'JobPosting'))) {
        
        const jobData = data['@type'] === 'JobPosting' ? data : 
                       data['@graph'].find(item => item['@type'] === 'JobPosting');
        
        detectionState.containsJobSchema = true;
        
        return {
          title: jobData.title || '',
          company: jobData.hiringOrganization?.name || '',
          description: jobData.description || ''
        };
      }
    } catch (e) {
      console.log('Error parsing JSON-LD:', e);
    }
  }
  
  // Check for microdata
  const jobPosting = document.querySelector('[itemtype="http://schema.org/JobPosting"], [itemtype="https://schema.org/JobPosting"]');
  if (jobPosting) {
    detectionState.containsJobSchema = true;
    
    const title = jobPosting.querySelector('[itemprop="title"]')?.textContent.trim() || '';
    const company = jobPosting.querySelector('[itemprop="hiringOrganization"] [itemprop="name"]')?.textContent.trim() || '';
    const description = jobPosting.querySelector('[itemprop="description"]')?.textContent.trim() || '';
    
    return { title, company, description };
  }
} catch (e) {
  console.log('Error extracting from schema:', e);
}

return null;
}

// Function to detect if current page is a job description with improved heuristics
function detectJobDescription() {
// Check URL patterns
const pageUrl = window.location.href.toLowerCase();

// Check if URL is from a known job site
detectionState.isJobSite = jobDescriptionPatterns.jobSites.some(site => pageUrl.includes(site));

// Check if URL contains job-related patterns
detectionState.urlContainsJobPattern = jobDescriptionPatterns.urlPatterns.some(pattern => pageUrl.includes(pattern));

// Count keyword matches in page text
const pageText = document.body.innerText.toLowerCase();
detectionState.keywordMatches = jobDescriptionPatterns.keywords.filter(keyword => 
  pageText.includes(keyword.toLowerCase())
);

// Check for job schema
const schemaData = extractFromJobSchema();

// Find description, title and company elements
detectionState.descriptionElement = findElementBySelectors(jobDescriptionPatterns.descriptionSelectors, 100);
detectionState.titleElement = findElementBySelectors(jobDescriptionPatterns.titleSelectors, 3);
detectionState.companyElement = findElementBySelectors(jobDescriptionPatterns.companySelectors, 2);

// Check for apply button as strong signal
const hasApplyButton = Array.from(document.querySelectorAll('button, a')).some(el => {
  const text = el.innerText.toLowerCase();
  return (text.includes('apply') || text.includes('submit application')) && 
         !text.includes('cookie');
});

// Calculate confidence score based on multiple signals
let confidence = 0;

// URL-based signals (strongest)
if (detectionState.isJobSite) confidence += 30;
if (detectionState.urlContainsJobPattern) confidence += 25;

// Schema-based signals (very strong)
if (detectionState.containsJobSchema) confidence += 40;

// Content-based signals
if (detectionState.descriptionElement) confidence += 20;
if (detectionState.titleElement) confidence += 15;
if (detectionState.companyElement) confidence += 10;

// Keyword-based signals
confidence += Math.min(detectionState.keywordMatches.length * 2, 20);

// Apply button (strong signal)
if (hasApplyButton) confidence += 15;

// Set final confidence score
detectionState.confidence = confidence;

// Log detection details for debugging
// console.log('Job Detection Results:', {
//   url: window.location.href,
//   isJobSite: detectionState.isJobSite,
//   urlContainsJobPattern: detectionState.urlContainsJobPattern,
//   keywordMatchCount: detectionState.keywordMatches.length,
//   keywordMatches: detectionState.keywordMatches,
//   containsJobSchema: detectionState.containsJobSchema,
//   hasDescriptionElement: !!detectionState.descriptionElement,
//   hasTitleElement: !!detectionState.titleElement,
//   hasCompanyElement: !!detectionState.companyElement,
//   hasApplyButton,
//   confidence
// });

// Consider it a job description if confidence is above threshold
return confidence >= 50;
}

// Function to extract job details with improved accuracy
function extractJobDetails() {
// Initialize result object
const result = {
  title: '',
  company: '',
  description: ''
};

try {
  // First try to extract from schema (most reliable)
  const schemaData = extractFromJobSchema();
  if (schemaData && schemaData.description) {
    result.title = schemaData.title || result.title;
    result.company = schemaData.company || result.company;
    result.description = schemaData.description || result.description;
  }
  
  // If schema didn't provide all details, use DOM elements
  
  // Try to find job title if not already found
  if (!result.title && detectionState.titleElement) {
    result.title = detectionState.titleElement.textContent.trim();
  }

  // Try to find company name if not already found
  if (!result.company && detectionState.companyElement) {
    result.company = detectionState.companyElement.textContent.trim();
  }

  // Try to find job description if not already found
  if (!result.description && detectionState.descriptionElement) {
    result.description = detectionState.descriptionElement.textContent.trim();
  }
  
  // Clean up the extracted text
  if (result.title) {
    // Remove common prefixes and suffixes from titles
    result.title = result.title
      .replace(/^(job|position|career|opening):\s*/i, '')
      .replace(/\s*\(.*?\)$/, '')
      .trim();
  }
  
  if (result.company) {
    // Remove common prefixes from company names
    result.company = result.company
      .replace(/^(at|with|for|join)\s+/i, '')
      .trim();
  }
  
  if (result.description) {
    // Check if description is too short - if so, try to find a better one
    if (result.description.length < 200) {
      // If the main extraction failed, try a more aggressive approach
      const mainContent = document.querySelector('main') || document.querySelector('article') || document.body;
      const paragraphs = mainContent.querySelectorAll('p, div > ul, section > ul');
      
      // Collect potential description paragraphs
      let descriptionText = '';
      let relevantParagraphs = 0;
      
      for (const p of paragraphs) {
        const text = p.textContent.trim();
        
        // Skip very short texts and navigation/header items
        if (text.length < 20) continue;
        
        // Check if paragraph contains job-related keywords
        const containsJobKeyword = jobDescriptionPatterns.keywords.some(keyword => 
          text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (containsJobKeyword) {
          descriptionText += text + '\n\n';
          relevantParagraphs++;
        }
        
        // Limit to a reasonable number of paragraphs
        if (relevantParagraphs >= 5) break;
      }
      
      // Use the collected text if it's longer than our current description
      if (descriptionText.length > result.description.length) {
        result.description = descriptionText.trim();
      }
    }
  }

  return result;
} catch (error) {
  console.error('Error extracting job details:', error);
  return result;
}
}

// Function to analyze job description with AI
async function analyzeJobDescription(jobDetails) {
try {
  // Send job description to background script for AI analysis
  const response = await chrome.runtime.sendMessage({
    action: 'analyzeJobDescription',
    jobDescription: jobDetails.description
  });
  
  if (response.status === 'success') {
    // Parse the AI analysis
    const analysis = response.analysis;
    
    // Extract requirements and responsibilities from the analysis
    const requirementsMatch = analysis.match(/Key requirements and qualifications:([\s\S]*?)(?=Main responsibilities:|$)/i);
    const responsibilitiesMatch = analysis.match(/Main responsibilities:([\s\S]*?)(?=Required skills and experience:|$)/i);
    
    if (requirementsMatch) {
      jobDetails.requirements = requirementsMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('-'));
    }
    
    if (responsibilitiesMatch) {
      jobDetails.responsibilities = responsibilitiesMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('-'));
    }
  }
} catch (error) {
  console.error('Error analyzing job description:', error);
}

return jobDetails;
}

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
// console.log('Cover Letter Generator: Content script running');

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
function runJobDetection() {
try {
  // Check if this page is a job description
  if (detectJobDescription()) {
    // console.log('Job description detected');
    
    // Extract job details
    let jobDetails = extractJobDetails();
    
    // Only proceed if we have meaningful content
    if (jobDetails.description && (jobDetails.title || jobDetails.company)) {
      // Clean up the data
      jobDetails.title = jobDetails.title || 'Unknown Job Title';
      jobDetails.company = jobDetails.company || 'Unknown Company';
      
      // Store the job details for use in the popup
      chrome.storage.local.set({ 
        currentJobDetails: jobDetails,
        manualInput: {
          description: jobDetails.description,
          title: jobDetails.title,
          company: jobDetails.company
        }
      });
      
      // Notify background script
      chrome.runtime.sendMessage({ 
        action: 'jobDetected',
        jobDetails: jobDetails
      });
      
      // Show notification
      showJobDetectedNotification();
    }
  }
} catch (error) {
  console.error('Error in job detection:', error);
}
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
if (request.action === 'detectJob') {
  // Try to detect job details
  const jobDetails = extractJobDetails();
  
  if (jobDetails.description) {
    sendResponse({
      found: true,
      title: jobDetails.title || 'Unknown Job Title',
      company: jobDetails.company || 'Unknown Company',
      description: jobDetails.description
    });
  } else {
    sendResponse({ found: false });
  }
}
return true; // Required for async response
});

// Run the initialization
init();