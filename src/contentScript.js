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
    
    // Get the job site selectors and detection logic from the enhanced detection system
    const jobDetails = await enhancedJobDetection();
    
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

// Enhanced job detection logic that implements our hierarchical detection strategy
async function enhancedJobDetection() {
  try {
    // Get current domain
    const hostname = window.location.hostname;
    
    // Step 1: Site-Specific Detection (most reliable)
    const jobSites = {
      "linkedin.com": {
        jobDescription: ".description__text, .show-more-less-html__markup, .jobs-description-content",
        jobTitle: ".top-card-layout__title, .job-detail-title, .jobs-unified-top-card__job-title",
        company: ".topcard__org-name-link, .company-name, .jobs-unified-top-card__company-name"
      },
      "indeed.com": {
        jobDescription: "#jobDescriptionText, .jobsearch-jobDescriptionText",
        jobTitle: ".jobsearch-JobInfoHeader-title, .icl-u-xs-mb--xs",
        company: ".jobsearch-InlineCompanyRating-companyHeader, .icl-u-lg-mr--sm"
      },
      "glassdoor.com": {
        jobDescription: ".jobDescriptionContent, .desc, [data-test='jobDescriptionText']",
        jobTitle: "[data-test='jobTitle'], .css-1vg6q84",
        company: "[data-test='employer-name'], .css-87uc0g"
      },
      "monster.com": {
        jobDescription: ".job-description, .details-content",
        jobTitle: ".job-title, .title",
        company: ".company, .name"
      },
      "ziprecruiter.com": {
        jobDescription: "#job-description, .jobDescriptionSection, [data-testid='job-description']",
        jobTitle: ".job_title, [data-testid='job-title']",
        company: ".hiring_company_text, [data-testid='company-name']"
      },
      "dice.com": {
        jobDescription: "#jobdescSec, .job-description",
        jobTitle: ".jobTitle, .job-title",
        company: ".companyLink, .company-title"
      },
      "careerbuilder.com": {
        jobDescription: ".job-description, .data-display",
        jobTitle: ".data-results-title",
        company: "[data-cb-company]"
      },
      "simplyhired.com": {
        jobDescription: ".viewjob-description, .JobDescription_jobDescription",
        jobTitle: ".viewjob-jobTitle, .JobInfoHeader_jobTitle",
        company: ".viewjob-employerName, .JobInfoHeader_companyName"
      },
      // Add more sites as needed
    };
    
    // Try site-specific detection first
    const domain = Object.keys(jobSites).find(d => hostname.includes(d));
    
    if (domain) {
      console.log(`CoverMe: Using site-specific detection for ${domain}`);
      const selectors = jobSites[domain];
      
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
        
        if (description.length > 100) {
          return {
            description: description,
            title: title || 'Unknown Job Title',
            company: company || 'Unknown Company',
            confidence: 95
          };
        }
      }
    }
    
    // Step 2: Semantic Section Detection
    console.log('CoverMe: Trying semantic section detection');
    
    const jobKeywords = [
      "job description",
      "responsibilities",
      "requirements",
      "qualifications",
      "about this role",
      "what you'll do",
      "about the job",
      "role overview"
    ];
    
    // Find elements containing job-related keywords
    let jobSections = [];
    for (const keyword of jobKeywords) {
      const elements = findElementsByText(keyword.toLowerCase());
      jobSections = jobSections.concat(elements);
    }
    
    if (jobSections.length > 0) {
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
      
      if (description.length > 100) {
        return {
          description: description,
          title: title,
          company: company,
          confidence: 80
        };
      }
    }
    
    // Step 3: Content Cluster Detection
    console.log('CoverMe: Trying content cluster detection');
    const mainContent = 
      document.querySelector('main') || 
      document.querySelector('article') || 
      document.body;
    
    const contentBlocks = Array.from(mainContent.querySelectorAll('div, section, article'))
      .filter(el => {
        const isNav = el.closest('nav, header, footer');
        return !isNav && el.innerText.length > 300;
      })
      .sort((a, b) => b.innerText.length - a.innerText.length);
    
    if (contentBlocks.length > 0) {
      const largestBlock = contentBlocks[0];
      
      // Check if it looks like a job description
      const jobRelatedRegex = /\b(responsibilities|requirements|qualifications|skills|experience|job|role)\b/i;
      
      if (jobRelatedRegex.test(largestBlock.innerText)) {
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
          confidence: 60
        };
      }
    }
    
    // Step 4: Fallback - look for largest text block on page
    console.log('CoverMe: Trying fallback detection');
    const allParagraphs = Array.from(document.querySelectorAll('p'))
      .filter(p => p.innerText.length > 30)
      .sort((a, b) => b.innerText.length - a.innerText.length);
    
    if (allParagraphs.length > 0) {
      const largestParagraph = allParagraphs[0];
      const jobRelatedRegex = /\b(responsibilities|requirements|qualifications|skills|experience|job|role)\b/i;
      
      if (jobRelatedRegex.test(largestParagraph.innerText) && largestParagraph.innerText.length > 300) {
        // Try to extract title from document title
        let title = document.title.split(' | ')[0].split(' - ')[0].trim();
        
        // Try to extract company from meta tags
        let company = '';
        const metaCompany = document.querySelector('meta[property="og:site_name"]');
        if (metaCompany) {
          company = metaCompany.getAttribute('content');
        }
        
        return {
          description: largestParagraph.innerText.trim(),
          title: title,
          company: company,
          confidence: 40
        };
      }
    }
    
    // No job found
    return null;
  } catch (error) {
    console.error('CoverMe: Error in enhanced job detection:', error);
    return null;
  }
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