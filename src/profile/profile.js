// Profile setup script

// DOM elements
const elements = {
    profileForm: document.getElementById('profile-form'),
    saveProfileBtn: document.getElementById('save-profile-btn'),
    saveSuccess: document.getElementById('save-success'),
    returnBtn: document.getElementById('return-btn'),
    addWorkBtn: document.getElementById('add-work-btn'),
    workExperienceContainer: document.getElementById('work-experience-container'),
    addEducationBtn: document.getElementById('add-education-btn'),
    educationContainer: document.getElementById('education-container')
  };
  
  // State variables
  let userProfile = null;
  
  // Initialize profile page
  function initProfilePage() {
    // console.log('Initializing profile page');
    
    // Load user profile if it exists
    chrome.storage.local.get(['userProfile'], function(data) {
      userProfile = data.userProfile || { completed: false };
      
      // If profile exists, populate the form
      if (userProfile.completed) {
        populateForm(userProfile);
      }
    });
    
    // Set up event listeners
    setupEventListeners();
  }
  
  // Populate form with existing user profile data
  function populateForm(profile) {
    // Basic info
    document.getElementById('name').value = profile.name || '';
    document.getElementById('email').value = profile.email || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('professionalSummary').value = profile.professionalSummary || '';
    
    // Skills - join array back to comma-separated string
    if (profile.skills && profile.skills.length > 0) {
      document.getElementById('skills').value = profile.skills.join(', ');
    }
    
    // Personal traits
    if (profile.personalTraits && profile.personalTraits.length > 0) {
      document.getElementById('personalTraits').value = profile.personalTraits.join(', ');
    }
    
    // Work experience
    if (profile.workExperience && profile.workExperience.length > 0) {
      // Remove the default empty work experience entry
      elements.workExperienceContainer.innerHTML = '';
      
      // Add each work experience entry
      profile.workExperience.forEach((exp, index) => {
        addWorkExperienceEntry(exp, index);
      });
    }
    
    // Education
    if (profile.education && profile.education.length > 0) {
      // Remove the default empty education entry
      elements.educationContainer.innerHTML = '';
      
      // Add each education entry
      profile.education.forEach((edu, index) => {
        addEducationEntry(edu, index);
      });
    }
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // Form submission
    elements.profileForm.addEventListener('submit', saveProfile);
    
    // Add work experience entry
    elements.addWorkBtn.addEventListener('click', () => {
      const workEntries = document.querySelectorAll('.experience-entry');
      addWorkExperienceEntry(null, workEntries.length);
    });
    
    // Add education entry
    elements.addEducationBtn.addEventListener('click', () => {
      const eduEntries = document.querySelectorAll('.education-entry');
      addEducationEntry(null, eduEntries.length);
    });
    
    // Return to popup button
    elements.returnBtn.addEventListener('click', () => {
      // Close this tab and open the extension popup
      window.close();
    });
    
    // Handle "Current Position" checkboxes
    document.addEventListener('change', function(e) {
      if (e.target.classList.contains('current-position')) {
        const entryContainer = e.target.closest('.experience-entry');
        const endDateInput = entryContainer.querySelector('input[name="workEnd[]"]');
        
        if (e.target.checked) {
          endDateInput.value = '';
          endDateInput.disabled = true;
        } else {
          endDateInput.disabled = false;
        }
      }
    });
    
    // Handle remove entry buttons (using event delegation)
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('entry-remove-btn')) {
        const entryContainer = e.target.closest('.experience-entry, .education-entry');
        entryContainer.remove();
      }
    });
  }
  
  // Add a new work experience entry
  function addWorkExperienceEntry(experience, index) {
    const entryHTML = `
      <div class="experience-entry">
        <button type="button" class="entry-remove-btn" ${index === 0 ? 'style="display:none"' : ''}>×</button>
        
        <div class="form-row">
          <div class="form-group">
            <label>Job Title</label>
            <input type="text" name="workTitle[]" value="${experience ? experience.title || '' : ''}" required>
          </div>
          
          <div class="form-group">
            <label>Company</label>
            <input type="text" name="workCompany[]" value="${experience ? experience.company || '' : ''}" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Start Date</label>
            <input type="month" name="workStart[]" value="${experience ? experience.startDate || '' : ''}" required>
          </div>
          
          <div class="form-group">
            <label>End Date</label>
            <input type="month" name="workEnd[]" value="${experience ? experience.endDate || '' : ''}" ${experience && experience.current ? 'disabled' : ''}>
            <div class="checkbox-group">
              <input type="checkbox" id="current-position-${index}" class="current-position" ${experience && experience.current ? 'checked' : ''}>
              <label for="current-position-${index}">Current Position</label>
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <label>Key Achievements/Responsibilities</label>
          <textarea name="workAchievements[]" rows="2" required>${experience ? experience.achievements || '' : ''}</textarea>
        </div>
      </div>
    `;
    
    elements.workExperienceContainer.insertAdjacentHTML('beforeend', entryHTML);
  }
  
  // Add a new education entry
  function addEducationEntry(education, index) {
    const entryHTML = `
      <div class="education-entry">
        <button type="button" class="entry-remove-btn" ${index === 0 ? 'style="display:none"' : ''}>×</button>
        
        <div class="form-row">
          <div class="form-group">
            <label>Degree/Certificate</label>
            <input type="text" name="educationDegree[]" value="${education ? education.degree || '' : ''}" required>
          </div>
          
          <div class="form-group">
            <label>Institution</label>
            <input type="text" name="educationInstitution[]" value="${education ? education.institution || '' : ''}" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Graduation Year</label>
            <input type="number" name="educationYear[]" min="1950" max="2099" value="${education ? education.graduationYear || '' : ''}" required>
          </div>
          
          <div class="form-group">
            <label>Field of Study</label>
            <input type="text" name="educationField[]" value="${education ? education.field || '' : ''}" required>
          </div>
        </div>
      </div>
    `;
    
    elements.educationContainer.insertAdjacentHTML('beforeend', entryHTML);
  }
  
  // Save profile data
  function saveProfile(e) {
    e.preventDefault();
    
    // Create profile object from form data
    const formData = new FormData(elements.profileForm);
    
    // Basic information
    const profile = {
      completed: true,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      professionalSummary: formData.get('professionalSummary'),
      skills: formData.get('skills').split(',').map(s => s.trim()).filter(s => s),
      personalTraits: formData.get('personalTraits').split(',').map(s => s.trim()).filter(s => s)
    };
    
    // Process work experience
    const workTitles = formData.getAll('workTitle[]');
    const workCompanies = formData.getAll('workCompany[]');
    const workStarts = formData.getAll('workStart[]');
    const workEnds = formData.getAll('workEnd[]');
    const workAchievements = formData.getAll('workAchievements[]');
    const currentPositions = Array.from(document.querySelectorAll('.current-position')).map(el => el.checked);
    
    profile.workExperience = workTitles.map((title, i) => {
      return {
        title: title,
        company: workCompanies[i],
        startDate: workStarts[i],
        endDate: currentPositions[i] ? 'Present' : workEnds[i],
        current: currentPositions[i],
        achievements: workAchievements[i]
      };
    });
    
    // Process education
    const eduDegrees = formData.getAll('educationDegree[]');
    const eduInstitutions = formData.getAll('educationInstitution[]');
    const eduYears = formData.getAll('educationYear[]');
    const eduFields = formData.getAll('educationField[]');
    
    profile.education = eduDegrees.map((degree, i) => {
      return {
        degree: degree,
        institution: eduInstitutions[i],
        graduationYear: eduYears[i],
        field: eduFields[i]
      };
    });
    
    // Save to storage
    chrome.storage.local.set({ userProfile: profile }, function() {
      console.log('Profile saved successfully');
      
      // Show success message
      elements.profileForm.classList.add('hidden');
      elements.saveSuccess.classList.remove('hidden');
    });
  }
  
  // Initialize the page when DOM is loaded
  document.addEventListener('DOMContentLoaded', initProfilePage);