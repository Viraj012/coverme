// Templates management script

// DOM elements
const elements = {
    templatesContainer: document.getElementById('templates-container'),
    noTemplates: document.getElementById('no-templates'),
    templateViewer: document.getElementById('template-viewer'),
    templateName: document.getElementById('template-name'),
    templateDate: document.getElementById('template-date'),
    templateContent: document.getElementById('template-content'),
    backToListBtn: document.getElementById('back-to-list-btn'),
    editTemplateBtn: document.getElementById('edit-template-btn'),
    deleteTemplateBtn: document.getElementById('delete-template-btn'),
    downloadTemplateBtn: document.getElementById('download-template-btn'),
    returnToPopupBtn: document.getElementById('return-to-popup-btn'),
    confirmationDialog: document.getElementById('confirmation-dialog'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    templateCardTemplate: document.getElementById('template-card-template')
  };
  
  // State variables
  let savedTemplates = [];
  let currentTemplateId = null;
  
  // Initialize templates page
  function initTemplatesPage() {
    // console.log('Initializing templates page');
    
    // Load saved templates
    chrome.storage.local.get(['savedTemplates'], function(data) {
      savedTemplates = data.savedTemplates || [];
      
      // Display templates or no templates message
      if (savedTemplates.length === 0) {
        showNoTemplates();
      } else {
        showTemplatesList();
      }
    });
    
    // Set up event listeners
    setupEventListeners();
  }
  
  // Show no templates message
  function showNoTemplates() {
    elements.templatesContainer.innerHTML = '';
    elements.noTemplates.classList.remove('hidden');
    elements.templateViewer.classList.add('hidden');
  }
  
  // Show templates list
  function showTemplatesList() {
    elements.templatesContainer.innerHTML = '';
    elements.noTemplates.classList.add('hidden');
    elements.templateViewer.classList.add('hidden');
    
    // Sort templates by created date (newest first)
    savedTemplates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Create template cards
    savedTemplates.forEach(template => {
      const templateCard = createTemplateCard(template);
      elements.templatesContainer.appendChild(templateCard);
    });
  }
  
  // Show template viewer
  function showTemplateViewer(templateId) {
    elements.templatesContainer.classList.add('hidden');
    elements.noTemplates.classList.add('hidden');
    elements.templateViewer.classList.remove('hidden');
    
    // Find the template
    const template = savedTemplates.find(t => t.id === templateId);
    
    if (template) {
      currentTemplateId = template.id;
      
      // Update viewer with template details
      elements.templateName.textContent = template.name;
      
      // Format date
      const createdDate = new Date(template.createdAt);
      const formattedDate = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      elements.templateDate.textContent = `Created on: ${formattedDate}`;
      
      // Set content
      elements.templateContent.value = template.content;
      elements.templateContent.readOnly = true;
    }
  }
  
  // Create a template card
  function createTemplateCard(template) {
    // Clone the template
    const templateCardClone = document.importNode(elements.templateCardTemplate.content, true);
    const templateCard = templateCardClone.querySelector('.template-card');
    
    // Set template ID
    templateCard.dataset.id = template.id;
    
    // Fill in template details
    templateCard.querySelector('.template-card-title').textContent = template.name;
    
    // Format date
    const createdDate = new Date(template.createdAt);
    const formattedDate = createdDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    templateCard.querySelector('.template-card-date').textContent = formattedDate;
    
    // Set preview text (first 200 characters)
    const previewText = template.content.substring(0, 200);
    templateCard.querySelector('.template-card-preview').textContent = previewText;
    
    // Set up event listeners for card buttons
    templateCard.querySelector('.view-template-btn').addEventListener('click', () => {
      showTemplateViewer(template.id);
    });
    
    templateCard.querySelector('.delete-template-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteConfirmation(template.id);
    });
    
    return templateCard;
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // Back to list button
    elements.backToListBtn.addEventListener('click', () => {
      elements.templatesContainer.classList.remove('hidden');
      elements.templateViewer.classList.add('hidden');
      currentTemplateId = null;
    });
    
    // Edit template button
    elements.editTemplateBtn.addEventListener('click', () => {
      elements.templateContent.readOnly = false;
      elements.templateContent.focus();
      elements.editTemplateBtn.textContent = 'Save';
      
      // Change button functionality to save
      elements.editTemplateBtn.removeEventListener('click', editTemplate);
      elements.editTemplateBtn.addEventListener('click', saveEditedTemplate);
    });
    
    // Delete template button
    elements.deleteTemplateBtn.addEventListener('click', () => {
      showDeleteConfirmation(currentTemplateId);
    });
    
    // Download template button
    elements.downloadTemplateBtn.addEventListener('click', downloadTemplate);
    
    // Return to popup button
    elements.returnToPopupBtn.addEventListener('click', () => {
      window.close();
    });
    
    // Confirmation dialog buttons
    elements.cancelDeleteBtn.addEventListener('click', hideDeleteConfirmation);
    elements.confirmDeleteBtn.addEventListener('click', deleteCurrentTemplate);
  }
  
  // Edit template - switch to edit mode
  function editTemplate() {
    elements.templateContent.readOnly = false;
    elements.templateContent.focus();
    elements.editTemplateBtn.textContent = 'Save';
    
    // Change button functionality to save
    elements.editTemplateBtn.removeEventListener('click', editTemplate);
    elements.editTemplateBtn.addEventListener('click', saveEditedTemplate);
  }
  
  // Save edited template
  function saveEditedTemplate() {
    // Get current template
    const templateIndex = savedTemplates.findIndex(t => t.id === currentTemplateId);
    
    if (templateIndex !== -1) {
      // Update template content
      savedTemplates[templateIndex].content = elements.templateContent.value;
      
      // Save to storage
      chrome.storage.local.set({ savedTemplates: savedTemplates }, function() {
        console.log('Template updated successfully');
        
        // Switch back to view mode
        elements.templateContent.readOnly = true;
        elements.editTemplateBtn.textContent = 'Edit';
        
        // Change button functionality back to edit
        elements.editTemplateBtn.removeEventListener('click', saveEditedTemplate);
        elements.editTemplateBtn.addEventListener('click', editTemplate);
        
        // Show notification
        showNotification('Template updated successfully');
      });
    }
  }
  
  // Download template
  function downloadTemplate() {
    // Find current template
    const template = savedTemplates.find(t => t.id === currentTemplateId);
    
    if (template) {
      // Create filename
      const filename = `${template.name.replace(/[^a-zA-Z0-9]/g, '')}-CoverLetter.txt`;
      
      // Create blob and download link
      const blob = new Blob([template.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create temporary link and click it
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      
      // Show notification
      showNotification('Template downloaded!');
    }
  }
  
  // Show delete confirmation dialog
  function showDeleteConfirmation(templateId) {
    currentTemplateId = templateId;
    elements.confirmationDialog.classList.remove('hidden');
  }
  
  // Hide delete confirmation dialog
  function hideDeleteConfirmation() {
    elements.confirmationDialog.classList.add('hidden');
  }
  
  // Delete current template
  function deleteCurrentTemplate() {
    // Remove template from array
    savedTemplates = savedTemplates.filter(t => t.id !== currentTemplateId);
    
    // Save updated templates to storage
    chrome.storage.local.set({ savedTemplates: savedTemplates }, function() {
      // console.log('Template deleted successfully');
      
      // Hide confirmation dialog
      hideDeleteConfirmation();
      
      // If in template viewer, go back to list
      elements.templateViewer.classList.add('hidden');
      
      // If no templates left, show no templates message
      if (savedTemplates.length === 0) {
        showNoTemplates();
      } else {
        // Otherwise, refresh templates list
        showTemplatesList();
      }
      
      // Show notification
      showNotification('Template deleted successfully');
    });
  }
  
  // Show a notification message
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Style the notification
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = '#4CAF50';
    notification.style.color = 'white';
    notification.style.padding = '12px 24px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '10000';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }
  
  // Initialize the page when DOM is loaded
  document.addEventListener('DOMContentLoaded', initTemplatesPage);