// Content script - runs on each page the user visits

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

  // Store current URL to detect changes
  window.coverMeLastUrl = window.location.href;
  
  // Clear previous job data when a new page loads
  chrome.storage.local.remove(['currentJobDetails', 'popupState'], function() {
    console.log('CoverMe: Cleared previous job data on page load');
  });
  
  // Set a new URL identifier for this page
  const pageId = Date.now().toString();
  chrome.storage.local.set({
    lastPageId: pageId,
    lastDetectedUrl: window.location.href
  });

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
  
  // Listen for URL changes (for SPAs - Single Page Applications)
  setInterval(() => {
    if (window.coverMeLastUrl !== window.location.href) {
      console.log('CoverMe: URL changed, resetting job detection');
      window.coverMeLastUrl = window.location.href;
      
      // Clear previous job data when URL changes
      chrome.storage.local.remove(['currentJobDetails', 'popupState'], function() {
        console.log('CoverMe: Cleared previous job data on URL change');
        
        // Set a new URL identifier
        const newPageId = Date.now().toString();
        chrome.storage.local.set({
          lastPageId: newPageId,
          lastDetectedUrl: window.location.href
        });
        
        // Run detection for the new URL
        runJobDetection();
      });
    }
  }, 1000);
}

// Function to run job detection
async function runJobDetection() {
  try {
    console.log('CoverMe: Running job detection');
    
    // Check if URL suggests a job listing (pre-screening)
    const url = window.location.href.toLowerCase();
    const urlJobBlacklist = ['google.com', 'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'amazon.com'];
    if (urlJobBlacklist.some(site => url.includes(site))) {
      console.log('CoverMe: Skipping detection on non-job site');
      return;
    }
    
    // Get the job site selectors and detection logic from the enhanced detection system
    const jobDetails = await enhancedJobDetection();
    
    // Only proceed if valid job details were found with high confidence
    if (jobDetails && jobDetails.description && jobDetails.confidence >= 70) {
      console.log('CoverMe: Job detected successfully with confidence:', jobDetails.confidence);
      
      // Additional validation: verify minimum length and required job terms
      if (jobDetails.description.length >= 300 && 
          /\b(responsibilities|requirements|qualifications|experience|skills)\b/i.test(jobDetails.description)) {
        
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
        console.log('CoverMe: Job detection failed secondary validation checks');
      }
    } else {
      console.log('CoverMe: No job detected on this page or confidence too low');
    }
  } catch (error) {
    console.error('CoverMe: Error in job detection:', error);
  }
}

// Enhanced job detection logic that implements our hierarchical detection strategy
async function enhancedJobDetection() {
  try {
    // Get current domain
    const hostname = window.location.hostname;
    
    // EARLY EXIT: Skip detection on common non-job sites
    const nonJobSites = [
      "google.com", "youtube.com", "facebook.com", "instagram.com", 
      "twitter.com", "amazon.com", "reddit.com", "netflix.com", 
      "pinterest.com", "wikipedia.org", "spotify.com", "gmail.com",
      "yahoo.com", "walmart.com", "ebay.com", "twitch.tv",
      "tiktok.com", "microsoft.com", "apple.com", "github.com"
    ];
    
    if (nonJobSites.some(site => hostname.includes(site))) {
      console.log(`CoverMe: Skipping detection on known non-job site: ${hostname}`);
      return null;
    }
    
    // Step 1: Site-Specific Detection (most reliable)
    const jobSites = {
      "linkedin.com": {
        jobDescription: ".description__text, .show-more-less-html__markup, .jobs-description-content",
        jobTitle: ".top-card-layout__title, .job-detail-title, .jobs-unified-top-card__job-title",
        company: ".topcard__org-name-link, .company-name, .jobs-unified-top-card__company-name",
        pathCheck: url => url.includes("/jobs/") || url.includes("/job/")
      },
      "indeed.com": {
        jobDescription: "#jobDescriptionText, .jobsearch-jobDescriptionText",
        jobTitle: ".jobsearch-JobInfoHeader-title, .icl-u-xs-mb--xs",
        company: ".jobsearch-InlineCompanyRating-companyHeader, .icl-u-lg-mr--sm",
        pathCheck: url => url.includes("/viewjob") || url.includes("/job/")
      },
      "glassdoor.com": {
        jobDescription: ".jobDescriptionContent, .desc, [data-test='jobDescriptionText']",
        jobTitle: "[data-test='jobTitle'], .css-1vg6q84",
        company: "[data-test='employer-name'], .css-87uc0g",
        pathCheck: url => url.includes("/job-listing/") || url.includes("/Job/")
      },
      "monster.com": {
        jobDescription: ".job-description, .details-content",
        jobTitle: ".job-title, .title",
        company: ".company, .name",
        pathCheck: url => url.includes("/job-") || url.includes("/jobs/")
      },
      "ziprecruiter.com": {
        jobDescription: "#job-description, .jobDescriptionSection, [data-testid='job-description']",
        jobTitle: ".job_title, [data-testid='job-title']",
        company: ".hiring_company_text, [data-testid='company-name']",
        pathCheck: url => url.includes("/jobs/") 
      },
      "dice.com": {
        jobDescription: "#jobdescSec, .job-description",
        jobTitle: ".jobTitle, .job-title",
        company: ".companyLink, .company-title",
        pathCheck: url => url.includes("/job-detail/")
      },
      "careerbuilder.com": {
        jobDescription: ".job-description, .data-display",
        jobTitle: ".data-results-title",
        company: "[data-cb-company]",
        pathCheck: url => url.includes("/job/")
      },
      "simplyhired.com": {
        jobDescription: ".viewjob-description, .JobDescription_jobDescription",
        jobTitle: ".viewjob-jobTitle, .JobInfoHeader_jobTitle",
        company: ".viewjob-employerName, .JobInfoHeader_companyName",
        pathCheck: url => url.includes("/job/")
      },
      // Add more sites as needed
    };
    
    // Try site-specific detection first
    const domain = Object.keys(jobSites).find(d => hostname.includes(d));
    
    if (domain) {
      console.log(`CoverMe: Using site-specific detection for ${domain}`);
      const selectors = jobSites[domain];
      
      // First check if we're on a job listing page by examining the URL
      const currentUrl = window.location.href;
      if (selectors.pathCheck && !selectors.pathCheck(currentUrl)) {
        console.log(`CoverMe: On ${domain} but not on a job listing page, skipping detection`);
        return null;
      }
      
      // Extract job description
      const descriptionSelector = selectors.jobDescription.split(', ');
      let descriptionElement = null;
      
      for (const selector of descriptionSelector) {
        descriptionElement = document.querySelector(selector);
        if (descriptionElement) break;
      }
      
      if (descriptionElement) {
        const description = descriptionElement.innerText.trim();
        
        // Extract job title
        const titleSelector = selectors.jobTitle.split(', ');
        let titleElement = null;
        let title = '';
        
        for (const selector of titleSelector) {
          titleElement = document.querySelector(selector);
          if (titleElement) {
            title = titleElement.innerText.trim();
            break;
          }
        }
        
        // Extract company name
        const companySelector = selectors.company.split(', ');
        let companyElement = null;
        let company = '';
        
        for (const selector of companySelector) {
          companyElement = document.querySelector(selector);
          if (companyElement) {
            company = companyElement.innerText.trim();
            break;
          }
        }
        
        // Only accept if description is comprehensive enough
        if (description.length > 200) {
          return {
            description: description,
            title: title || 'Unknown Job Title',
            company: company || 'Unknown Company',
            confidence: 95
          };
        }
      }
    }
    
    // Check if URL suggests a job listing
    const url = window.location.href.toLowerCase();
    const urlJobIndicators = ['/job/', '/jobs/', '/career', '/careers', '/position', '/opening', '/apply', '/vacancy'];
    const isLikelyJobUrl = urlJobIndicators.some(indicator => url.includes(indicator));
    
    if (!isLikelyJobUrl) {
      console.log('CoverMe: URL does not suggest a job listing, skipping further detection');
      return null;
    }
    
    // Step 2: Semantic Section Detection - more precise keywords
    console.log('CoverMe: Trying semantic section detection');
    
    const jobKeywords = [
      "job description",
      "position description",
      "responsibilities",
      "key responsibilities",
      "job requirements",
      "position requirements",
      "job qualifications",
      "required qualifications",
      "essential functions"
    ];
    
    // Find elements containing job-related keywords
    let jobSections = [];
    for (const keyword of jobKeywords) {
      const elements = findElementsByText(keyword.toLowerCase());
      jobSections = jobSections.concat(elements);
    }
    
    if (jobSections.length >= 2) { // Require at least 2 job-related sections
      let description = '';
      for (const section of jobSections) {
        const parent = section.closest('section, article, div');
        if (parent && parent !== section) {
          description += parent.innerText.trim() + '\n\n';
        } else {
          let current = section.nextElementSibling;
          while (current && !current.tagName.match(/^H[1-6]$/)) {
            description += current.innerText.trim() + '\n';
            current = current.nextElementSibling;
          }
        }
      }
      
      // Find job title (usually in h1)
      const headings = document.querySelectorAll('h1');
      let title = '';
      if (headings.length > 0) {
        title = headings[0].innerText.trim();
      }
      
      // Try to find company name
      let company = '';
      const companyKeywords = ['about us', 'company', 'about the company'];
      for (const keyword of companyKeywords) {
        const elements = findElementsByText(keyword.toLowerCase());
        if (elements.length > 0) {
          const parent = elements[0].closest('section, div');
          if (parent) {
            const companyNameElements = parent.querySelectorAll('h2, h3, b, strong');
            for (const el of companyNameElements) {
              const text = el.innerText.trim();
              if (text && text.length < 50 && !text.toLowerCase().includes(keyword)) {
                company = text;
                break;
              }
            }
          }
        }
        if (company) break;
      }
      
      // More stringent requirements for content
      if (description.length > 300 && countJobKeywords(description) >= 5) {
        return {
          description: description,
          title: title,
          company: company,
          confidence: 80
        };
      }
    }
    
    // Step 3: Content Cluster Detection with stricter requirements
    console.log('CoverMe: Trying content cluster detection');
    const mainContent = 
      document.querySelector('main') || 
      document.querySelector('article') || 
      document.body;
    
    const contentBlocks = Array.from(mainContent.querySelectorAll('div, section, article'))
      .filter(el => {
        const isNav = el.closest('nav, header, footer');
        return !isNav && el.innerText.length > 500; // Increased length requirement
      })
      .sort((a, b) => b.innerText.length - a.innerText.length);
    
    if (contentBlocks.length > 0) {
      const largestBlock = contentBlocks[0];
      
      // Check if it looks like a job description - more specific regex
      const jobRelatedRegex = /\b(job description|position description|responsibilities|requirements|qualifications|essential functions)\b.*\b(experience|skills|education|background|knowledge)\b/i;
      
      if (jobRelatedRegex.test(largestBlock.innerText) && countJobKeywords(largestBlock.innerText) >= 4) {
        let title = '';
        let company = '';
        
        // Look for headings
        const previousHeadings = findPreviousHeadings(largestBlock);
        if (previousHeadings.length > 0) {
          title = previousHeadings[0];
          
          if (previousHeadings.length > 1) {
            company = previousHeadings[1];
          }
        }
        
        return {
          description: largestBlock.innerText.trim(),
          title: title,
          company: company,
          confidence: 70
        };
      }
    }
    
    // No more fallback detection - removed Step 4 to prevent false positives
    console.log('CoverMe: No job detected');
    return null;
  } catch (error) {
    console.error('CoverMe: Error in enhanced job detection:', error);
    return null;
  }
}

// Helper function to count job-related keywords in text
function countJobKeywords(text) {
  const jobTerms = [
    'job description', 'responsibilities', 'requirements', 'qualifications', 
    'experience', 'skills', 'apply', 'position', 'candidate', 'employment',
    'salary', 'benefits', 'degree', 'education', 'background', 'knowledge',
    'abilities', 'proficiency', 'expertise', 'duty', 'duties', 'function',
    'competencies', 'capabilities', 'proficient', 'familiar with', 'team member',
    'career', 'application', 'applicants', 'hire', 'hiring', 'opportunity'
  ];
  
  const lowerText = text.toLowerCase();
  return jobTerms.filter(term => lowerText.includes(term)).length;
}

// Helper function to find elements containing specific text
function findElementsByText(searchText) {
  const elements = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        if (node.innerText && 
            node.innerText.toLowerCase().includes(searchText) &&
            !['script', 'style', 'noscript', 'meta'].includes(node.tagName.toLowerCase())) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    elements.push(node);
  }
  
  return elements;
}

// Helper function to find headings that appear before an element
function findPreviousHeadings(element) {
  const headings = [];
  let current = element.previousElementSibling;
  
  while (current) {
    if (current.tagName.match(/^H[1-6]$/)) {
      headings.unshift(current.innerText.trim());
    }
    current = current.previousElementSibling;
  }
  
  // If no headings found, try parent's previous siblings
  if (headings.length === 0 && element.parentElement) {
    let parent = element.parentElement;
    current = parent.previousElementSibling;
    
    while (current && headings.length < 2) {
      if (current.tagName.match(/^H[1-6]$/)) {
        headings.unshift(current.innerText.trim());
      }
      current = current.previousElementSibling;
    }
  }
  
  return headings;
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
    // Get current URL and page ID
    chrome.storage.local.get(['lastPageId', 'lastDetectedUrl'], function(data) {
      const currentUrl = window.location.href;
      const storedUrl = data.lastDetectedUrl;
      
      // If URL has changed since last detection, clear cached job details
      if (storedUrl !== currentUrl) {
        console.log('CoverMe: URL changed, clearing cached job details');
        chrome.storage.local.remove(['currentJobDetails', 'popupState']);
        
        // Update stored URL
        chrome.storage.local.set({
          lastDetectedUrl: currentUrl,
          lastPageId: Date.now().toString()
        });
      }
      
      // Run new detection
      enhancedJobDetection()
        .then(jobDetails => {
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
        })
        .catch(error => {
          console.error('CoverMe: Error detecting job from popup request:', error);
          sendResponse({ found: false, error: error.message });
        });
    });
    
    return true; // Keep channel open for async response
  }
});

// Run the initialization
init();