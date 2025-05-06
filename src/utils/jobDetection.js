/**
 * Enhanced Job Description Detection Module
 * 
 * A comprehensive approach to detect job descriptions across various websites
 * using a hierarchical detection strategy.
 */

// Site-specific selectors for popular job boards
const siteSelectors = {
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
  "wellfound.com": {
    jobDescription: ".job-description, .section-wrapper",
    jobTitle: ".job-title, .title",
    company: ".company-title, .company"
  },
  "lever.co": {
    jobDescription: ".section-wrapper, .posting-description",
    jobTitle: ".posting-headline h2",
    company: ".main-header-logo img"
  },
  "greenhouse.io": {
    jobDescription: "#content, .app-body",
    jobTitle: ".app-title",
    company: ".company-name"
  },
  "remoteco.com": {
    jobDescription: ".job__description",
    jobTitle: ".job__title",
    company: ".company__name"
  },
  "workatastartup.com": {
    jobDescription: ".job-description",
    jobTitle: ".job-title",
    company: ".company-name"
  },
  "angel.co": {
    jobDescription: ".job-description, .description",
    jobTitle: ".job-title, .title",
    company: ".company-name, .startup-title"
  }
};

/**
 * Main function to detect job information on the current page
 * @returns {Promise<Object|null>} Job data or null if not found
 */
async function detectJobDescription() {
  try {
    console.log("CoverMe: Starting job description detection");
    
    // Try methods in order of reliability
    const jobData = await siteSpecificDetection() ||
                  await semanticSectionDetection() ||
                  await contentClusterDetection() ||
                  await fallbackDetection();
    
    // If we found something, verify and clean it
    if (jobData) {
      const verifiedData = verifyAndCleanJobData(jobData);
      
      if (verifiedData) {
        // Calculate confidence score
        const method = jobData._method || 'fallback';
        verifiedData.confidence = calculateConfidence(verifiedData, method);
        
        console.log(`CoverMe: Job detected with ${verifiedData.confidence}% confidence`);
        console.log("CoverMe: Job data:", verifiedData);
        
        return verifiedData;
      }
    }
    
    console.log("CoverMe: No valid job description found");
    return null;
  } catch (error) {
    console.error("CoverMe: Error detecting job description", error);
    return null;
  }
}

/**
 * Detects job information using site-specific selectors
 * @returns {Promise<Object|null>} Job data or null if not found
 */
async function siteSpecificDetection() {
  try {
    // Get current domain
    const hostname = window.location.hostname;
    const domain = Object.keys(siteSelectors).find(d => hostname.includes(d));
    
    if (!domain) {
      console.log(`CoverMe: No site-specific selectors for ${hostname}`);
      return null;
    }
    
    console.log(`CoverMe: Using site-specific selectors for ${domain}`);
    const selectors = siteSelectors[domain];
    
    // Extract job description
    const descriptionSelector = selectors.jobDescription.split(', ');
    let descriptionElement = null;
    
    for (const selector of descriptionSelector) {
      descriptionElement = document.querySelector(selector);
      if (descriptionElement) break;
    }
    
    if (!descriptionElement) {
      console.log(`CoverMe: No job description found with selectors: ${selectors.jobDescription}`);
      return null;
    }
    
    const descriptionText = extractTextContent(descriptionElement);
    
    if (!descriptionText || descriptionText.length < 100) {
      console.log("CoverMe: Job description text too short or not found");
      return null;
    }
    
    // Extract job title
    const titleSelector = selectors.jobTitle.split(', ');
    let titleElement = null;
    let titleText = '';
    
    for (const selector of titleSelector) {
      titleElement = document.querySelector(selector);
      if (titleElement) {
        titleText = titleElement.innerText.trim();
        break;
      }
    }
    
    // Extract company name
    const companySelector = selectors.company.split(', ');
    let companyElement = null;
    let companyText = '';
    
    for (const selector of companySelector) {
      companyElement = document.querySelector(selector);
      if (companyElement) {
        // Handle image-based company names (for logos)
        if (companyElement.tagName === 'IMG' && companyElement.alt) {
          companyText = companyElement.alt.trim();
        } else {
          companyText = companyElement.innerText.trim();
        }
        break;
      }
    }
    
    return {
      description: descriptionText,
      title: titleText,
      company: companyText,
      _method: 'site-specific'
    };
  } catch (error) {
    console.error("CoverMe: Error in site-specific detection", error);
    return null;
  }
}

/**
 * Detects job information using semantic section detection
 * @returns {Promise<Object|null>} Job data or null if not found
 */
async function semanticSectionDetection() {
  try {
    console.log("CoverMe: Trying semantic section detection");
    
    // Common job section keywords
    const jobSectionKeywords = [
      "job description",
      "responsibilities",
      "requirements",
      "qualifications",
      "about this role",
      "what you'll do",
      "about the job",
      "role overview",
      "position summary",
      "the role",
      "key responsibilities",
      "job summary",
      "duties"
    ];
    
    // Find elements containing these keywords
    const jobSections = findElementsByText(jobSectionKeywords);
    
    if (jobSections.length === 0) {
      console.log("CoverMe: No semantic job sections found");
      return null;
    }
    
    // Extract content from these sections
    let description = '';
    
    for (const section of jobSections) {
      // Try to get the parent element that contains the whole section
      const sectionContent = getParentSectionContent(section);
      
      if (sectionContent && sectionContent.length > 50) {
        description += sectionContent + "\n\n";
      }
    }
    
    if (description.length < 100) {
      console.log("CoverMe: Semantic sections didn't yield enough content");
      return null;
    }
    
    // Find job title - usually in h1 or h2
    const headings = [...document.querySelectorAll('h1, h2')];
    const jobTitle = headings.length > 0 ? headings[0].innerText.trim() : '';
    
    // Try to find company name
    const companySection = findElementsByText([
      "about us", "company", "about the company", "about", "who we are"
    ]);
    
    let companyName = '';
    
    if (companySection.length > 0) {
      const parentElement = companySection[0].closest('section, div, article');
      if (parentElement) {
        // Try to extract company name from this section
        const potentialNames = [...parentElement.querySelectorAll('h1, h2, h3, strong, b')]
          .map(el => el.innerText.trim())
          .filter(text => text.length > 0 && text.length < 50);
        
        if (potentialNames.length > 0) {
          companyName = potentialNames[0];
        }
      }
    }
    
    // If company name still not found, try meta tags
    if (!companyName) {
      const metaOgSite = document.querySelector('meta[property="og:site_name"]');
      if (metaOgSite) {
        companyName = metaOgSite.getAttribute('content');
      }
    }
    
    return {
      description: description.trim(),
      title: jobTitle,
      company: companyName,
      _method: 'semantic'
    };
  } catch (error) {
    console.error("CoverMe: Error in semantic section detection", error);
    return null;
  }
}

/**
 * Detects job information using content clustering
 * @returns {Promise<Object|null>} Job data or null if not found
 */
async function contentClusterDetection() {
  try {
    console.log("CoverMe: Trying content cluster detection");
    
    // Find main content area - often has the most text
    const contentArea = findMainContentArea();
    
    if (!contentArea) {
      console.log("CoverMe: No main content area found");
      return null;
    }
    
    // Find largest text block
    const textBlocks = Array.from(contentArea.querySelectorAll('p, div, section'))
      .filter(el => {
        // Filter out navigation, headers, footers
        const isNav = el.closest('nav, header, footer');
        const isLikelyContent = el.tagName === 'P' || 
                              (el.children.length > 0 && 
                               Array.from(el.children).some(child => 
                                 child.tagName === 'P' || child.tagName === 'UL' || child.tagName === 'OL'));
        
        const text = el.innerText.trim();
        return !isNav && isLikelyContent && text.length > 100;
      })
      .sort((a, b) => b.innerText.length - a.innerText.length);
    
    if (textBlocks.length === 0) {
      console.log("CoverMe: No suitable text blocks found");
      return null;
    }
    
    // Use the largest block as the job description
    const largestBlock = textBlocks[0];
    const description = extractTextContent(largestBlock);
    
    // Check if it looks like a job description
    const jobTermsRegex = /\b(responsibilities|requirements|qualifications|skills|experience|position|opportunity|job|role)\b/i;
    if (!jobTermsRegex.test(description)) {
      console.log("CoverMe: Largest text block doesn't look like a job description");
      return null;
    }
    
    // Try to find job title/company near this block
    let jobTitle = '';
    let companyName = '';
    
    // Look for headings above the content block
    const previousHeadings = getPreviousHeadings(largestBlock);
    if (previousHeadings.length > 0) {
      jobTitle = previousHeadings[0];
      
      // If there are multiple headings, the second could be the company
      if (previousHeadings.length > 1) {
        companyName = previousHeadings[1];
      }
    }
    
    return {
      description: description,
      title: jobTitle,
      company: companyName,
      _method: 'cluster'
    };
  } catch (error) {
    console.error("CoverMe: Error in content cluster detection", error);
    return null;
  }
}

/**
 * Last resort fallback detection
 * @returns {Promise<Object|null>} Job data or null if not found
 */
async function fallbackDetection() {
  try {
    console.log("CoverMe: Trying fallback detection");
    
    // Get all text from the page
    const bodyText = document.body.innerText;
    
    // Skip very short pages
    if (bodyText.length < 500) {
      console.log("CoverMe: Page text too short for fallback detection");
      return null;
    }
    
    // Look for job-like paragraph clusters
    const paragraphs = bodyText.split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 30);
    
    // Get the largest cluster of paragraphs
    let description = '';
    let currentCluster = '';
    let largestCluster = '';
    
    for (const paragraph of paragraphs) {
      if (paragraph.length > 30) {
        currentCluster += paragraph + '\n\n';
      } else if (currentCluster.length > 0) {
        if (currentCluster.length > largestCluster.length) {
          largestCluster = currentCluster;
        }
        currentCluster = '';
      }
    }
    
    // Check last cluster too
    if (currentCluster.length > largestCluster.length) {
      largestCluster = currentCluster;
    }
    
    description = largestCluster;
    
    // Only accept if it looks like a job description
    const jobTermsRegex = /\b(responsibilities|requirements|qualifications|skills|experience|position|opportunity|job|role)\b/i;
    if (!jobTermsRegex.test(description)) {
      console.log("CoverMe: Fallback text doesn't look like a job description");
      return null;
    }
    
    // Try to extract job title and company
    const titleMatch = 
      description.match(/\b(hiring|looking for(?: a)?|seeking(?: a)?|job title|position|role)(?:[:\-])?\s+([^,.]{3,50})\b/i) ||
      document.title.match(/([^|:]+?)(?:at|@|with|for|\||:)([^|:]+)/i);
    
    let jobTitle = '';
    let companyName = '';
    
    if (titleMatch) {
      jobTitle = titleMatch[2] ? titleMatch[2].trim() : '';
      
      // If document title has pattern "Job at Company"
      if (titleMatch[1] && titleMatch[2] && document.title.match(/at|@|with|for/i)) {
        jobTitle = titleMatch[1].trim();
        companyName = titleMatch[2].trim();
      }
    }
    
    // If no job title yet, use first heading
    if (!jobTitle) {
      const firstHeading = document.querySelector('h1, h2');
      if (firstHeading) {
        jobTitle = firstHeading.innerText.trim();
      }
    }
    
    return {
      description: description.trim(),
      title: jobTitle,
      company: companyName,
      _method: 'fallback'
    };
  } catch (error) {
    console.error("CoverMe: Error in fallback detection", error);
    return null;
  }
}

/**
 * Verify and clean job data
 * @param {Object} jobData - Raw job data
 * @returns {Object|null} - Cleaned job data or null if invalid
 */
function verifyAndCleanJobData(jobData) {
  if (!jobData || !jobData.description) {
    return null;
  }
  
  let description = jobData.description;
  
  // Check if it looks like a job posting
  const jobTermsRegex = /\b(responsibilities|requirements|qualifications|skills|experience|position|opportunity|job|role)\b/i;
  
  if (!jobTermsRegex.test(description) || description.length < 100) {
    console.log("CoverMe: Content doesn't look like a job description");
    return null;
  }
  
  // Clean up description
  description = description
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Extract job title from description if not found
  let title = jobData.title || '';
  let company = jobData.company || '';
  
  if (!title) {
    const titleMatch = description.match(/\b(hiring|looking for|seeking)(?:\s+a)?(?:\s+[\w\s]+?)?\s+([\w\s]+)\b/i);
    if (titleMatch && titleMatch[2]) {
      title = titleMatch[2].trim();
    }
  }
  
  // Clean up job title - remove common prefixes
  if (title) {
    title = title
      .replace(/^(job:|position:|title:|role:)/i, '')
      .trim();
  }
  
  // Final checks
  if (description.length < 100) {
    return null;
  }
  
  return {
    description: description,
    title: title,
    company: company
  };
}

/**
 * Calculate confidence score for the detection
 * @param {Object} jobData - Job data
 * @param {string} method - Detection method used
 * @returns {number} - Confidence score (0-100)
 */
function calculateConfidence(jobData, method) {
  let score = 0;
  
  // Base score by detection method
  if (method === 'site-specific') score += 50;
  else if (method === 'semantic') score += 30;
  else if (method === 'cluster') score += 20;
  else score += 10;
  
  // Content-based signals
  if (jobData.description.length > 300) score += 10;
  if (jobData.description.length > 1000) score += 10;
  
  // Job keyword signals
  const keywords = [
    'responsibilities',
    'requirements',
    'qualifications',
    'experience',
    'skills',
    'about the role',
    'job description'
  ];
  
  for (const keyword of keywords) {
    if (jobData.description.toLowerCase().includes(keyword)) {
      score += 5;
      // Cap at 20 points from keywords
      if (score > 50 + 10 + 10 + 20) break;
    }
  }
  
  // Title and company presence
  if (jobData.title && jobData.title.length > 3) score += 10;
  if (jobData.company && jobData.company.length > 2) score += 10;
  
  return Math.min(score, 100);
}

// ------------------- Helper Functions -------------------

/**
 * Find elements containing specific text
 * @param {string[]} keywords - Keywords to search for
 * @returns {Element[]} - Elements containing the keywords
 */
function findElementsByText(keywords) {
  const elements = [];
  const allElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b, div, p, section');
  
  // Convert keywords to lowercase for case-insensitive matching
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  
  for (const element of allElements) {
    const text = element.innerText.toLowerCase();
    
    for (const keyword of lowerKeywords) {
      if (text.includes(keyword)) {
        elements.push(element);
        break;
      }
    }
  }
  
  return elements;
}

/**
 * Extract clean text content from an element
 * @param {Element} element - Element to extract text from
 * @returns {string} - Cleaned text content
 */
function extractTextContent(element) {
  if (!element) return '';
  
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true);
  
  // Remove script and style elements
  const scripts = clone.querySelectorAll('script, style, iframe, img, button');
  scripts.forEach(script => script.remove());
  
  // Get text content
  let text = clone.innerText || clone.textContent || '';
  
  // Clean up whitespace
  text = text.replace(/\s{2,}/g, ' ').trim();
  
  return text;
}

/**
 * Find the main content area of the page
 * @returns {Element|null} - Main content element
 */
function findMainContentArea() {
  // Try common main content selectors
  const selectors = [
    'main',
    '[role="main"]',
    '#main-content',
    '#content',
    '.main-content',
    '.content',
    'article',
    '.article',
    '.post',
    '.job-description'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  
  // Fallback: find the element with the most text
  const contentElements = Array.from(document.querySelectorAll('div, section, article'))
    .filter(el => {
      const isNav = el.closest('nav, header, footer');
      return !isNav && el.innerText.length > 200;
    })
    .sort((a, b) => b.innerText.length - a.innerText.length);
  
  return contentElements.length > 0 ? contentElements[0] : document.body;
}

/**
 * Get the content of a parent section
 * @param {Element} element - Child element
 * @returns {string} - Parent section content
 */
function getParentSectionContent(element) {
  // Look for parent container
  const parent = element.closest('section, article, div, .job-description');
  
  if (parent && parent !== element) {
    return extractTextContent(parent);
  }
  
  // If no suitable parent, get all following siblings until the next heading
  let content = '';
  let current = element.nextElementSibling;
  
  while (current) {
    // Stop when we hit another heading or section
    if (current.tagName.match(/^H[1-6]$/) || 
        current.tagName === 'SECTION' || 
        current.tagName === 'ARTICLE') {
      break;
    }
    
    content += extractTextContent(current) + '\n';
    current = current.nextElementSibling;
  }
  
  return content.trim();
}

/**
 * Get headings that appear before an element
 * @param {Element} element - Element to find headings before
 * @returns {string[]} - Array of heading texts
 */
function getPreviousHeadings(element) {
  const headings = [];
  
  // Try to find a common parent
  const parent = element.closest('div, section, article');
  
  if (parent) {
    // Find all headings in this parent
    const parentHeadings = parent.querySelectorAll('h1, h2, h3');
    
    for (const heading of parentHeadings) {
      // Check if this heading is before our element
      if (element.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_PRECEDING) {
        headings.push(heading.innerText.trim());
      }
    }
  }
  
  // Get closest heading if no headings found
  if (headings.length === 0) {
    let current = element.previousElementSibling;
    
    while (current) {
      if (current.tagName.match(/^H[1-6]$/)) {
        headings.push(current.innerText.trim());
        break;
      }
      current = current.previousElementSibling;
    }
  }
  
  return headings;
}

// Export the main detection function
export default detectJobDescription;