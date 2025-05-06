// Profile Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const profileForm = document.getElementById('profile-form');
  const saveProfileBtn = document.getElementById('save-profile-btn');
  const returnBtn = document.getElementById('return-btn');
  const addWorkBtn = document.getElementById('add-work-btn');
  const addEducationBtn = document.getElementById('add-education-btn');
  const workExperienceContainer = document.getElementById('work-experience-container');
  const educationContainer = document.getElementById('education-container');
  const progressFill = document.getElementById('progress-fill');
  
  const nextButtons = document.querySelectorAll('.next-btn');
  const backButtons = document.querySelectorAll('.back-btn');
  const formSections = document.querySelectorAll('.form-section');
  const progressSteps = document.querySelectorAll('.progress-step');
  
  // Skills/Traits Tags Input
  const skillsInput = document.getElementById('skills-input');
  const skillsTags = document.getElementById('skills-tags');
  const skillsHidden = document.getElementById('skills');
  
  const traitsInput = document.getElementById('traits-input');
  const traitsTags = document.getElementById('traits-tags');
  const traitsHidden = document.getElementById('personalTraits');
  
  // Current active section
  let currentSection = 'personal';
  let skillsArray = [];
  let traitsArray = [];
  
  // Initialize the form with saved data if available
  loadSavedProfile();
  
  // Initialize progress bar
  updateProgress();
  
  // Navigation buttons event listeners
  nextButtons.forEach(button => {
    button.addEventListener('click', function() {
      const nextSection = this.dataset.next;
      if (validateSection(currentSection)) {
        navigateToSection(nextSection);
      }
    });
  });
  
  backButtons.forEach(button => {
    button.addEventListener('click', function() {
      const prevSection = this.dataset.back;
      navigateToSection(prevSection);
    });
  });
  
  // Handle the tags inputs
  skillsInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(this.value.trim(), 'skills');
      this.value = '';
    }
  });
  
  traitsInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(this.value.trim(), 'traits');
      this.value = '';
    }
  });
  
  // Add Work Experience
  addWorkBtn.addEventListener('click', function() {
    const experienceEntry = workExperienceContainer.querySelector('.experience-entry').cloneNode(true);
    const inputs = experienceEntry.querySelectorAll('input, textarea');
    
    // Clear the values
    inputs.forEach(input => {
      input.value = '';
    });
    
    // Update the checkbox ID to be unique
    const checkbox = experienceEntry.querySelector('.current-position');
    const checkboxLabel = experienceEntry.querySelector('.checkbox-label');
    const newId = 'current-position-' + (workExperienceContainer.querySelectorAll('.experience-entry').length);
    checkbox.id = newId;
    checkboxLabel.setAttribute('for', newId);
    
    // Add a remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', function() {
      if (workExperienceContainer.querySelectorAll('.experience-entry').length > 1) {
        experienceEntry.remove();
      }
    });
    
    experienceEntry.appendChild(removeBtn);
    workExperienceContainer.appendChild(experienceEntry);
    
    // Add checkbox functionality
    checkbox.addEventListener('change', function() {
      const endDateInput = this.closest('.form-group').querySelector('input[type="month"]');
      if (this.checked) {
        endDateInput.value = '';
        endDateInput.disabled = true;
      } else {
        endDateInput.disabled = false;
      }
    });
  });
  
  // Add current position checkbox functionality to existing entries
  document.querySelectorAll('.current-position').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const endDateInput = this.closest('.form-group').querySelector('input[type="month"]');
      if (this.checked) {
        endDateInput.value = '';
        endDateInput.disabled = true;
      } else {
        endDateInput.disabled = false;
      }
    });
  });
  
  // Add Education
  addEducationBtn.addEventListener('click', function() {
    const educationEntry = educationContainer.querySelector('.education-entry').cloneNode(true);
    const inputs = educationEntry.querySelectorAll('input');
    
    // Clear the values
    inputs.forEach(input => {
      input.value = '';
    });
    
    // Add a remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', function() {
      if (educationContainer.querySelectorAll('.education-entry').length > 1) {
        educationEntry.remove();
      }
    });
    
    educationEntry.appendChild(removeBtn);
    educationContainer.appendChild(educationEntry);
  });
  
  // Form submission
  profileForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!validateSection(currentSection)) {
      return;
    }
    
    // Gather form data
    const formData = new FormData(profileForm);
    
    // Create the user profile object
    const userProfile = {
      completed: true,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      professionalSummary: formData.get('professionalSummary'),
      skills: skillsArray,
      personalTraits: traitsArray,
      workExperience: [],
      education: []
    };
    
    // Process work experience
    const workTitles = formData.getAll('workTitle[]');
    const workCompanies = formData.getAll('workCompany[]');
    const workStarts = formData.getAll('workStart[]');
    const workEnds = formData.getAll('workEnd[]');
    const workAchievements = formData.getAll('workAchievements[]');
    
    for (let i = 0; i < workTitles.length; i++) {
      if (workTitles[i] && workCompanies[i] && workStarts[i]) {
        userProfile.workExperience.push({
          title: workTitles[i],
          company: workCompanies[i],
          startDate: workStarts[i],
          endDate: workEnds[i] || 'Present',
          achievements: workAchievements[i]
        });
      }
    }
    
    // Process education
    const eduDegrees = formData.getAll('educationDegree[]');
    const eduInstitutions = formData.getAll('educationInstitution[]');
    const eduYears = formData.getAll('educationYear[]');
    const eduFields = formData.getAll('educationField[]');
    
    for (let i = 0; i < eduDegrees.length; i++) {
      if (eduDegrees[i] && eduInstitutions[i] && eduYears[i] && eduFields[i]) {
        userProfile.education.push({
          degree: eduDegrees[i],
          institution: eduInstitutions[i],
          graduationYear: eduYears[i],
          field: eduFields[i]
        });
      }
    }
    
    // Save the profile
    chrome.storage.local.set({ userProfile }, function() {
      console.log('Profile saved successfully');
      // Hide the form and show success message
      document.querySelector('.form-container').style.display = 'none';
      document.getElementById('save-success').classList.remove('hidden');
    });
  });
  
  // Return button click
  returnBtn.addEventListener('click', function() {
    window.close();
  });
  
  // Function to validate current section
  function validateSection(section) {
    switch (section) {
      case 'personal':
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const summary = document.getElementById('professionalSummary').value;
        
        if (!name || !email || !phone || !summary) {
          alert('Please fill in all fields in the Personal Information section.');
          return false;
        }
        
        // Simple email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          alert('Please enter a valid email address.');
          return false;
        }
        
        return true;
      
      case 'skills':
        if (skillsArray.length === 0) {
          alert('Please add at least one skill.');
          return false;
        }
        
        if (traitsArray.length === 0) {
          alert('Please add at least one personal trait.');
          return false;
        }
        
        return true;
      
      case 'experience':
        // At least one work experience entry should be filled
        const titles = document.querySelectorAll('input[name="workTitle[]"]');
        const companies = document.querySelectorAll('input[name="workCompany[]"]');
        const startDates = document.querySelectorAll('input[name="workStart[]"]');
        
        let hasValidExperience = false;
        
        for (let i = 0; i < titles.length; i++) {
          if (titles[i].value && companies[i].value && startDates[i].value) {
            hasValidExperience = true;
            break;
          }
        }
        
        if (!hasValidExperience) {
          alert('Please fill in at least one work experience entry.');
          return false;
        }
        
        return true;
      
      case 'education':
        // At least one education entry should be filled
        const degrees = document.querySelectorAll('input[name="educationDegree[]"]');
        const institutions = document.querySelectorAll('input[name="educationInstitution[]"]');
        
        let hasValidEducation = false;
        
        for (let i = 0; i < degrees.length; i++) {
          if (degrees[i].value && institutions[i].value) {
            hasValidEducation = true;
            break;
          }
        }
        
        if (!hasValidEducation) {
          alert('Please fill in at least one education entry.');
          return false;
        }
        
        return true;
      
      default:
        return true;
    }
  }
  
  // Function to add a tag
  function addTag(text, type) {
    if (!text) return;
    
    // Create the tag array and elements based on type
    let array, container, hiddenInput;
    
    if (type === 'skills') {
      array = skillsArray;
      container = skillsTags;
      hiddenInput = skillsHidden;
    } else {
      array = traitsArray;
      container = traitsTags;
      hiddenInput = traitsHidden;
    }
    
    // Check if tag already exists
    if (array.includes(text)) return;
    
    // Add to array
    array.push(text);
    
    // Update hidden input
    hiddenInput.value = array.join(',');
    
    // Create tag element
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.textContent = text;
    
    // Add remove button
    const removeBtn = document.createElement('span');
    removeBtn.className = 'tag-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', function() {
      // Remove from array
      const index = array.indexOf(text);
      if (index !== -1) {
        array.splice(index, 1);
      }
      
      // Update hidden input
      hiddenInput.value = array.join(',');
      
      // Remove element
      tag.remove();
    });
    
    tag.appendChild(removeBtn);
    container.appendChild(tag);
  }
  
  // Function to navigate between sections
  function navigateToSection(section) {
    // Hide all sections
    formSections.forEach(sec => {
      sec.classList.add('hidden');
    });
    
    // Show the selected section
    document.getElementById(`${section}-section`).classList.remove('hidden');
    
    // Update active section
    currentSection = section;
    
    // Update progress bar
    updateProgress();
    
    // Scroll to top
    window.scrollTo(0, 0);
  }
  
  // Function to update progress bar
  function updateProgress() {
    const sectionIndex = ['personal', 'skills', 'experience', 'education'].indexOf(currentSection);
    const progressPercentage = (sectionIndex * 100) / 3; // 3 is sections.length - 1
    
    progressFill.style.width = `${progressPercentage}%`;
    
    // Update step indicators
    progressSteps.forEach((step, index) => {
      if (index <= sectionIndex) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  }
  
  // Function to load saved profile data
  function loadSavedProfile() {
    chrome.storage.local.get(['userProfile'], function(data) {
      if (data.userProfile) {
        const profile = data.userProfile;
        
        // Fill personal information
        document.getElementById('name').value = profile.name || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('phone').value = profile.phone || '';
        document.getElementById('professionalSummary').value = profile.professionalSummary || '';
        
        // Load skills and traits
        if (profile.skills && Array.isArray(profile.skills)) {
          profile.skills.forEach(skill => {
            skillsArray.push(skill);
            addTag(skill, 'skills');
          });
        }
        
        if (profile.personalTraits && Array.isArray(profile.personalTraits)) {
          profile.personalTraits.forEach(trait => {
            traitsArray.push(trait);
            addTag(trait, 'traits');
          });
        }
        
        // Load work experience
        if (profile.workExperience && profile.workExperience.length > 0) {
          // Clear the existing template
          workExperienceContainer.innerHTML = '';
          
          profile.workExperience.forEach((exp, index) => {
            const template = `
              <div class="card experience-entry">
                <div class="form-row">
                  <div class="form-group">
                    <label>Job Title</label>
                    <input type="text" name="workTitle[]" value="${exp.title || ''}" required>
                  </div>
                  
                  <div class="form-group">
                    <label>Company</label>
                    <input type="text" name="workCompany[]" value="${exp.company || ''}" required>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Start Date</label>
                    <input type="month" name="workStart[]" value="${exp.startDate || ''}" required>
                  </div>
                  
                  <div class="form-group">
                    <label>End Date</label>
                    <input type="month" name="workEnd[]" value="${exp.endDate !== 'Present' ? (exp.endDate || '') : ''}" ${exp.endDate === 'Present' ? 'disabled' : ''}>
                    <div class="checkbox-group">
                      <input type="checkbox" id="current-position-${index}" class="current-position" ${exp.endDate === 'Present' ? 'checked' : ''}>
                      <label for="current-position-${index}" class="checkbox-label">Current Position</label>
                    </div>
                  </div>
                </div>
                
                <div class="form-group">
                  <label>Key Achievements/Responsibilities</label>
                  <textarea name="workAchievements[]" rows="2" required>${exp.achievements || ''}</textarea>
                </div>
              </div>
            `;
            
            workExperienceContainer.insertAdjacentHTML('beforeend', template);
            
            // Add event listener to checkbox
            const checkbox = document.getElementById(`current-position-${index}`);
            checkbox.addEventListener('change', function() {
              const endDateInput = this.closest('.form-group').querySelector('input[type="month"]');
              if (this.checked) {
                endDateInput.value = '';
                endDateInput.disabled = true;
              } else {
                endDateInput.disabled = false;
              }
            });
            
            // Add remove button if not the first entry
            if (index > 0) {
              const entry = workExperienceContainer.lastChild;
              const removeBtn = document.createElement('button');
              removeBtn.type = 'button';
              removeBtn.className = 'remove-btn';
              removeBtn.innerHTML = '×';
              removeBtn.addEventListener('click', function() {
                if (workExperienceContainer.querySelectorAll('.experience-entry').length > 1) {
                  entry.remove();
                }
              });
              
              entry.appendChild(removeBtn);
            }
          });
        }
        
        // Load education
        if (profile.education && profile.education.length > 0) {
          // Clear the existing template
          educationContainer.innerHTML = '';
          
          profile.education.forEach((edu, index) => {
            const template = `
              <div class="card education-entry">
                <div class="form-row">
                  <div class="form-group">
                    <label>Degree/Certificate</label>
                    <input type="text" name="educationDegree[]" value="${edu.degree || ''}" required>
                  </div>
                  
                  <div class="form-group">
                    <label>Institution</label>
                    <input type="text" name="educationInstitution[]" value="${edu.institution || ''}" required>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Graduation Year</label>
                    <input type="number" name="educationYear[]" min="1950" max="2099" value="${edu.graduationYear || ''}" required>
                  </div>
                  
                  <div class="form-group">
                    <label>Field of Study</label>
                    <input type="text" name="educationField[]" value="${edu.field || ''}" required>
                  </div>
                </div>
              </div>
            `;
            
            educationContainer.insertAdjacentHTML('beforeend', template);
            
            // Add remove button if not the first entry
            if (index > 0) {
              const entry = educationContainer.lastChild;
              const removeBtn = document.createElement('button');
              removeBtn.type = 'button';
              removeBtn.className = 'remove-btn';
              removeBtn.innerHTML = '×';
              removeBtn.addEventListener('click', function() {
                if (educationContainer.querySelectorAll('.education-entry').length > 1) {
                  entry.remove();
                }
              });
              
              entry.appendChild(removeBtn);
            }
          });
        }
      }
    });
  }
});