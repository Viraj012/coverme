// Templates Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const templatesContainer = document.getElementById('templates-container');
  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('search-templates');
  const searchBtn = document.getElementById('search-btn');
  const filterSelect = document.getElementById('filter-templates');
  
  const templateModal = document.getElementById('template-modal');
  const modalTitle = document.getElementById('modal-title');
  const templateDate = document.getElementById('template-date');
  const templateStyle = document.getElementById('template-style');
  const templateTone = document.getElementById('template-tone');
  const templateJobTitle = document.getElementById('template-job-title');
  const templateCompany = document.getElementById('template-company');
  const templateContent = document.getElementById('template-content');
  
  const editTemplateBtn = document.getElementById('edit-template-btn');
  const useTemplateBtn = document.getElementById('use-template-btn');
  const deleteTemplateBtn = document.getElementById('delete-template-btn');
  
  const deleteModal = document.getElementById('delete-modal');
  const deleteTemplateName = document.getElementById('delete-template-name');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  
  const closeModalBtns = document.querySelectorAll('.close-modal, .cancel-modal');
  const backBtn = document.getElementById('back-btn');
  const goGenerateBtn = document.getElementById('go-generate-btn');
  
  // Current templates and selected template
  let templates = [];
  let currentTemplate = null;
  
  // Load templates
  loadTemplates();
  
  // Search functionality
  searchInput.addEventListener('input', filterTemplates);
  searchBtn.addEventListener('click', function() {
    filterTemplates();
  });
  
  // Filter functionality
  filterSelect.addEventListener('change', filterTemplates);
  
  // Close modals
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      templateModal.classList.add('hidden');
      deleteModal.classList.add('hidden');
    });
  });
  
  // Delete template button
  deleteTemplateBtn.addEventListener('click', function() {
    if (!currentTemplate) return;
    
    deleteModal.classList.remove('hidden');
    deleteTemplateName.textContent = currentTemplate.name;
  });
  
  // Confirm delete
  confirmDeleteBtn.addEventListener('click', function() {
    if (!currentTemplate) return;
    
    // Remove template from storage
    chrome.storage.local.get(['savedTemplates'], function(data) {
      let savedTemplates = data.savedTemplates || [];
      
      // Find and remove the template
      savedTemplates = savedTemplates.filter(template => template.id !== currentTemplate.id);
      
      // Save updated templates
      chrome.storage.local.set({ savedTemplates }, function() {
        // Close modals and reload templates
        deleteModal.classList.add('hidden');
        templateModal.classList.add('hidden');
        
        loadTemplates();
      });
    });
  });
  
  // Edit template button
  editTemplateBtn.addEventListener('click', function() {
    if (!currentTemplate) return;
    
    // Make template content editable
    templateContent.readOnly = false;
    templateContent.focus();
    
    // Change button to save
    editTemplateBtn.innerHTML = '<span class="btn-icon">💾</span>Save';
    editTemplateBtn.removeEventListener('click', arguments.callee);
    
    // Add save functionality
    editTemplateBtn.addEventListener('click', function saveEdit() {
      // Get edited content
      const editedContent = templateContent.value;
      
      // Update template in storage
      chrome.storage.local.get(['savedTemplates'], function(data) {
        let savedTemplates = data.savedTemplates || [];
        
        // Find and update the template
        savedTemplates = savedTemplates.map(template => {
          if (template.id === currentTemplate.id) {
            template.content = editedContent;
          }
          return template;
        });
        
        // Save updated templates
        chrome.storage.local.set({ savedTemplates }, function() {
          // Make content readonly again
          templateContent.readOnly = true;
          
          // Change button back to edit
          editTemplateBtn.innerHTML = '<span class="btn-icon">✎</span>Edit';
          
          // Update current template
          currentTemplate.content = editedContent;
          
          // Remove this event listener and add back the edit listener
          editTemplateBtn.removeEventListener('click', saveEdit);
          editTemplateBtn.addEventListener('click', arguments.callee);
        });
      });
    });
  });
  
  // Use template button
  useTemplateBtn.addEventListener('click', function() {
    if (!currentTemplate) return;
    
    // Set the template as current letter
    chrome.storage.local.set({ 
      currentLetter: currentTemplate.content,
      templateUsed: currentTemplate.id
    }, function() {
      // Open popup
      window.close();
    });
  });
  
  // Back button
  backBtn.addEventListener('click', function() {
    window.close();
  });
  
  // Go generate button
  goGenerateBtn.addEventListener('click', function() {
    window.close();
  });
  
  // Function to load templates
  function loadTemplates() {
    chrome.storage.local.get(['savedTemplates'], function(data) {
      templates = data.savedTemplates || [];
      
      if (templates.length > 0) {
        emptyState.classList.add('hidden');
        renderTemplates(templates);
      } else {
        emptyState.classList.remove('hidden');
        templatesContainer.innerHTML = '';
      }
    });
  }
  
  // Function to render templates
  function renderTemplates(templatesArray) {
    templatesContainer.innerHTML = '';
    
    templatesArray.forEach(template => {
      const card = document.createElement('div');
      card.className = 'template-card';
      card.setAttribute('data-id', template.id);
      card.setAttribute('data-style', template.style || 'formal');
      
      card.innerHTML = `
        <div class="template-header">
          <h3 class="template-title">${template.name}</h3>
        </div>
        <div class="template-meta">
          <p class="template-job">${template.jobTitle || 'Generic Cover Letter'}</p>
          <p class="template-company">${template.company || 'Any Company'}</p>
        </div>
        <div class="template-tags">
          <span class="template-tag">${capitalizeFirstLetter(template.style || 'formal')}</span>
          <span class="template-tag">${capitalizeFirstLetter(template.tone || 'professional')}</span>
        </div>
      `;
      
      // Add click event to open modal
      card.addEventListener('click', function() {
        openTemplateModal(template);
      });
      
      templatesContainer.appendChild(card);
    });
  }
  
  // Function to open template modal
  function openTemplateModal(template) {
    currentTemplate = template;
    
    // Set modal content
    modalTitle.textContent = template.name;
    templateDate.textContent = formatDate(template.created || new Date());
    templateStyle.textContent = capitalizeFirstLetter(template.style || 'formal');
    templateTone.textContent = capitalizeFirstLetter(template.tone || 'professional');
    templateJobTitle.textContent = template.jobTitle || 'Generic Cover Letter';
    templateCompany.textContent = template.company || 'Any Company';
    templateContent.value = template.content || '';
    
    // Make sure content is readonly
    templateContent.readOnly = true;
    
    // Reset edit button
    editTemplateBtn.innerHTML = '<span class="btn-icon">✎</span>Edit';
    
    // Show modal
    templateModal.classList.remove('hidden');
  }
  
  // Function to filter templates
  function filterTemplates() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSelect.value;
    
    let filteredTemplates = templates;
    
    // Apply search filter
    if (searchTerm) {
      filteredTemplates = filteredTemplates.filter(template => {
        return (
          (template.name && template.name.toLowerCase().includes(searchTerm)) ||
          (template.jobTitle && template.jobTitle.toLowerCase().includes(searchTerm)) ||
          (template.company && template.company.toLowerCase().includes(searchTerm))
        );
      });
    }
    
    // Apply style filter
    if (filterValue !== 'all') {
      filteredTemplates = filteredTemplates.filter(template => {
        return template.style === filterValue;
      });
    }
    
    // Check if we have results
    if (filteredTemplates.length > 0) {
      emptyState.classList.add('hidden');
      renderTemplates(filteredTemplates);
    } else {
      // Show a message for no results
      templatesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No Templates Found</h3>
          <p>No templates match your search or filter criteria.</p>
          <button id="clear-filters-btn" class="secondary-btn">Clear Filters</button>
        </div>
      `;
      
      // Add event listener to clear filters button
      document.getElementById('clear-filters-btn').addEventListener('click', function() {
        searchInput.value = '';
        filterSelect.value = 'all';
        loadTemplates();
      });
    }
  }
  
  // Helper function to capitalize first letter
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  // Helper function to format date
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
});