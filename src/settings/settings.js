// Settings Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const apiKeyForm = document.getElementById('api-key-form');
  const apiKeyInput = document.getElementById('api-key');
  const showKeyBtn = document.getElementById('show-key-btn');
  const verifyKeyBtn = document.getElementById('verify-key-btn');
  const saveKeyBtn = document.getElementById('save-key-btn');
  const apiKeyStatus = document.getElementById('api-key-status');
  
  const preferencesForm = document.getElementById('preferences-form');
  const defaultTemplate = document.getElementById('default-template');
  const defaultTone = document.getElementById('default-tone');
  const preferencesStatus = document.getElementById('preferences-status');
  
  const exportProfileBtn = document.getElementById('export-profile-btn');
  const importProfileInput = document.getElementById('import-profile');
  const resetDataBtn = document.getElementById('reset-data-btn');
  const confirmResetBtn = document.getElementById('confirm-reset-btn');
  const resetModal = document.getElementById('reset-modal');
  const closeModalBtns = document.querySelectorAll('.close-modal, .cancel-modal');
  
  const backBtn = document.getElementById('back-btn');
  
  // Load saved settings
  loadSettings();
  
  // Show/Hide API Key
  showKeyBtn.addEventListener('click', function() {
    const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
    apiKeyInput.setAttribute('type', type);
    showKeyBtn.textContent = type === 'password' ? '👁️' : '🔒';
  });
  
  // Verify API Key
  verifyKeyBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatusMessage(apiKeyStatus, 'Please enter an API key.', 'error');
      return;
    }
    
    showStatusMessage(apiKeyStatus, 'Verifying API key...', 'info');
    
    // Send message to background script to verify the key
    chrome.runtime.sendMessage({
      action: 'checkApiKey',
      apiKey: apiKey
    }, function(response) {
      if (response.status === 'success') {
        showStatusMessage(apiKeyStatus, 'API key is valid! ✓', 'success');
      } else {
        showStatusMessage(apiKeyStatus, 'Error: ' + response.message, 'error');
      }
    });
  });
  
  // Save API Key
  apiKeyForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatusMessage(apiKeyStatus, 'Please enter an API key.', 'error');
      return;
    }
    
    // Save the API key
    chrome.storage.local.get(['settings'], function(data) {
      const settings = data.settings || {};
      
      settings.apiKey = apiKey;
      settings.apiKeyConfigured = true;
      
      chrome.storage.local.set({ settings }, function() {
        showStatusMessage(apiKeyStatus, 'API key saved successfully! ✓', 'success');
      });
    });
  });
  
  // Save Preferences
  preferencesForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const template = defaultTemplate.value;
    const tone = defaultTone.value;
    
    // Save preferences
    chrome.storage.local.get(['preferences'], function(data) {
      const preferences = data.preferences || {};
      
      preferences.defaultTemplate = template;
      preferences.defaultTone = tone;
      
      chrome.storage.local.set({ preferences }, function() {
        showStatusMessage(preferencesStatus, 'Preferences saved successfully! ✓', 'success');
      });
    });
  });
  
  // Export Profile
  exportProfileBtn.addEventListener('click', function() {
    chrome.storage.local.get(['userProfile', 'settings', 'preferences', 'savedTemplates'], function(data) {
      // Create a JSON file
      const exportData = JSON.stringify(data, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = 'coverme-profile-' + new Date().toISOString().split('T')[0] + '.json';
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
    });
  });
  
  // Import Profile
  importProfileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
      try {
        const importData = JSON.parse(event.target.result);
        
        // Validate imported data
        if (!importData.userProfile || !importData.settings || !importData.preferences) {
          alert('Invalid profile data. Please upload a valid CoverMe profile export.');
          return;
        }
        
        // Save imported data
        chrome.storage.local.set(importData, function() {
          alert('Profile imported successfully!');
          loadSettings(); // Reload settings
        });
      } catch (error) {
        alert('Error importing profile: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  });
  
  // Show Reset Modal
  resetDataBtn.addEventListener('click', function() {
    resetModal.classList.remove('hidden');
  });
  
  // Hide Modal
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      resetModal.classList.add('hidden');
    });
  });
  
  // Confirm Reset
  confirmResetBtn.addEventListener('click', function() {
    // Reset all data
    chrome.storage.local.clear(function() {
      // Initialize with default settings
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
        },
        onboardingComplete: true // Keep onboarding as complete to avoid showing it again
      }, function() {
        resetModal.classList.add('hidden');
        alert('All data has been reset successfully.');
        loadSettings(); // Reload settings
      });
    });
  });
  
  // Back button
  backBtn.addEventListener('click', function() {
    window.close();
  });
  
  // Function to load saved settings
  function loadSettings() {
    // Load API key
    chrome.storage.local.get(['settings'], function(data) {
      if (data.settings && data.settings.apiKey) {
        apiKeyInput.value = data.settings.apiKey;
      }
    });
    
    // Load preferences
    chrome.storage.local.get(['preferences'], function(data) {
      if (data.preferences) {
        defaultTemplate.value = data.preferences.defaultTemplate || 'formal';
        defaultTone.value = data.preferences.defaultTone || 'professional';
      }
    });
  }
  
  // Function to show status messages
  function showStatusMessage(element, message, type) {
    element.textContent = message;
    element.className = 'status-message';
    element.classList.add(type);
    
    // Hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        element.style.display = 'none';
      }, 5000);
    }
  }
});