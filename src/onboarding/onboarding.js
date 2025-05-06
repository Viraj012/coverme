// Onboarding process handler
document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const progress = document.getElementById('progress');
  const steps = document.querySelectorAll('.step');
  const onboardingSteps = document.querySelectorAll('.onboarding-step');
  const getStartedBtn = document.getElementById('get-started-btn');
  const nextBtns = document.querySelectorAll('.next-btn');
  const prevBtns = document.querySelectorAll('.prev-btn');
  const showKeyBtn = document.getElementById('show-key-btn');
  const apiKeyInput = document.getElementById('api-key');
  const completeProfileBtn = document.getElementById('complete-profile-btn');
  const finishBtn = document.getElementById('finish-btn');
  
  // Initialize temporary storage for form data
  let formData = {
    name: '',
    email: '',
    phone: '',
    professionalSummary: '',
    apiKey: ''
  };
  
  // Current step
  let currentStep = 1;
  
  // Update progress bar
  function updateProgress() {
    progress.style.width = ((currentStep - 1) / (steps.length - 1)) * 100 + '%';
    
    // Update active step indicator
    steps.forEach((step, idx) => {
      if (idx < currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
    
    // Show current step, hide others
    onboardingSteps.forEach((step, idx) => {
      if (idx === currentStep - 1) {
        step.classList.remove('hidden');
      } else {
        step.classList.add('hidden');
      }
    });
  }
  
  // Check if basic profile form is valid
  function validateBasicProfile() {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const bioInput = document.getElementById('quick-bio');
    
    if (!nameInput.value || !emailInput.value || !phoneInput.value || !bioInput.value) {
      alert('Please fill in all required fields.');
      return false;
    }
    
    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailInput.value)) {
      alert('Please enter a valid email address.');
      return false;
    }
    
    // Store the data
    formData.name = nameInput.value;
    formData.email = emailInput.value;
    formData.phone = phoneInput.value;
    formData.professionalSummary = bioInput.value;
    
    return true;
  }
  
  // Check API key (basic validation)
  function validateApiKey() {
    if (apiKeyInput.value) {
      formData.apiKey = apiKeyInput.value;
      return true;
    }
    
    // If no key is provided, confirm with user
    return confirm('You haven\'t provided an API key. You can set it up later, but the extension won\'t work until then. Continue anyway?');
  }
  
  // Save profile data to Chrome storage
  function saveProfileData() {
    // Initialize user profile with minimal data
    chrome.storage.local.set({
      userProfile: {
        completed: true,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        professionalSummary: formData.professionalSummary,
        // Initialize with empty arrays for additional data
        skills: [],
        workExperience: [],
        education: [],
        personalTraits: []
      },
      settings: {
        apiKey: formData.apiKey,
        apiKeyConfigured: !!formData.apiKey
      },
      savedTemplates: [],
      preferences: {
        defaultTemplate: 'formal',
        defaultTone: 'professional'
      },
      // Track that onboarding is complete
      onboardingComplete: true
    }, function() {
      console.log('Basic profile saved successfully');
    });
  }
  
  // Event: Get Started button click
  getStartedBtn.addEventListener('click', function() {
    currentStep++;
    updateProgress();
  });
  
  // Event: Next buttons click
  nextBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Validate current step before proceeding
      if (currentStep === 2) {
        if (!validateBasicProfile()) return;
      } else if (currentStep === 3) {
        if (!validateApiKey()) return;
      }
      
      currentStep++;
      updateProgress();
    });
  });
  
  // Event: Previous buttons click
  prevBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      currentStep--;
      updateProgress();
    });
  });
  
  // Event: Show/Hide API key
  showKeyBtn.addEventListener('click', function() {
    const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
    apiKeyInput.setAttribute('type', type);
    showKeyBtn.textContent = type === 'password' ? '👁️' : '🔒';
  });
  
  // Event: Complete Full Profile button
  completeProfileBtn.addEventListener('click', function() {
    // Save basic data first
    saveProfileData();
    
    // Navigate to full profile page
    chrome.tabs.create({
      url: chrome.runtime.getURL('profile/profile.html')
    });
    
    // Close the current tab
    window.close();
  });
  
  // Event: Finish button
  finishBtn.addEventListener('click', function() {
    // Save profile data
    saveProfileData();
    
    // Close onboarding
    window.close();
  });
  
  // Pre-fill form if data exists
  chrome.storage.local.get(['userProfile', 'settings'], function(data) {
    if (data.userProfile) {
      document.getElementById('name').value = data.userProfile.name || '';
      document.getElementById('email').value = data.userProfile.email || '';
      document.getElementById('phone').value = data.userProfile.phone || '';
      document.getElementById('quick-bio').value = data.userProfile.professionalSummary || '';
      
      formData.name = data.userProfile.name || '';
      formData.email = data.userProfile.email || '';
      formData.phone = data.userProfile.phone || '';
      formData.professionalSummary = data.userProfile.professionalSummary || '';
    }
    
    if (data.settings && data.settings.apiKey) {
      apiKeyInput.value = data.settings.apiKey;
      formData.apiKey = data.settings.apiKey;
    }
  });
  
  // Initialize
  updateProgress();
});