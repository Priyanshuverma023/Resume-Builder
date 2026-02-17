'use strict';

const STORAGE_KEY = 'resumeBuilder_v1';
const TOAST_DURATION = 3000;

let activeToast = null;

const state = {
    version: 1,
    template: 'professional',
    data: {
        personal: {
            fullName: '',
            jobTitle: '',
            email: '',
            phone: '',
            location: '',
            linkedin: ''
        },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: []
    }
};

const dom = {
    navItems: null,
    sections: null,
    templateSelect: null,
    downloadBtn: null,
    resumeOutput: null,
    personalInputs: {},
    summaryInput: null,
    experienceList: null,
    educationList: null,
    skillsList: null,
    certificationsList: null,
    addExperienceBtn: null,
    addEducationBtn: null,
    addSkillBtn: null,
    addCertificationBtn: null
};

function init() {
    cacheDOMElements();
    loadState();
    attachEventListeners();
    renderResume();
}

function cacheDOMElements() {
    dom.navItems = document.querySelectorAll('.rb-nav-item');
    dom.sections = document.querySelectorAll('.rb-section');
    dom.templateSelect = document.getElementById('template-select');
    dom.downloadBtn = document.getElementById('download-pdf');
    dom.resumeOutput = document.getElementById('resume-output');
    
    dom.personalInputs = {
        fullName: document.getElementById('full-name'),
        jobTitle: document.getElementById('job-title'),
        email: document.getElementById('email'),
        phone: document.getElementById('phone'),
        location: document.getElementById('location'),
        linkedin: document.getElementById('linkedin')
    };
    
    dom.summaryInput = document.getElementById('summary-text');
    dom.experienceList = document.getElementById('experience-list');
    dom.educationList = document.getElementById('education-list');
    dom.skillsList = document.getElementById('skills-list');
    dom.certificationsList = document.getElementById('certifications-list');
    dom.addExperienceBtn = document.getElementById('add-experience');
    dom.addEducationBtn = document.getElementById('add-education');
    dom.addSkillBtn = document.getElementById('add-skill');
    dom.addCertificationBtn = document.getElementById('add-certification');
}

function attachEventListeners() {
    dom.navItems.forEach(item => {
        item.addEventListener('click', handleNavClick);
    });
    
    dom.templateSelect.addEventListener('change', handleTemplateChange);
    dom.downloadBtn.addEventListener('click', handleDownloadPDF);
    
    Object.values(dom.personalInputs).forEach(input => {
        input.addEventListener('input', debounce(handlePersonalInput, 300));
    });
    
    dom.summaryInput.addEventListener('input', debounce(handleSummaryInput, 300));
    
    dom.addExperienceBtn.addEventListener('click', () => addExperience());
    dom.addEducationBtn.addEventListener('click', () => addEducation());
    dom.addSkillBtn.addEventListener('click', addSkill);
    dom.addCertificationBtn.addEventListener('click', () => addCertification());
}

function handleNavClick(e) {
    const sectionName = e.currentTarget.dataset.section;
    
    dom.navItems.forEach(item => item.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    dom.sections.forEach(section => {
        section.classList.remove('active');
        if (section.dataset.section === sectionName) {
            section.classList.add('active');
        }
    });
}

function handleTemplateChange(e) {
    state.template = e.target.value;
    saveState();
    renderResume();
}

function handlePersonalInput(e) {
    const field = e.target.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    state.data.personal[field] = e.target.value.trim();
    saveState();
    renderResume();
}

function handleSummaryInput(e) {
    state.data.summary = e.target.value.trim();
    saveState();
    renderResume();
}

function addExperience(data = null) {
    const id = Date.now().toString();
    const experience = data || {
        id,
        company: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: ''
    };
    
    if (!data) {
        state.data.experience.push(experience);
        saveState();
    }
    
    const itemHTML = `
        <div class="rb-list-item" data-id="${experience.id}">
            <div class="rb-list-item-header">
                <h3 class="rb-section-title" style="font-size: var(--fs-12-18);">Experience Entry</h3>
                <div class="rb-list-item-actions">
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeExperience('${experience.id}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width: 1rem; height: 1rem;">
                        Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Company</label>
                        <input type="text" class="rb-input" data-field="company" value="${experience.company}" placeholder="Acme Corporation">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Position</label>
                        <input type="text" class="rb-input" data-field="position" value="${experience.position}" placeholder="Senior Developer">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Location</label>
                        <input type="text" class="rb-input" data-field="location" value="${experience.location}" placeholder="San Francisco, CA">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">
                            <input type="checkbox" data-field="current" ${experience.current ? 'checked' : ''} style="margin-right: 0.5rem;">
                            Currently working here
                        </label>
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Start Date</label>
                        <input type="text" class="rb-input" data-field="startDate" value="${experience.startDate}" placeholder="January 2020">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">End Date</label>
                        <input type="text" class="rb-input" data-field="endDate" value="${experience.endDate}" placeholder="Present" ${experience.current ? 'disabled' : ''}>
                    </div>
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Description</label>
                    <textarea class="rb-textarea" data-field="description" rows="4" placeholder="Key achievements and responsibilities...">${experience.description}</textarea>
                </div>
            </div>
        </div>
    `;
    
    dom.experienceList.insertAdjacentHTML('beforeend', itemHTML);
    
    const item = dom.experienceList.querySelector(`[data-id="${experience.id}"]`);
    const inputs = item.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('input', debounce((e) => {
            updateExperience(experience.id, e.target.dataset.field, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
        }, 300));
        
        if (input.dataset.field === 'current') {
            input.addEventListener('change', (e) => {
                const endDateInput = item.querySelector('[data-field="endDate"]');
                if (e.target.checked) {
                    endDateInput.disabled = true;
                    endDateInput.value = 'Present';
                    updateExperience(experience.id, 'endDate', 'Present');
                } else {
                    endDateInput.disabled = false;
                }
                updateExperience(experience.id, 'current', e.target.checked);
            });
        }
    });
}

function updateExperience(id, field, value) {
    const experience = state.data.experience.find(exp => exp.id === id);
    if (experience) {
        experience[field] = value;
        saveState();
        renderResume();
    }
}

function removeExperience(id) {
    state.data.experience = state.data.experience.filter(exp => exp.id !== id);
    const item = dom.experienceList.querySelector(`[data-id="${id}"]`);
    if (item) {
        item.remove();
    }
    saveState();
    renderResume();
    showToast('Experience entry deleted', 'success');
}

function addEducation(data = null) {
    const id = Date.now().toString();
    const education = data || {
        id,
        institution: '',
        degree: '',
        field: '',
        location: '',
        graduationDate: '',
        gpa: ''
    };
    
    if (!data) {
        state.data.education.push(education);
        saveState();
    }
    
    const itemHTML = `
        <div class="rb-list-item" data-id="${education.id}">
            <div class="rb-list-item-header">
                <h3 class="rb-section-title" style="font-size: var(--fs-12-18);">Education Entry</h3>
                <div class="rb-list-item-actions">
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeEducation('${education.id}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width: 1rem; height: 1rem;">
                        Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Institution</label>
                        <input type="text" class="rb-input" data-field="institution" value="${education.institution}" placeholder="University of California">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Degree</label>
                        <input type="text" class="rb-input" data-field="degree" value="${education.degree}" placeholder="Bachelor of Science">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Field of Study</label>
                        <input type="text" class="rb-input" data-field="field" value="${education.field}" placeholder="Computer Science">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Location</label>
                        <input type="text" class="rb-input" data-field="location" value="${education.location}" placeholder="Berkeley, CA">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Graduation Date</label>
                        <input type="text" class="rb-input" data-field="graduationDate" value="${education.graduationDate}" placeholder="May 2020">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">GPA (Optional)</label>
                        <input type="text" class="rb-input" data-field="gpa" value="${education.gpa}" placeholder="3.8/4.0">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    dom.educationList.insertAdjacentHTML('beforeend', itemHTML);
    
    const item = dom.educationList.querySelector(`[data-id="${education.id}"]`);
    const inputs = item.querySelectorAll('input');
    
    inputs.forEach(input => {
        input.addEventListener('input', debounce((e) => {
            updateEducation(education.id, e.target.dataset.field, e.target.value);
        }, 300));
    });
}

function updateEducation(id, field, value) {
    const education = state.data.education.find(edu => edu.id === id);
    if (education) {
        education[field] = value;
        saveState();
        renderResume();
    }
}

function removeEducation(id) {
    state.data.education = state.data.education.filter(edu => edu.id !== id);
    const item = dom.educationList.querySelector(`[data-id="${id}"]`);
    if (item) {
        item.remove();
    }
    saveState();
    renderResume();
    showToast('Education entry deleted', 'success');
}

function addSkill() {
    const skillName = prompt('Enter skill name:');
    if (skillName && skillName.trim()) {
        const skill = {
            id: Date.now().toString(),
            name: skillName.trim()
        };
        state.data.skills.push(skill);
        renderSkill(skill);
        saveState();
        renderResume();
    }
}

function renderSkill(skill) {
    const skillHTML = `
        <div class="rb-skill-tag" data-id="${skill.id}">
            <span>${escapeHTML(skill.name)}</span>
            <button onclick="removeSkill('${skill.id}')" aria-label="Remove skill">
                <img src="assets/svg/close.svg" alt="Remove" class="rb-icon" style="width: 1rem; height: 1rem;">
            </button>
        </div>
    `;
    dom.skillsList.insertAdjacentHTML('beforeend', skillHTML);
}

function removeSkill(id) {
    state.data.skills = state.data.skills.filter(skill => skill.id !== id);
    const skillTag = dom.skillsList.querySelector(`[data-id="${id}"]`);
    if (skillTag) {
        skillTag.remove();
    }
    saveState();
    renderResume();
}

function addCertification(data = null) {
    const id = Date.now().toString();
    const certification = data || {
        id,
        name: '',
        issuer: '',
        date: '',
        credentialId: ''
    };
    
    if (!data) {
        state.data.certifications.push(certification);
        saveState();
    }
    
    const itemHTML = `
        <div class="rb-list-item" data-id="${certification.id}">
            <div class="rb-list-item-header">
                <h3 class="rb-section-title" style="font-size: var(--fs-12-18);">Certification Entry</h3>
                <div class="rb-list-item-actions">
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeCertification('${certification.id}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width: 1rem; height: 1rem;">
                        Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Certification Name</label>
                        <input type="text" class="rb-input" data-field="name" value="${certification.name}" placeholder="AWS Certified Solutions Architect">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Issuing Organization</label>
                        <input type="text" class="rb-input" data-field="issuer" value="${certification.issuer}" placeholder="Amazon Web Services">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Date Obtained</label>
                        <input type="text" class="rb-input" data-field="date" value="${certification.date}" placeholder="June 2023">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Credential ID (Optional)</label>
                        <input type="text" class="rb-input" data-field="credentialId" value="${certification.credentialId}" placeholder="ABC123XYZ">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    dom.certificationsList.insertAdjacentHTML('beforeend', itemHTML);
    
    const item = dom.certificationsList.querySelector(`[data-id="${certification.id}"]`);
    const inputs = item.querySelectorAll('input');
    
    inputs.forEach(input => {
        input.addEventListener('input', debounce((e) => {
            updateCertification(certification.id, e.target.dataset.field, e.target.value);
        }, 300));
    });
}

function updateCertification(id, field, value) {
    const certification = state.data.certifications.find(cert => cert.id === id);
    if (certification) {
        certification[field] = value;
        saveState();
        renderResume();
    }
}

function removeCertification(id) {
    state.data.certifications = state.data.certifications.filter(cert => cert.id !== id);
    const item = dom.certificationsList.querySelector(`[data-id="${id}"]`);
    if (item) {
        item.remove();
    }
    saveState();
    renderResume();
    showToast('Certification deleted', 'success');
}

function renderResume() {
    const { personal, summary, experience, education, skills, certifications } = state.data;
    
    let html = '<div class="rb-resume-header">';
    
    if (personal.fullName) {
        html += `<h1 class="rb-resume-name">${escapeHTML(personal.fullName)}</h1>`;
    }
    
    if (personal.jobTitle) {
        html += `<div class="rb-resume-title">${escapeHTML(personal.jobTitle)}</div>`;
    }
    
    const contactInfo = [];
    if (personal.email) contactInfo.push(escapeHTML(personal.email));
    if (personal.phone) contactInfo.push(escapeHTML(personal.phone));
    if (personal.location) contactInfo.push(escapeHTML(personal.location));
    if (personal.linkedin) contactInfo.push(escapeHTML(personal.linkedin));
    
    if (contactInfo.length > 0) {
        html += `<div class="rb-resume-contact">${contactInfo.join(' | ')}</div>`;
    }
    
    html += '</div>';
    
    if (summary) {
        html += `
            <div class="rb-resume-section">
                <h2 class="rb-resume-section-title">Professional Summary</h2>
                <div class="rb-resume-summary">${escapeHTML(summary)}</div>
            </div>
        `;
    }
    
    if (experience.length > 0) {
        html += '<div class="rb-resume-section"><h2 class="rb-resume-section-title">Work Experience</h2>';
        experience.forEach(exp => {
            if (exp.company || exp.position) {
                html += '<div class="rb-resume-entry">';
                html += '<div class="rb-resume-entry-header">';
                html += '<div>';
                if (exp.position) {
                    html += `<div class="rb-resume-entry-title">${escapeHTML(exp.position)}</div>`;
                }
                if (exp.company) {
                    html += `<div class="rb-resume-entry-subtitle">${escapeHTML(exp.company)}</div>`;
                }
                html += '</div>';
                if (exp.startDate || exp.endDate) {
                    html += `<div class="rb-resume-entry-date">${escapeHTML(exp.startDate)}${exp.startDate && exp.endDate ? ' - ' : ''}${escapeHTML(exp.endDate)}</div>`;
                }
                html += '</div>';
                if (exp.location) {
                    html += `<div class="rb-resume-entry-location">${escapeHTML(exp.location)}</div>`;
                }
                if (exp.description) {
                    html += `<div class="rb-resume-entry-description">${escapeHTML(exp.description).replace(/\n/g, '<br>')}</div>`;
                }
                html += '</div>';
            }
        });
        html += '</div>';
    }
    
    if (education.length > 0) {
        html += '<div class="rb-resume-section"><h2 class="rb-resume-section-title">Education</h2>';
        education.forEach(edu => {
            if (edu.institution || edu.degree) {
                html += '<div class="rb-resume-entry">';
                html += '<div class="rb-resume-entry-header">';
                html += '<div>';
                if (edu.degree) {
                    html += `<div class="rb-resume-entry-title">${escapeHTML(edu.degree)}${edu.field ? ' in ' + escapeHTML(edu.field) : ''}</div>`;
                }
                if (edu.institution) {
                    html += `<div class="rb-resume-entry-subtitle">${escapeHTML(edu.institution)}</div>`;
                }
                html += '</div>';
                if (edu.graduationDate) {
                    html += `<div class="rb-resume-entry-date">${escapeHTML(edu.graduationDate)}</div>`;
                }
                html += '</div>';
                if (edu.location) {
                    html += `<div class="rb-resume-entry-location">${escapeHTML(edu.location)}</div>`;
                }
                if (edu.gpa) {
                    html += `<div class="rb-resume-entry-description">GPA: ${escapeHTML(edu.gpa)}</div>`;
                }
                html += '</div>';
            }
        });
        html += '</div>';
    }
    
    if (skills.length > 0) {
        html += '<div class="rb-resume-section"><h2 class="rb-resume-section-title">Skills</h2>';
        html += '<div class="rb-resume-skills-list">';
        skills.forEach(skill => {
            html += `<span class="rb-resume-skill">${escapeHTML(skill.name)}</span>`;
        });
        html += '</div></div>';
    }
    
    if (certifications.length > 0) {
        html += '<div class="rb-resume-section"><h2 class="rb-resume-section-title">Certifications</h2>';
        certifications.forEach(cert => {
            if (cert.name || cert.issuer) {
                html += '<div class="rb-resume-entry">';
                html += '<div class="rb-resume-entry-header">';
                html += '<div>';
                if (cert.name) {
                    html += `<div class="rb-resume-entry-title">${escapeHTML(cert.name)}</div>`;
                }
                if (cert.issuer) {
                    html += `<div class="rb-resume-entry-subtitle">${escapeHTML(cert.issuer)}</div>`;
                }
                html += '</div>';
                if (cert.date) {
                    html += `<div class="rb-resume-entry-date">${escapeHTML(cert.date)}</div>`;
                }
                html += '</div>';
                if (cert.credentialId) {
                    html += `<div class="rb-resume-entry-description">Credential ID: ${escapeHTML(cert.credentialId)}</div>`;
                }
                html += '</div>';
            }
        });
        html += '</div>';
    }
    
    dom.resumeOutput.innerHTML = html;
}

function handleDownloadPDF() {
    if (!state.data.personal.fullName) {
        showToast('Please enter your name before downloading', 'warning');
        return;
    }
    
    showToast('Preparing PDF download...', 'info');
    
    setTimeout(() => {
        try {
            const element = dom.resumeOutput;
            const filename = `${state.data.personal.fullName.replace(/\s+/g, '_')}_Resume.pdf`;
            
            const opt = {
                margin: [10, 10, 10, 10],
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    letterRendering: true
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait'
                }
            };
            
            if (typeof html2pdf !== 'undefined') {
                html2pdf().set(opt).from(element).save().then(() => {
                    showToast('PDF downloaded successfully!', 'success');
                }).catch(() => {
                    showToast('PDF download failed. Please try again.', 'error');
                });
            } else {
                window.print();
                showToast('Please use print dialog to save as PDF', 'info');
            }
        } catch (error) {
            window.print();
            showToast('Please use print dialog to save as PDF', 'info');
        }
    }, 500);
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        showToast('Failed to save changes', 'error');
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.version === state.version) {
                Object.assign(state, parsed);
                populateForm();
            }
        }
    } catch (error) {
        showToast('Failed to load saved data', 'warning');
    }
}

function populateForm() {
    Object.keys(dom.personalInputs).forEach(key => {
        if (dom.personalInputs[key] && state.data.personal[key]) {
            dom.personalInputs[key].value = state.data.personal[key];
        }
    });
    
    if (state.data.summary) {
        dom.summaryInput.value = state.data.summary;
    }
    
    if (state.template) {
        dom.templateSelect.value = state.template;
    }
    
    state.data.experience.forEach(exp => addExperience(exp));
    state.data.education.forEach(edu => addEducation(edu));
    state.data.skills.forEach(skill => renderSkill(skill));
    state.data.certifications.forEach(cert => addCertification(cert));
}

function showToast(message, type = 'info') {
    if (activeToast) {
        activeToast.classList.add('rb-toast-exit');
        setTimeout(() => {
            if (activeToast && activeToast.parentNode) {
                activeToast.remove();
            }
            activeToast = null;
            createToast(message, type);
        }, 300);
    } else {
        createToast(message, type);
    }
}

function createToast(message, type) {
    const container = document.getElementById('toast-container');
    
    const iconPaths = {
        success: 'assets/svg/success.svg',
        error: 'assets/svg/error.svg',
        warning: 'assets/svg/warning.svg',
        info: 'assets/svg/info.svg'
    };
    
    const toast = document.createElement('div');
    toast.className = `rb-toast rb-toast-${type}`;
    toast.innerHTML = `
        <img src="${iconPaths[type]}" alt="${type}" class="rb-toast-icon">
        <div class="rb-toast-content">
            <div class="rb-toast-message">${escapeHTML(message)}</div>
        </div>
    `;
    
    container.appendChild(toast);
    activeToast = toast;
    
    setTimeout(() => {
        if (activeToast === toast) {
            toast.classList.add('rb-toast-exit');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
                if (activeToast === toast) {
                    activeToast = null;
                }
            }, 300);
        }
    }, TOAST_DURATION);
}

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

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.removeExperience = removeExperience;
window.removeEducation = removeEducation;
window.removeSkill = removeSkill;
window.removeCertification = removeCertification;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}