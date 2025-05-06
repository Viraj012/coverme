// Popup script - runs when user clicks the extension icon

// DOM elements
const elements = {
    jobDetectionStatus: document.getElementById('job-detection-status'),
    jobDetected: document.getElementById('job-detected'),
    noJobDetected: document.getElementById('no-job-detected'),
    profileIncomplete: document.getElementById('profile-incomplete'),
    apiKeyMissing: document.getElementById('api-key-missing'),
    coverLetterOutput: document.getElementById('cover-letter-output'),
    profileStatus: document.getElementById('profile-status'),
    jobTitle: document.getElementById('job-title'),
    companyName: document.getElementById('company-name'),
    templateSelect: document.getElementById('template-select'),
    toneSelect: document.getElementById('tone-select'),
    generateBtn: document.getElementById('generate-btn'),
    letterContent: document.getElementById('letter-content'),
    editBtn: document.getElementById('edit-btn'),
    // refineBtn: document.getElementById('refine-btn'),
    downloadBtn: document.getElementById('download-btn'),
    saveTemplateBtn: document.getElementById('save-template-btn'),
    setupProfileBtn: document.getElementById('setup-profile-btn'),
    setupApiKeyBtn: document.getElementById('setup-api-key-btn'),
    editProfileBtn: document.getElementById('edit-profile-btn'),
    viewTemplatesBtn: document.getElementById('view-templates-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    manualJobDescription: document.getElementById('manual-job-description'),
    manualJobTitle: document.getElementById('manual-job-title'),
    manualCompanyName: document.getElementById('manual-company-name'),
    manualSubmitBtn: document.getElementById('manual-submit-btn'),
    backBtn: document.getElementById('back-btn'),
    jobBackBtn: document.getElementById('job-back-btn'),
    customPromptBtn: document.getElementById('custom-prompt-btn'),
    customPromptModal: document.getElementById('custom-prompt-modal'),
    customPrompt: document.getElementById('custom-prompt'),
    applyCustomPrompt: document.getElementById('apply-custom-prompt'),
    closeModal: document.querySelector('.close-modal'),
    cancelModal: document.querySelector('.cancel-modal')
};

// Debug log for API key button
// console.log('API Key Button:', elements.setupApiKeyBtn);
  
// State variables
let currentJobDetails = null;
let userProfile = null;
let generatedLetter = '';
let preferences = null;
let jobDetectionAttempted = false; // Track if we've already attempted job detection
  
// Get current page based on visible sections
function getCurrentPage() {
    if (!elements.jobDetectionStatus.classList.contains('hidden')) {
        return 'job-detection';
    } else if (!elements.jobDetected.classList.contains('hidden')) {
        return 'job-detected';
    } else if (!elements.noJobDetected.classList.contains('hidden')) {
        return 'no-job-detected';
    } else if (!elements.coverLetterOutput.classList.contains('hidden')) {
        return 'cover-letter-output';
    } else if (!elements.profileIncomplete.classList.contains('hidden')) {
        return 'profile-incomplete';
    } else if (!elements.apiKeyMissing.classList.contains('hidden')) {
        return 'api-key-missing';
    }
    return 'job-detection'; // Default page
}

// Save current state
function saveCurrentState() {
    const currentState = {
        page: getCurrentPage(),
        timestamp: Date.now(),
        jobDetails: currentJobDetails,
        generatedLetter: elements.letterContent ? elements.letterContent.value : '',
        manualInput: {
            description: elements.manualJobDescription ? elements.manualJobDescription.value : '',
            title: elements.manualJobTitle ? elements.manualJobTitle.value : '',
            company: elements.manualCompanyName ? elements.manualCompanyName.value : ''
        },
        templateStyle: elements.templateSelect ? elements.templateSelect.value : '',
        tone: elements.toneSelect ? elements.toneSelect.value : ''
    };

    chrome.storage.local.set({ popupState: currentState }, () => {
        console.log('State saved:', currentState);
    });
}

// Add state persistence listeners
function addStatePersistenceListeners() {
    // Save state when popup loses focus
    window.addEventListener('blur', saveCurrentState);
    
    // Save state when popup is about to close
    window.addEventListener('beforeunload', saveCurrentState);
    
    // Save state when user interacts with important elements
    const elementsToWatch = [
        'manualJobDescription',
        'manualJobTitle',
        'manualCompanyName',
        'templateSelect',
        'toneSelect',
        'letterContent'
    ];

    elementsToWatch.forEach(elementId => {
        if (elements[elementId]) {
            elements[elementId].addEventListener('change', saveCurrentState);
            elements[elementId].addEventListener('input', debounce(saveCurrentState, 1000));
        }
    });
}

// Restore last saved state
async function restoreLastState() {
    return new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || !tabs.length) {
                console.error('No active tab found during state restoration');
                resolve(false);
                return;
            }
            
            const currentUrl = tabs[0].url;
            
            chrome.storage.local.get(['popupState', 'lastDetectedUrl'], async (data) => {
                if (!data.popupState) {
                    console.log('No saved state found');
                    resolve(false);
                    return;
                }
                
                // Don't restore state if URL has changed
                if (data.lastDetectedUrl !== currentUrl) {
                    console.log('URL changed - not restoring saved state');
                    chrome.storage.local.remove(['popupState']);
                    resolve(false);
                    return;
                }

                const state = data.popupState;
                const oneHourAgo = Date.now() - (60 * 60 * 1000);

                // Only restore state if it's less than 1 hour old
                if (state.timestamp < oneHourAgo) {
                    console.log('Saved state is too old');
                    chrome.storage.local.remove(['popupState']);
                    resolve(false);
                    return;
                }
                
                // Restore job details and generated letter
                if (state.jobDetails) {
                    currentJobDetails = state.jobDetails;
                    // Validate job details to ensure they have required fields
                    if (!currentJobDetails.description || (!currentJobDetails.title && !currentJobDetails.company)) {
                        console.warn('Restored job details are incomplete:', currentJobDetails);
                        currentJobDetails = null;
                    }
                }
                
                generatedLetter = state.generatedLetter;
          
                // Restore page state
                hideAllSections();
                switch (state.page) {
                    case 'job-detected':
                        if (currentJobDetails && currentJobDetails.description) {
                            console.log('Restoring job details from saved state:', currentJobDetails);
                            
                            // Show the job details in the manual input form for confirmation
                            hideAllSections();
                            showNoJobDetected();
                            
                            // Pre-fill the form with the detected details
                            if (elements.manualJobDescription) {
                                elements.manualJobDescription.value = currentJobDetails.description;
                            }
                            if (elements.manualJobTitle) {
                                elements.manualJobTitle.value = currentJobDetails.title || '';
                            }
                            if (elements.manualCompanyName) {
                                elements.manualCompanyName.value = currentJobDetails.company || '';
                            }
                            
                            // Update the status card to show job detected
                            const statusCard = elements.noJobDetected.querySelector('.status-card');
                            if (statusCard) {
                                const statusIcon = statusCard.querySelector('.status-icon');
                                const statusTitle = statusCard.querySelector('h3');
                                const statusText = statusCard.querySelector('p');
                                
                                if (statusIcon) statusIcon.textContent = '✓';
                                if (statusTitle) statusTitle.textContent = 'Job Description Detected';
                                if (statusText) statusText.textContent = 'Please review and confirm the job details below:';
                            }
                        } else {
                            console.log('Invalid job details in restored state');
                            showNoJobDetected();
                        }
                        break;
                    case 'cover-letter-output':
                        if (generatedLetter) {
                            elements.letterContent.value = generatedLetter;
                            showCoverLetterOutput();
                        } else {
                            console.log('No letter content in restored state');
                            showNoJobDetected();
                        }
                        break;
                    case 'no-job-detected':
                        showNoJobDetected();
                        // Restore manual input
                        if (state.manualInput) {
                            elements.manualJobDescription.value = state.manualInput.description || '';
                            elements.manualJobTitle.value = state.manualInput.title || '';
                            elements.manualCompanyName.value = state.manualInput.company || '';
                        }
                        break;
                    default:
                        console.log('Unknown page state:', state.page);
                        resolve(false);
                        return;
                }

                // Restore template and tone selections
                if (elements.templateSelect && state.templateStyle) {
                    elements.templateSelect.value = state.templateStyle;
                }
                if (elements.toneSelect && state.tone) {
                    elements.toneSelect.value = state.tone;
                }

                console.log('State restored successfully');
                resolve(true);
            });
        });
    });
}

// Setup state persistence
function setupStatePersistence() {
    addStatePersistenceListeners();
}

// Initialize popup
function initPopup() {
    console.log('Initializing popup...');
    
    // Load user profile for greeting
    chrome.storage.local.get(['userProfile'], function(data) {
        const usernameElement = document.getElementById('username');
        if (data.userProfile && data.userProfile.name) {
            if (usernameElement) {
                usernameElement.textContent = data.userProfile.name.split(' ')[0]; // Use first name only
            }
        }
    });
    
    // First, hide all sections
    hideAllSections();
    
    // Setup state persistence
    setupStatePersistence();
    
    // Reset job detection flag
    jobDetectionAttempted = false;
    
    // ALWAYS get the current tab's URL to check if we need to clear cached job details
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs || !tabs.length) {
            console.error('No active tab found during initialization');
            return;
        }
        
        const currentUrl = tabs[0].url;
        console.log('Current tab URL:', currentUrl);
        
        // Get the last detected URL from storage
        chrome.storage.local.get(['lastDetectedUrl', 'currentJobDetails'], function(data) {
            const lastUrl = data.lastDetectedUrl;
            const storedJobDetails = data.currentJobDetails;
            
            console.log('Last detected URL:', lastUrl);
            console.log('Stored job details:', storedJobDetails);
            
            // If URL changed or there's no last URL, clear the cached job details and start fresh
            if (!lastUrl || currentUrl !== lastUrl) {
                console.log('URL changed or no previous URL, clearing cached job details');
                
                // Pre-emptively clear any stale job details
                currentJobDetails = null;
                
                // Remove all cached job data
                chrome.storage.local.remove(['currentJobDetails', 'popupState'], function() {
                    // Update the last detected URL
                    chrome.storage.local.set({lastDetectedUrl: currentUrl}, function() {
                        // Always start with job detection for a new URL
                        console.log('Showing job detection status for new URL');
                        showJobDetectionStatus();
                        
                        // Small delay to ensure UI is updated before detection starts
                        setTimeout(() => {
                            detectJobFromCurrentTab();
                        }, 100);
                    });
                });
            } else {
                console.log('URL unchanged, proceeding with normal initialization');
                initializeAfterUrlCheck();
            }
        });
    });
}

// Show job detection status
function showJobDetectionStatus() {
    // Hide all other sections first
    hideAllSections();
    
    // After the hide transition completes, show the job detection status
    setTimeout(() => {
        // Show the job detection status section
        if (elements.jobDetectionStatus) {
            elements.jobDetectionStatus.classList.remove('hidden');
            elements.jobDetectionStatus.classList.remove('fade-out');
        } else {
            console.error('Job detection status element not found');
        }
    }, 300); // Match transition duration from CSS
}

// Helper function to continue initialization after URL check
function initializeAfterUrlCheck() {
    checkApiKey().then(hasApiKey => {
        console.log('Has API Key:', hasApiKey);
        
        if (!hasApiKey) {
            console.log('Showing API Key Missing Section');
            elements.apiKeyMissing.classList.remove('hidden');
            return;
        }

        checkProfile().then(isProfileComplete => {
            console.log('Is profile complete:', isProfileComplete);
            
            if (!isProfileComplete) {
                console.log('Showing Profile Incomplete Section');
                elements.profileIncomplete.classList.remove('hidden');
                return;
            }

            console.log('Profile is complete, proceeding with initialization');
            
            // First, attempt to get latest job details from storage
            chrome.storage.local.get(['currentJobDetails', 'manualInput'], function(data) {
                const storedJobDetails = data.currentJobDetails;
                const manualInput = data.manualInput;
                
                console.log('Stored job details after URL check:', storedJobDetails);
                console.log('Manual input data:', manualInput);
                
                // Check if we have valid job details in storage
                if (storedJobDetails && 
                    storedJobDetails.description && 
                    (storedJobDetails.title || storedJobDetails.company)) {
                    
                    console.log('Found valid job details in storage, using these');
                    
                    // Use the stored job details
                    currentJobDetails = storedJobDetails;
                    
                    // Show the job details in the manual input form for confirmation
                    hideAllSections();
                    showNoJobDetected();
                    
                    // Pre-fill the form with the detected details
                    if (elements.manualJobDescription) {
                        elements.manualJobDescription.value = storedJobDetails.description;
                    }
                    if (elements.manualJobTitle) {
                        elements.manualJobTitle.value = storedJobDetails.title || '';
                    }
                    if (elements.manualCompanyName) {
                        elements.manualCompanyName.value = storedJobDetails.company || '';
                    }
                    
                    // Update the No Job Detection message to reflect that we found a job
                    const statusCard = elements.noJobDetected.querySelector('.status-card');
                    if (statusCard) {
                        const statusIcon = statusCard.querySelector('.status-icon');
                        const statusTitle = statusCard.querySelector('h3');
                        const statusText = statusCard.querySelector('p');
                        
                        if (statusIcon) {
                            // Hide the icon to save space
                            statusIcon.style.display = 'none';
                        }
                        if (statusTitle) statusTitle.textContent = 'Job Description Detected';
                        if (statusText) statusText.textContent = 'Please review and confirm the job details below:';
                    }
                } else if (manualInput && 
                           manualInput.description && 
                           manualInput.description.trim() !== '' &&
                           (manualInput.title || manualInput.company)) {
                    
                    // If we have manual input with description and at least one of title or company
                    // Create a job details object from manual input
                    console.log('Using manual input as job details');
                    currentJobDetails = {
                        description: manualInput.description,
                        title: manualInput.title || 'Unknown Job Title',
                        company: manualInput.company || 'Unknown Company'
                    };
                    
                    // Show job details in the manual input form for confirmation
                    hideAllSections();
                    showNoJobDetected();
                    
                    // Pre-fill the form with the manual input details
                    if (elements.manualJobDescription) {
                        elements.manualJobDescription.value = manualInput.description;
                    }
                    if (elements.manualJobTitle) {
                        elements.manualJobTitle.value = manualInput.title || '';
                    }
                    if (elements.manualCompanyName) {
                        elements.manualCompanyName.value = manualInput.company || '';
                    }
                    
                    // Update the No Job Detection message to reflect that we found a job
                    const statusCard = elements.noJobDetected.querySelector('.status-card');
                    if (statusCard) {
                        const statusIcon = statusCard.querySelector('.status-icon');
                        const statusTitle = statusCard.querySelector('h3');
                        const statusText = statusCard.querySelector('p');
                        
                        if (statusIcon) {
                            // Hide the icon to save space
                            statusIcon.style.display = 'none';
                        }
                        if (statusTitle) statusTitle.textContent = 'Job Description Detected';
                        if (statusText) statusText.textContent = 'Please review and confirm the job details below:';
                    }
                } else {
                    console.log('No valid job details in storage, trying to restore state');
                    
                    // Try to restore last popup state
                    restoreLastState().then((stateRestored) => {
                        if (stateRestored) {
                            console.log('State restored successfully');
                        } else {
                            console.log('No state to restore, checking for manual input');
                            
                            // Check for manual input (for the form values)
                            chrome.storage.local.get(['manualInput'], function(data) {
                                if (data.manualInput && 
                                    data.manualInput.description && 
                                    data.manualInput.description.trim() !== '') {
                                    
                                    console.log('Manual input found (for form):', data.manualInput);
                                    
                                    if (elements.manualJobDescription) {
                                        elements.manualJobDescription.value = data.manualInput.description || '';
                                    }
                                    if (elements.manualJobTitle) {
                                        elements.manualJobTitle.value = data.manualInput.title || '';
                                    }
                                    if (elements.manualCompanyName) {
                                        elements.manualCompanyName.value = data.manualInput.company || '';
                                    }
                                    
                                    showNoJobDetected();
                                } else {
                                    console.log('No manual input found, starting job detection');
                                    
                                    // Start job detection
                                    elements.jobDetectionStatus.classList.remove('hidden');
                                    
                                    // Small delay to ensure UI is updated before detection starts
                                    setTimeout(() => {
                                        detectJobFromCurrentTab();
                                    }, 100);
                                }
                            });
                        }
                    });
                }
            });
        });
    });
}

// Show profile incomplete message
function showProfileIncomplete() {
    // Hide all sections with transition
    hideAllSections();
    
    // After the hide transition completes, show the profile incomplete message
    setTimeout(() => {
        elements.jobDetectionStatus.classList.add('hidden');
        elements.profileIncomplete.classList.remove('hidden');
        elements.profileIncomplete.classList.remove('fade-out');
        elements.jobDetected.classList.add('hidden');
        elements.noJobDetected.classList.add('hidden');
        elements.coverLetterOutput.classList.add('hidden');
        elements.apiKeyMissing.classList.add('hidden');
    }, 300); // Match transition duration from CSS
}
  
// Show API key missing message
function showApiKeyMissing() {
    // Hide all sections with transition
    hideAllSections();
    
    // After the hide transition completes, show the API key missing message
    setTimeout(() => {
        elements.jobDetectionStatus.classList.add('hidden');
        elements.profileIncomplete.classList.add('hidden');
        elements.jobDetected.classList.add('hidden');
        elements.noJobDetected.classList.add('hidden');
        elements.coverLetterOutput.classList.add('hidden');
        elements.apiKeyMissing.classList.remove('hidden');
        elements.apiKeyMissing.classList.remove('fade-out');
    }, 300); // Match transition duration from CSS
}
  
// Show job detected UI
function showJobDetected() {
    // First hide all sections with transition
    hideAllSections();
    
    // After the hide transition completes, show the job detected section
    setTimeout(() => {
        // Explicitly ensure no job detected is hidden
        if (elements.noJobDetected) {
            elements.noJobDetected.classList.add('hidden');
        }
        
        // Then show job detected section
        elements.jobDetected.classList.remove('hidden');
        elements.jobDetected.classList.remove('fade-out');
        
        // Check if currentJobDetails exists and has valid data
        if (!currentJobDetails || (!currentJobDetails.title && !currentJobDetails.company)) {
            console.error('Invalid job details:', currentJobDetails);
            showNoJobDetected();
            return;
        }
        
        // Update job details
        elements.jobTitle.textContent = currentJobDetails.title || 'Unknown Job Title';
        elements.companyName.textContent = currentJobDetails.company || 'Unknown Company';

        // Clear manual input fields if they exist
        if (elements.manualJobDescription) {
            elements.manualJobDescription.value = '';
            elements.manualJobTitle.value = '';
            elements.manualCompanyName.value = '';
        }
        
        // Double check we're displaying reasonable data
        console.log('Showing job with title:', elements.jobTitle.textContent);
        console.log('Showing job with company:', elements.companyName.textContent);
        
        // Final verification that noJobDetected is hidden
        console.log('Verifying noJobDetected is hidden:', elements.noJobDetected.classList.contains('hidden'));
        if (!elements.noJobDetected.classList.contains('hidden')) {
            console.error('noJobDetected should be hidden but is not - forcing hidden state');
            elements.noJobDetected.classList.add('hidden');
        }
    }, 300); // Match transition duration from CSS
}
  
// Show no job detected message
function showNoJobDetected() {
    // Hide all sections with transition
    hideAllSections();
    
    // After the hide transition completes, show the no job detected section
    setTimeout(() => {
        elements.jobDetectionStatus.classList.add('hidden');
        elements.profileIncomplete.classList.add('hidden');
        elements.jobDetected.classList.add('hidden');
        elements.noJobDetected.classList.remove('hidden');
        elements.noJobDetected.classList.remove('fade-out');
        elements.coverLetterOutput.classList.add('hidden');
        elements.apiKeyMissing.classList.add('hidden');
    }, 300); // Match transition duration from CSS
}
  
// Show cover letter output
function showCoverLetterOutput() {
    // Hide all sections with transition
    hideAllSections();
    
    // After the hide transition completes, show the cover letter output
    setTimeout(() => {
        elements.jobDetectionStatus.classList.add('hidden');
        elements.profileIncomplete.classList.add('hidden');
        elements.jobDetected.classList.add('hidden');
        elements.noJobDetected.classList.add('hidden');
        elements.coverLetterOutput.classList.remove('hidden');
        elements.coverLetterOutput.classList.remove('fade-out');
        elements.apiKeyMissing.classList.add('hidden');
    }, 300); // Match transition duration from CSS
}
  
// Setup event listeners
function setupEventListeners() {
    // Generate cover letter button
    if (elements.generateBtn) {
        elements.generateBtn.addEventListener('click', generateCoverLetter);
    }
    
    // Back button - return to previous page
    if (elements.backBtn) {
        elements.backBtn.addEventListener('click', () => {
            // First add fade-out to current view
            elements.coverLetterOutput.classList.add('fade-out');
            
            setTimeout(() => {
                // If we have current job details, go back to job details page
                if (currentJobDetails && currentJobDetails.description) {
                    showJobDetected();
                } else {
                    // Otherwise go back to manual input, preserving any saved input
                    chrome.storage.local.get(['manualInput'], function(data) {
                        if (data.manualInput) {
                            elements.manualJobDescription.value = data.manualInput.description || '';
                            elements.manualJobTitle.value = data.manualInput.title || '';
                            elements.manualCompanyName.value = data.manualInput.company || '';
                        }
                        showNoJobDetected();
                    });
                }
            }, 300);
        });
    }
    
    // Edit button - make textarea editable
    if (elements.editBtn) {
        elements.editBtn.addEventListener('click', function() {
            elements.letterContent.readOnly = false;
            elements.letterContent.focus();
            elements.letterContent.classList.add('editing');
        });
    }
    
    // Download button - download as text file
    if (elements.downloadBtn) {
        elements.downloadBtn.addEventListener('click', downloadCoverLetter);
    }
    
    // Save as template button
    if (elements.saveTemplateBtn) {
        elements.saveTemplateBtn.addEventListener('click', saveAsTemplate);
    }
    
    // Setup profile button
    if (elements.setupProfileBtn) {
        elements.setupProfileBtn.addEventListener('click', function() {
            chrome.tabs.create({
                url: chrome.runtime.getURL('profile/profile.html')
            });
        });
    }
    
    // Edit profile button
    if (elements.editProfileBtn) {
        elements.editProfileBtn.addEventListener('click', function() {
            chrome.tabs.create({
                url: chrome.runtime.getURL('profile/profile.html')
            });
        });
    }
    
    // View templates button
    if (elements.viewTemplatesBtn) {
        elements.viewTemplatesBtn.addEventListener('click', function() {
            chrome.tabs.create({
                url: chrome.runtime.getURL('templates/templates.html')
            });
        });
    }

    // Manual job description submission
    if (elements.manualSubmitBtn && elements.manualJobDescription) {
        elements.manualSubmitBtn.addEventListener('click', handleManualSubmission);
    }

    // Setup API key button with debug
    if (elements.setupApiKeyBtn) {
        console.log('Adding click listener to API Key button');
        elements.setupApiKeyBtn.addEventListener('click', function() {
            console.log('API Key button clicked');
            chrome.tabs.create({
                url: chrome.runtime.getURL('settings/settings.html')
            });
        });
    } else {
        console.error('API Key button not found in DOM');
    }

    // Job back button - return to manual input with preserved data
    if (elements.jobBackBtn) {
        elements.jobBackBtn.addEventListener('click', function() {
            // First add fade-out to current view
            elements.jobDetected.classList.add('fade-out');
            
            setTimeout(() => {
                // Clear current job details but preserve manual input
                currentJobDetails = null;
                chrome.storage.local.get(['manualInput'], function(data) {
                    if (data.manualInput) {
                        if (elements.manualJobDescription) {
                            elements.manualJobDescription.value = data.manualInput.description || '';
                        }
                        if (elements.manualJobTitle) {
                            elements.manualJobTitle.value = data.manualInput.title || '';
                        }
                        if (elements.manualCompanyName) {
                            elements.manualCompanyName.value = data.manualInput.company || '';
                        }
                    }
                    showNoJobDetected();
                });
            }, 300);
        });
    }

    // Auto-save manual input fields
    if (elements.manualJobDescription) {
        elements.manualJobDescription.addEventListener('input', debounce(saveManualInput, 500));
    }
    if (elements.manualJobTitle) {
        elements.manualJobTitle.addEventListener('input', debounce(saveManualInput, 500));
    }
    if (elements.manualCompanyName) {
        elements.manualCompanyName.addEventListener('input', debounce(saveManualInput, 500));
    }

    // Custom prompt button
    if (elements.customPromptBtn) {
        elements.customPromptBtn.addEventListener('click', () => {
            if (elements.customPromptModal) {
                // Remove hidden class first
                elements.customPromptModal.classList.remove('hidden');
                
                // Force a reflow before adding 'show' class to ensure animation works
                void elements.customPromptModal.offsetWidth;
                
                // Add show class to trigger animation
                setTimeout(() => {
                    elements.customPromptModal.classList.add('show');
                    if (elements.customPrompt) {
                        elements.customPrompt.focus();
                    }
                }, 10);
            }
        });
    }
    
    // Settings button
    if (elements.settingsBtn) {
        console.log('Adding click listener to Settings button');
        elements.settingsBtn.addEventListener('click', function() {
            console.log('Settings button clicked');
            
            // Add ripple animation effect before opening settings
            const btn = elements.settingsBtn;
            
            // Create and append ripple element
            const ripple = document.createElement('span');
            ripple.classList.add('settings-ripple');
            btn.appendChild(ripple);
            
            // Trigger animation and open settings page
            setTimeout(() => {
                // Open settings page in a new tab
                chrome.tabs.create({
                    url: chrome.runtime.getURL('settings/settings.html')
                });
                
                // Remove the ripple element after animation
                setTimeout(() => {
                    if (ripple.parentNode === btn) {
                        btn.removeChild(ripple);
                    }
                }, 600);
            }, 200);
        });
    } else {
        console.error('Settings button not found in DOM');
    }

    // Close modal handlers
    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', closeCustomPromptModal);
    }
    if (elements.cancelModal) {
        elements.cancelModal.addEventListener('click', closeCustomPromptModal);
    }
    if (elements.customPromptModal) {
        elements.customPromptModal.addEventListener('click', (e) => {
            if (e.target === elements.customPromptModal) {
                closeCustomPromptModal();
            }
        });
    }

    // Apply custom prompt
    if (elements.applyCustomPrompt) {
        elements.applyCustomPrompt.addEventListener('click', handleCustomPrompt);
    }
}
  
// Generate cover letter
async function generateCoverLetter() {
    const hasApiKey = await checkApiKey();
    if (!hasApiKey) {
        showError('Please configure your API key first');
        return;
    }

    // Validate current job details
    if (!currentJobDetails || !currentJobDetails.description) {
        showError('No job description found. Please try again or enter manually.');
        return;
    }

    // Load user profile
    try {
        const profile = await new Promise((resolve) => {
            chrome.storage.local.get(['userProfile'], function(data) {
                resolve(data.userProfile);
            });
        });

        if (!profile || !profile.name) {
            showError('Please complete your profile first');
            return;
        }

        const templateStyle = elements.templateSelect.value;
        const tone = elements.toneSelect.value;
        
        // Save preferences
        chrome.storage.local.set({
            preferences: {
                defaultTemplate: templateStyle,
                defaultTone: tone
            }
        });
        
        // Show loading state
        elements.generateBtn.disabled = true;
        elements.generateBtn.textContent = 'Generating...';
        
        try {
            // Send request to background script for AI generation
            const response = await chrome.runtime.sendMessage({
                action: 'generateCoverLetter',
                jobDetails: currentJobDetails,
                userProfile: profile,
                templateStyle: templateStyle,
                tone: tone
            });
            
            if (response.status === 'success') {
                // Display the generated letter
                generatedLetter = response.coverLetter;
                elements.letterContent.value = generatedLetter;
                
                // First add fade-out to current view
                elements.jobDetected.classList.add('fade-out');
                
                // After the transition completes, show the output section
                setTimeout(() => {
                    showCoverLetterOutput();
                }, 300);
            } else {
                showError('Failed to generate cover letter: ' + response.message);
            }
        } catch (error) {
            console.error('Error generating cover letter:', error);
            showError('Failed to generate cover letter. Please try again.');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showError('Failed to load profile. Please try again.');
    } finally {
        // Reset button state
        elements.generateBtn.disabled = false;
        elements.generateBtn.textContent = 'Generate Cover Letter';
    }
}
  
// Download cover letter as text file
function downloadCoverLetter() {
    // Get current letter content (might have been edited)
    const content = elements.letterContent.value;
    
    if (!content || content.trim() === '') {
        showError('No content to download');
        return;
    }
    
    // Create job title and company name for filename
    let jobTitle = 'Job';
    let companyName = 'Company';
    
    if (currentJobDetails) {
        jobTitle = currentJobDetails.title || 'Job';
        companyName = currentJobDetails.company || 'Company';
    }
    
    // Clean filenames to remove special characters
    jobTitle = jobTitle.replace(/[^a-zA-Z0-9]/g, '');
    companyName = companyName.replace(/[^a-zA-Z0-9]/g, '');
    
    // Create filename
    const filename = `CoverLetter-${companyName}-${jobTitle}.txt`;
    
    // Create a blob and download link
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    // Show notification
    showNotification('Cover letter downloaded!');
}
  
// Save the current letter as a template
function saveAsTemplate() {
    // Get current letter content
    const content = elements.letterContent.value;
    
    if (!content || content.trim() === '') {
        showError('No content to save as template');
        return;
    }
    
    let jobTitle = 'Job';
    let companyName = 'Company';
    
    if (currentJobDetails) {
        jobTitle = currentJobDetails.title || 'Job';
        companyName = currentJobDetails.company || 'Company';
    }
    
    // Create template object
    const template = {
        id: Date.now().toString(), // Unique ID
        name: `${companyName} - ${jobTitle}`,
        content: content,
        createdAt: new Date().toISOString()
    };
    
    // Get existing templates and add the new one
    chrome.storage.local.get(['savedTemplates'], function(data) {
        const savedTemplates = data.savedTemplates || [];
        savedTemplates.push(template);
        
        // Save updated templates
        chrome.storage.local.set({ savedTemplates: savedTemplates }, function() {
            showNotification('Cover letter saved as template!');
        });
    });
}
  
// Show a notification message
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Style the notification
    notification.style.position = 'fixed';
    notification.style.bottom = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = '#4CAF50';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    notification.style.zIndex = '10000';
    notification.style.transition = 'opacity 0.5s';
    notification.style.opacity = '1';
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}
  
// Show an error message
function showError(message) {
    console.error('Error:', message);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Style the error message
    errorDiv.style.backgroundColor = '#f8d7da';
    errorDiv.style.color = '#721c24';
    errorDiv.style.padding = '10px';
    errorDiv.style.marginBottom = '10px';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.border = '1px solid #f5c6cb';
    
    // Find where to insert the error message
    if (elements.generateBtn && elements.generateBtn.parentNode) {
        // Insert error message before the generate button
        elements.generateBtn.parentNode.insertBefore(errorDiv, elements.generateBtn);
    } else {
        // Fallback - append to body
        document.body.appendChild(errorDiv);
    }
    
    // Remove error message after 3 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 3000);
}
  
// Save manual input to storage
function saveManualInput() {
    // Check if elements exist
    if (!elements.manualJobDescription || !elements.manualJobTitle || !elements.manualCompanyName) {
        console.error('Manual input fields not found');
        return;
    }
    
    const manualInput = {
        description: elements.manualJobDescription.value,
        title: elements.manualJobTitle.value,
        company: elements.manualCompanyName.value,
        lastUpdated: new Date().toISOString()
    };
    
    chrome.storage.local.set({ manualInput }, function() {
        console.log('Manual input saved:', manualInput);
    });
}
  
// Restore manual input when popup opens
function restoreManualInput(callback) {
    chrome.storage.local.get(['manualInput', 'currentJobDetails'], function(data) {
        let inputFound = false;
        
        if (data.currentJobDetails && 
            data.currentJobDetails.description && 
            (data.currentJobDetails.title || data.currentJobDetails.company)) {
            
            currentJobDetails = data.currentJobDetails;
            console.log('Restoring job details from storage:', currentJobDetails);
            showJobDetected();
            inputFound = true;
        } else if (data.manualInput && data.manualInput.description) {
            if (elements.manualJobDescription) {
                elements.manualJobDescription.value = data.manualInput.description || '';
            }
            if (elements.manualJobTitle) {
                elements.manualJobTitle.value = data.manualInput.title || '';
            }
            if (elements.manualCompanyName) {
                elements.manualCompanyName.value = data.manualInput.company || '';
            }
            
            showNoJobDetected();
            inputFound = true;
        }
        
        if (callback && typeof callback === 'function') {
            callback(inputFound);
        }
    });
}
  
// Function to handle manual submission
function handleManualSubmission() {
    // Check if elements exist
    if (!elements.manualJobDescription || !elements.manualJobTitle || !elements.manualCompanyName) {
        console.error('Manual input fields not found');
        return;
    }
    
    const description = elements.manualJobDescription.value.trim();
    const title = elements.manualJobTitle.value.trim();
    const company = elements.manualCompanyName.value.trim();
    
    if (!description) {
        alert('Please enter a job description');
        return;
    }
    
    currentJobDetails = {
        description: description,
        title: title || 'Unknown Job Title',
        company: company || 'Unknown Company'
    };
    
    console.log('Manual job details submitted:', currentJobDetails);
    
    // Save to storage
    chrome.storage.local.set({ 
        currentJobDetails: currentJobDetails,
        manualInput: {
            description: description,
            title: title,
            company: company
        }
    }, function() {
        // First add fade-out to noJobDetected
        elements.noJobDetected.classList.add('fade-out');
        
        // After the transition completes, update UI and show job detected view
        setTimeout(() => {
            // Update UI elements
            elements.jobTitle.textContent = currentJobDetails.title;
            elements.companyName.textContent = currentJobDetails.company;
            
            // Switch to job detected view
            showJobDetected();
        }, 300);
    });
}
  
// Function to close the custom prompt modal
function closeCustomPromptModal() {
    if (!elements.customPromptModal) return;
    
    // Add the 'show' class if needed
    if (!elements.customPromptModal.classList.contains('show')) {
        elements.customPromptModal.classList.add('show');
    }
    
    // Remove the 'show' class to start the animation
    elements.customPromptModal.classList.remove('show');
    
    // After animation completes, hide the modal
    setTimeout(() => {
        elements.customPromptModal.classList.add('hidden');
        if (elements.customPrompt) {
            elements.customPrompt.value = '';
        }
    }, 300);
}
  
// Function to handle custom prompt submission
async function handleCustomPrompt() {
    if (!elements.customPrompt || !elements.applyCustomPrompt || !elements.letterContent) {
        console.error('Custom prompt elements not found');
        return;
    }
    
    const customInstructions = elements.customPrompt.value.trim();
    
    if (!customInstructions) {
        alert('Please enter your instructions for modifying the cover letter.');
        return;
    }

    // Show loading state
    elements.applyCustomPrompt.disabled = true;
    elements.applyCustomPrompt.textContent = 'Applying changes...';

    try {
        // Get the current letter content
        const currentLetter = elements.letterContent.value;

        if (!currentLetter || currentLetter.trim() === '') {
            throw new Error('No cover letter content to modify');
        }

        // Send message to background script for AI processing
        const response = await chrome.runtime.sendMessage({
            action: 'customEditCoverLetter',
            currentLetter: currentLetter,
            customInstructions: customInstructions
        });

        if (response.status === 'success') {
            // Update the letter content
            elements.letterContent.value = response.coverLetter;
            closeCustomPromptModal();
        } else {
            throw new Error(response.message || 'Failed to apply changes');
        }
    } catch (error) {
        console.error('Error applying custom changes:', error);
        alert('Failed to apply changes: ' + error.message);
    } finally {
        // Reset button state
        elements.applyCustomPrompt.disabled = false;
        elements.applyCustomPrompt.textContent = 'Apply Changes';
    }
}
  
// Check if API key is configured
async function checkApiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], function(data) {
            const hasApiKey = data.settings && data.settings.apiKey ? true : false;
            console.log('API key check result:', hasApiKey);
            resolve(hasApiKey);
        });
    });
}
  
// Check if profile is complete
async function checkProfile() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userProfile'], function(data) {
            console.log('Profile data:', data.userProfile);
            const profile = data.userProfile || {};
            
            // Check if all required fields are present and not empty
            const isComplete = profile && 
                profile.name && profile.name.trim() !== '' &&
                profile.email && profile.email.trim() !== '' &&
                profile.phone && profile.phone.trim() !== '' &&
                profile.professionalSummary && profile.professionalSummary.trim() !== '';
            
            console.log('Profile complete:', isComplete);
            resolve(isComplete);
        });
    });
}
  
// Hide all sections with transition
function hideAllSections() {
  // Add fade-out class to all sections first
  if (elements.jobDetectionStatus) {
    elements.jobDetectionStatus.classList.add('fade-out');
  }
  if (elements.jobDetected) {
    elements.jobDetected.classList.add('fade-out');
  }
  if (elements.noJobDetected) {
    elements.noJobDetected.classList.add('fade-out');
  }
  if (elements.profileIncomplete) {
    elements.profileIncomplete.classList.add('fade-out');
  }
  if (elements.coverLetterOutput) {
    elements.coverLetterOutput.classList.add('fade-out');
  }
  if (elements.apiKeyMissing) {
    elements.apiKeyMissing.classList.add('fade-out');
  }
  
  // After transition, hide all sections
  setTimeout(() => {
    if (elements.jobDetectionStatus) {
      elements.jobDetectionStatus.classList.add('hidden');
    }
    if (elements.jobDetected) {
      elements.jobDetected.classList.add('hidden');
    }
    if (elements.noJobDetected) {
      elements.noJobDetected.classList.add('hidden');
    }
    if (elements.profileIncomplete) {
      elements.profileIncomplete.classList.add('hidden');
    }
    if (elements.coverLetterOutput) {
      elements.coverLetterOutput.classList.add('hidden');
    }
    if (elements.apiKeyMissing) {
      elements.apiKeyMissing.classList.add('hidden');
    }
  }, 300); // Match transition duration from CSS
}
  
// This function runs once when a content script is not yet ready but will be needed
function injectContentScriptIfNeeded(tabId, callback) {
    console.log('Checking if content script needs to be injected');
    
    // First try to message the content script to see if it's already loaded
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, function(response) {
        // If we get a runtime error, the content script isn't loaded
        if (chrome.runtime.lastError) {
            console.log('Content script not loaded, injecting it now');
            
            // Inject the content script
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error injecting content script:', chrome.runtime.lastError);
                    if (callback) callback(false);
                    return;
                }
                
                console.log('Content script injected successfully');
                
                // Give it a moment to initialize
                setTimeout(function() {
                    if (callback) callback(true);
                }, 200);
            });
        } else {
            console.log('Content script already loaded');
            if (callback) callback(true);
        }
    });
}

// Detect job description from current tab with improved error handling
async function detectJobFromCurrentTab() {
    if (jobDetectionAttempted) {
        console.log('Job detection already attempted, skipping');
        if (currentJobDetails && currentJobDetails.description) {
            console.log('We already have job details, showing job details for confirmation');
            showNoJobDetected(); // Show the manual job input screen with the detected details
            
            // Pre-fill the form with the detected details
            if (elements.manualJobDescription && currentJobDetails.description) {
                elements.manualJobDescription.value = currentJobDetails.description;
            }
            if (elements.manualJobTitle && currentJobDetails.title) {
                elements.manualJobTitle.value = currentJobDetails.title;
            }
            if (elements.manualCompanyName && currentJobDetails.company) {
                elements.manualCompanyName.value = currentJobDetails.company;
            }
        } else {
            showNoJobDetected();
        }
        return;
    }
    
    jobDetectionAttempted = true;
    
    try {
        // Get the current active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tabs || tabs.length === 0) {
            console.error('No active tab found');
            showNoJobDetected();
            return;
        }
        
        const currentTab = tabs[0];
        const currentUrl = currentTab.url;

        // Check if we're on a valid page
        if (!currentTab || !currentUrl || currentUrl.startsWith('chrome://')) {
            console.log('Not a valid page for job detection:', currentUrl);
            showNoJobDetected();
            return;
        }

        // Store the current URL for future reference
        chrome.storage.local.set({ lastDetectedUrl: currentUrl });

        console.log('Sending detectJob message to tab:', currentTab.id);
        
        // Set a timeout to show "no job detected" if we don't get a response
        const timeoutId = setTimeout(() => {
            console.log('Job detection timed out');
            // Check if we already have job details before showing no job detected
            if (currentJobDetails && currentJobDetails.description) {
                console.log('We already have job details, showing job detected UI');
                showJobDetected();
            } else {
                showNoJobDetected();
            }
        }, 5000); // 5 second timeout
        
        // Add a wrapper function to ensure proper response handling
        function handleDetectionResponse(response) {
            clearTimeout(timeoutId); // Clear the timeout
            
            if (chrome.runtime.lastError) {
                console.log('Content script not ready, trying to inject:', chrome.runtime.lastError);
                
                // Try to inject the content script and then try again
                injectContentScriptIfNeeded(currentTab.id, function(success) {
                    if (success) {
                        console.log('Content script injected, retrying detection');
                        // Reset detection flag and try again
                        jobDetectionAttempted = false;
                        detectJobFromCurrentTab();
                    } else {
                        console.error('Could not inject content script');
                        showNoJobDetected();
                    }
                });
                return;
            }

            if (!response) {
                console.log('No response from content script');
                showNoJobDetected();
                return;
            }

            console.log('Received response from content script:', response);
            
            if (response.found) {
                // Debug the response content
                console.log('Job description length:', response.description ? response.description.length : 0);
                console.log('Job title:', response.title);
                console.log('Company name:', response.company);
                
                // Validate job details - must have description
                if (!response.description) {
                    console.error('Job details missing description');
                    showNoJobDetected();
                    return;
                }
                
                // Job details found - create a structured clean object
                const jobData = {
                    title: response.title || 'Unknown Job Title',
                    company: response.company || 'Unknown Company',
                    description: response.description
                };

                console.log('Clean job details created:', jobData);
                
                // Save to global state
                currentJobDetails = { ...jobData };
                
                // First, verify the data in memory
                console.log('Verifying in-memory job details:', currentJobDetails);
                
                // Save to storage with additional verification
                chrome.storage.local.set({ 
                    currentJobDetails: jobData,
                    // Also save as manual input as a backup
                    manualInput: {
                        description: jobData.description,
                        title: jobData.title,
                        company: jobData.company,
                        lastUpdated: new Date().toISOString()
                    },
                    // Update the last detected URL
                    lastDetectedUrl: currentUrl
                }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving job details:', chrome.runtime.lastError);
                        showNoJobDetected();
                        return;
                    }
                    
                    // Display the job information in the manual input form for confirmation
                    hideAllSections();
                    showNoJobDetected();
                    
                    // Pre-fill the form with the detected details
                    if (elements.manualJobDescription) {
                        elements.manualJobDescription.value = jobData.description;
                    }
                    if (elements.manualJobTitle) {
                        elements.manualJobTitle.value = jobData.title;
                    }
                    if (elements.manualCompanyName) {
                        elements.manualCompanyName.value = jobData.company;
                    }
                    
                    // Update the No Job Detection message to reflect that we found a job
                    const statusCard = elements.noJobDetected.querySelector('.status-card');
                    if (statusCard) {
                        const statusIcon = statusCard.querySelector('.status-icon');
                        const statusTitle = statusCard.querySelector('h3');
                        const statusText = statusCard.querySelector('p');
                        
                        if (statusIcon) {
                            // Hide the icon to save space
                            statusIcon.style.display = 'none';
                        }
                        if (statusTitle) statusTitle.textContent = 'Job Description Detected';
                        if (statusText) statusText.textContent = 'Please review and confirm the job details below:';
                    }
                });
            } else {
                console.log('No job found by content script');
                showNoJobDetected();
            }
        }
        
        // Send message to content script to detect job with proper callback
        chrome.tabs.sendMessage(currentTab.id, { action: 'detectJob' }, handleDetectionResponse);
    } catch (error) {
        console.error('Error detecting job:', error);
        showNoJobDetected();
    }
}
  
// Debounce function to limit how often the save happens
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
  
// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing popup');
    
    // Check that all DOM elements are properly found
    const missingElements = Object.entries(elements)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
    
    if (missingElements.length > 0) {
        console.warn('Missing DOM elements:', missingElements);
    }
    
    setupEventListeners();
    initPopup();
});