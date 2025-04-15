// Settings page script
document.addEventListener('DOMContentLoaded', function() {
  const elements = {
    apiKeyForm: document.getElementById('api-key-form'),
    apiKeyInput: document.getElementById('api-key'),
    toggleVisibility: document.getElementById('toggle-visibility'),
    saveApiKeyBtn: document.getElementById('save-api-key-btn'),
    saveSuccess: document.getElementById('save-success'),
    returnBtn: document.getElementById('return-btn'),
    errorMessage: document.getElementById('error-message') || document.createElement('div')
  };

  // Create error message element if it doesn't exist
  if (!document.getElementById('error-message')) {
    elements.errorMessage.id = 'error-message';
    elements.errorMessage.className = 'error-message';
    elements.errorMessage.style.display = 'none';
    elements.apiKeyInput.parentNode.insertBefore(elements.errorMessage, elements.apiKeyInput.nextSibling);
  }

  // Load existing API key if any
  chrome.storage.local.get(['settings'], function(data) {
    if (data.settings?.apiKey) {
      elements.apiKeyInput.value = data.settings.apiKey;
    }
  });

  // Toggle API key visibility
  elements.toggleVisibility.addEventListener('click', function() {
    const type = elements.apiKeyInput.type;
    elements.apiKeyInput.type = type === 'password' ? 'text' : 'password';
    elements.toggleVisibility.textContent = type === 'password' ? 'Hide' : 'Show';
  });

  // Save API key
  elements.apiKeyForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const apiKey = elements.apiKeyInput.value.trim();
    if (!apiKey) {
      showError('Please enter an API key');
      return;
    }

    // Show loading state
    elements.saveApiKeyBtn.disabled = true;
    elements.saveApiKeyBtn.textContent = 'Validating...';

    // First validate the API key
    chrome.runtime.sendMessage({
      action: 'checkApiKey',
      apiKey: apiKey
    }, function(response) {
      if (response.status === 'success') {
        // API key is valid, save it
        chrome.storage.local.set({
          settings: {
            apiKey: apiKey,
            apiKeyConfigured: true
          }
        }, function() {
          // Show success message
          elements.apiKeyForm.classList.add('hidden');
          elements.saveSuccess.classList.remove('hidden');
        });
      } else {
        // API key is invalid
        elements.saveApiKeyBtn.disabled = false;
        elements.saveApiKeyBtn.textContent = 'Save API Key';
        showError(response.message || 'Invalid API key. Please check and try again.');
      }
    });
  });

  // Return button
  elements.returnBtn.addEventListener('click', function() {
    window.close();
  });

  // Function to show error message
  function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    elements.errorMessage.style.color = '#e53e3e';
    elements.errorMessage.style.marginTop = '5px';
    
    // Remove error message after 5 seconds
    setTimeout(() => {
      elements.errorMessage.style.display = 'none';
    }, 5000);
  }
});