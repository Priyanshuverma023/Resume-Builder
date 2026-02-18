'use strict';

const STORAGE_KEY = 'resumeBuilder_v1';
const TOAST_DURATION = 3000;

let activeToast = null;

const state = {
    version: 1,
    template: 'ats-tech',
    data: {
        personal: {
            fullName: '',
            jobTitle: '',
            email: '',
            phone: '',
            location: '',
            linkedin: '',
            github: '',
            portfolio: ''
        },
        summary: '',
        experience: [],
        projects: [],
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
    projectsList: null,
    educationList: null,
    skillsList: null,
    certificationsList: null,
    addExperienceBtn: null,
    addProjectBtn: null,
    addEducationBtn: null,
    addSkillBtn: null,
    addCertificationBtn: null
};

function init() {
    try {
        cacheDOMElements();
        loadState();
        attachEventListeners();
        updateATSTips(state.template);
        renderResume();
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to initialize Resume Builder. Please refresh the page.');
    }
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
        linkedin: document.getElementById('linkedin'),
        github: document.getElementById('github'),
        portfolio: document.getElementById('portfolio')
    };
    
    dom.summaryInput = document.getElementById('summary-text');
    dom.experienceList = document.getElementById('experience-list');
    dom.projectsList = document.getElementById('projects-list');
    dom.educationList = document.getElementById('education-list');
    dom.skillsList = document.getElementById('skills-list');
    dom.certificationsList = document.getElementById('certifications-list');
    dom.addExperienceBtn = document.getElementById('add-experience');
    dom.addProjectBtn = document.getElementById('add-project');
    dom.addEducationBtn = document.getElementById('add-education');
    dom.addSkillBtn = document.getElementById('add-skill');
    dom.addCertificationBtn = document.getElementById('add-certification');
}

function attachEventListeners() {
    dom.navItems.forEach(item => {
        item.addEventListener('click', handleNavClick);
    });
    
    if (dom.templateSelect) {
        dom.templateSelect.addEventListener('change', handleTemplateChange);
    }
    
    if (dom.downloadBtn) {
        dom.downloadBtn.addEventListener('click', handleDownloadPDF);
    }
    
    Object.values(dom.personalInputs).forEach(input => {
        if (input) {
            input.addEventListener('input', debounce(handlePersonalInput, 300));
        }
    });
    
    if (dom.summaryInput) {
        dom.summaryInput.addEventListener('input', debounce(handleSummaryInput, 300));
    }
    
    if (dom.addExperienceBtn) {
        dom.addExperienceBtn.addEventListener('click', () => addExperience());
    }
    
    if (dom.addProjectBtn) {
        dom.addProjectBtn.addEventListener('click', () => addProject());
    }
    
    if (dom.addEducationBtn) {
        dom.addEducationBtn.addEventListener('click', () => addEducation());
    }
    
    if (dom.addSkillBtn) {
        dom.addSkillBtn.addEventListener('click', addSkill);
    }
    
    if (dom.addCertificationBtn) {
        dom.addCertificationBtn.addEventListener('click', () => addCertification());
    }
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
    updateATSTips(e.target.value);
    saveState();
    renderResume();
}

function updateATSTips(template) {
    const tipsContent = document.getElementById('ats-tips-content');
    if (!tipsContent) return;
    
    const tips = {
        'ats-tech': `
            <ul>
                <li><strong>Keywords:</strong> Programming languages (JavaScript, Python, Java), frameworks (React, Node.js), tools (Git, Docker, AWS)</li>
                <li><strong>Metrics:</strong> "Improved performance by 40%", "Reduced load time by 2.5s", "Built system used by 10K+ users"</li>
                <li><strong>Format:</strong> Skills-first approach, use bullet points for achievements</li>
                <li><strong>Action verbs:</strong> Developed, Implemented, Architected, Optimized, Deployed, Engineered</li>
            </ul>
        `,
        'ats-data-science': `
            <ul>
                <li><strong>Keywords:</strong> Python, R, SQL, Machine Learning, TensorFlow, PyTorch, scikit-learn, pandas, NumPy, data visualization</li>
                <li><strong>Metrics:</strong> "Improved model accuracy by 15%", "Processed 10M+ records", "Reduced prediction time by 50%"</li>
                <li><strong>Format:</strong> Lead with technical skills, showcase projects with measurable impact</li>
                <li><strong>Action verbs:</strong> Analyzed, Modeled, Predicted, Optimized, Visualized, Trained</li>
            </ul>
        `,
        'ats-devops': `
            <ul>
                <li><strong>Keywords:</strong> Docker, Kubernetes, Jenkins, AWS/Azure/GCP, Terraform, CI/CD, monitoring, automation</li>
                <li><strong>Metrics:</strong> "Reduced deployment time by 70%", "Achieved 99.9% uptime", "Automated 50+ processes"</li>
                <li><strong>Format:</strong> Certifications prominently, emphasize automation and infrastructure</li>
                <li><strong>Action verbs:</strong> Automated, Orchestrated, Deployed, Monitored, Scaled, Configured</li>
            </ul>
        `,
        'ats-product': `
            <ul>
                <li><strong>Keywords:</strong> Product strategy, roadmap, user research, A/B testing, agile, stakeholder management, analytics</li>
                <li><strong>Metrics:</strong> "Increased user engagement by 35%", "Launched 5 features", "Grew revenue by $2M"</li>
                <li><strong>Format:</strong> Strong summary, emphasize business impact and leadership</li>
                <li><strong>Action verbs:</strong> Launched, Strategized, Prioritized, Collaborated, Analyzed, Delivered</li>
            </ul>
        `,
        'ats-uiux': `
            <ul>
                <li><strong>Keywords:</strong> Figma, Sketch, Adobe XD, user research, wireframing, prototyping, usability testing, design systems</li>
                <li><strong>Metrics:</strong> "Improved user satisfaction by 40%", "Reduced friction by 25%", "Designed for 100K+ users"</li>
                <li><strong>Format:</strong> Portfolio link in header, showcase design projects with outcomes</li>
                <li><strong>Action verbs:</strong> Designed, Prototyped, Researched, Iterated, Collaborated, Tested</li>
            </ul>
        `,
        'ats-business': `
            <ul>
                <li><strong>Keywords:</strong> Financial analysis, stakeholder management, strategic planning, ROI, forecasting, P&L</li>
                <li><strong>Metrics:</strong> "Increased revenue by $2M", "Managed $10M budget", "Led team of 15", "Saved 20% costs"</li>
                <li><strong>Format:</strong> Lead with experience, emphasize leadership and business impact</li>
                <li><strong>Action verbs:</strong> Managed, Directed, Analyzed, Negotiated, Streamlined, Achieved</li>
            </ul>
        `,
        'ats-healthcare': `
            <ul>
                <li><strong>Keywords:</strong> Patient care, HIPAA, EMR/EHR systems, clinical protocols, certifications, case management</li>
                <li><strong>Certifications:</strong> List all licenses prominently (RN, BSN, ACLS, BLS, specialty certifications)</li>
                <li><strong>Format:</strong> Certifications first, patient outcomes, compliance adherence</li>
                <li><strong>Action verbs:</strong> Administered, Assessed, Coordinated, Documented, Treated, Monitored</li>
            </ul>
        `,
        'ats-engineering': `
            <ul>
                <li><strong>Keywords:</strong> CAD (AutoCAD, SolidWorks), project management, FEA, technical specifications, quality control</li>
                <li><strong>Metrics:</strong> "Reduced costs by 25%", "Completed 50+ projects", "Improved efficiency by 30%"</li>
                <li><strong>Format:</strong> Emphasize technical skills and PE/FE certifications</li>
                <li><strong>Action verbs:</strong> Designed, Engineered, Calculated, Tested, Supervised, Optimized</li>
            </ul>
        `,
        'ats-marketing': `
            <ul>
                <li><strong>Keywords:</strong> SEO/SEM, Google Analytics, content strategy, social media, email marketing, CRM, conversion optimization</li>
                <li><strong>Metrics:</strong> "Increased engagement by 150%", "Generated 10K leads", "Grew followers by 5K", "Improved ROI by 80%"</li>
                <li><strong>Format:</strong> Show measurable campaign results, digital tools mastery</li>
                <li><strong>Action verbs:</strong> Launched, Executed, Optimized, Analyzed, Created, Grew</li>
            </ul>
        `,
        'ats-education': `
            <ul>
                <li><strong>Keywords:</strong> Curriculum development, classroom management, differentiated instruction, assessment, educational technology</li>
                <li><strong>Certifications:</strong> Teaching licenses, subject certifications, ESL, special education credentials</li>
                <li><strong>Format:</strong> Education and certifications first, student outcome metrics</li>
                <li><strong>Action verbs:</strong> Instructed, Developed, Assessed, Mentored, Collaborated, Implemented</li>
            </ul>
        `,
        'ats-sales': `
            <ul>
                <li><strong>Keywords:</strong> Revenue generation, quota attainment, CRM (Salesforce), pipeline management, B2B/B2C, negotiation</li>
                <li><strong>Metrics:</strong> "Exceeded quota by 120%", "Closed $5M in deals", "Grew territory by 40%", "Retained 95% clients"</li>
                <li><strong>Format:</strong> Lead with quantifiable achievements, percentages over quota</li>
                <li><strong>Action verbs:</strong> Closed, Generated, Exceeded, Negotiated, Prospected, Secured</li>
            </ul>
        `,
        'ats-hr': `
            <ul>
                <li><strong>Keywords:</strong> Talent acquisition, HRIS, employee relations, performance management, compliance, benefits administration</li>
                <li><strong>Metrics:</strong> "Reduced turnover by 20%", "Hired 100+ employees", "Improved satisfaction by 30%"</li>
                <li><strong>Format:</strong> Balance soft skills with technical HR systems knowledge</li>
                <li><strong>Action verbs:</strong> Recruited, Implemented, Facilitated, Managed, Mediated, Developed</li>
            </ul>
        `,
        'ats-legal': `
            <ul>
                <li><strong>Keywords:</strong> Legal research, contract negotiation, compliance, litigation, regulatory, risk management</li>
                <li><strong>Certifications:</strong> Bar admission(s), specialized legal certifications, practice areas</li>
                <li><strong>Format:</strong> Education and bar admission first, highlight case outcomes and expertise</li>
                <li><strong>Action verbs:</strong> Advised, Negotiated, Drafted, Litigated, Reviewed, Represented</li>
            </ul>
        `
    };
    
    tipsContent.innerHTML = tips[template] || tips['ats-tech'];
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

function addProject(data = null) {
    const id = Date.now().toString();
    const project = data || {
        id,
        name: '',
        description: '',
        techStack: '',
        link: '',
        highlights: ''
    };
    
    if (!data) {
        state.data.projects.push(project);
        saveState();
    }
    
    const itemHTML = `
        <div class="rb-list-item" data-id="${project.id}">
            <div class="rb-list-item-header">
                <h3 class="rb-section-title" style="font-size: var(--fs-12-18);">Project Entry</h3>
                <div class="rb-list-item-actions">
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeProject('${project.id}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width: 1rem; height: 1rem;">
                        Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Project Name</label>
                        <input type="text" class="rb-input" data-field="name" value="${project.name}" placeholder="E-Commerce Platform">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Project Link (Optional)</label>
                        <input type="url" class="rb-input" data-field="link" value="${project.link}" placeholder="github.com/username/project">
                    </div>
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Tech Stack</label>
                    <input type="text" class="rb-input" data-field="techStack" value="${project.techStack}" placeholder="React, Node.js, MongoDB, Express">
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Description</label>
                    <textarea class="rb-textarea" data-field="description" rows="3" placeholder="Brief description of the project...">${project.description}</textarea>
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Key Highlights (one per line)</label>
                    <textarea class="rb-textarea" data-field="highlights" rows="4" placeholder="Built responsive UI with role-based access control
Implemented complete CRUD operations
Integrated Cloudinary for media storage">${project.highlights}</textarea>
                </div>
            </div>
        </div>
    `;
    
    dom.projectsList.insertAdjacentHTML('beforeend', itemHTML);
    
    const item = dom.projectsList.querySelector(`[data-id="${project.id}"]`);
    const inputs = item.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('input', debounce((e) => {
            updateProject(project.id, e.target.dataset.field, e.target.value);
        }, 300));
    });
}

function updateProject(id, field, value) {
    const project = state.data.projects.find(proj => proj.id === id);
    if (project) {
        project[field] = value;
        saveState();
        renderResume();
    }
}

function removeProject(id) {
    state.data.projects = state.data.projects.filter(proj => proj.id !== id);
    const item = dom.projectsList.querySelector(`[data-id="${id}"]`);
    if (item) {
        item.remove();
    }
    saveState();
    renderResume();
    showToast('Project deleted', 'success');
}

function addSkill() {
    const existingInput = dom.skillsList.querySelector('.rb-skill-input-card');
    if (existingInput) {
        existingInput.querySelector('input').focus();
        return;
    }
    
    const inputCard = document.createElement('div');
    inputCard.className = 'rb-skill-input-card';
    inputCard.innerHTML = `
        <input type="text" class="rb-input rb-skill-input" placeholder="Enter skill name" autofocus>
        <div class="rb-skill-input-actions">
            <button class="rb-btn rb-btn-primary rb-btn-small" data-action="save">
                <img src="assets/svg/success.svg" alt="Save" class="rb-icon" style="width: 1rem; height: 1rem;">
                Add
            </button>
            <button class="rb-btn rb-btn-secondary rb-btn-small" data-action="cancel">
                <img src="assets/svg/close.svg" alt="Cancel" class="rb-icon" style="width: 1rem; height: 1rem;">
                Cancel
            </button>
        </div>
    `;
    
    dom.skillsList.insertBefore(inputCard, dom.skillsList.firstChild);
    
    const input = inputCard.querySelector('input');
    const saveBtn = inputCard.querySelector('[data-action="save"]');
    const cancelBtn = inputCard.querySelector('[data-action="cancel"]');
    
    const saveSkill = () => {
        const skillName = input.value.trim();
        if (skillName) {
            const skill = {
                id: Date.now().toString(),
                name: skillName
            };
            state.data.skills.push(skill);
            inputCard.remove();
            renderSkill(skill);
            saveState();
            renderResume();
            showToast('Skill added successfully', 'success');
        } else {
            input.focus();
            showToast('Please enter a skill name', 'warning');
        }
    };
    
    const cancelAdd = () => {
        inputCard.remove();
    };
    
    saveBtn.addEventListener('click', saveSkill);
    cancelBtn.addEventListener('click', cancelAdd);
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveSkill();
        } else if (e.key === 'Escape') {
            cancelAdd();
        }
    });
    
    input.focus();
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
    try {
        const { personal, summary, experience, education, skills, certifications } = state.data;
        const template = state.template;
        
        let html = '';
        
        const templateConfig = {
        'ats-tech': {
            sectionOrder: ['skills', 'experience', 'projects', 'education', 'certifications', 'summary'],
            headerStyle: 'tech',
            useMetrics: true,
            skillsFormat: 'grouped'
        },
        'ats-data-science': {
            sectionOrder: ['skills', 'experience', 'projects', 'education', 'certifications', 'summary'],
            headerStyle: 'tech',
            useMetrics: true,
            skillsFormat: 'grouped'
        },
        'ats-devops': {
            sectionOrder: ['skills', 'certifications', 'experience', 'projects', 'education', 'summary'],
            headerStyle: 'tech',
            useMetrics: true,
            skillsFormat: 'grouped'
        },
        'ats-product': {
            sectionOrder: ['summary', 'experience', 'skills', 'education', 'certifications'],
            headerStyle: 'business',
            useMetrics: true,
            skillsFormat: 'inline'
        },
        'ats-uiux': {
            sectionOrder: ['summary', 'experience', 'projects', 'skills', 'education'],
            headerStyle: 'creative',
            useMetrics: true,
            skillsFormat: 'grouped'
        },
        'ats-business': {
            sectionOrder: ['summary', 'experience', 'education', 'skills', 'certifications'],
            headerStyle: 'business',
            useMetrics: true,
            skillsFormat: 'inline'
        },
        'ats-healthcare': {
            sectionOrder: ['certifications', 'experience', 'education', 'skills', 'summary'],
            headerStyle: 'healthcare',
            useMetrics: false,
            skillsFormat: 'bulleted'
        },
        'ats-engineering': {
            sectionOrder: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications'],
            headerStyle: 'engineering',
            useMetrics: true,
            skillsFormat: 'grouped'
        },
        'ats-marketing': {
            sectionOrder: ['summary', 'experience', 'projects', 'skills', 'education', 'certifications'],
            headerStyle: 'marketing',
            useMetrics: true,
            skillsFormat: 'inline'
        },
        'ats-education': {
            sectionOrder: ['education', 'certifications', 'experience', 'skills', 'summary'],
            headerStyle: 'education',
            useMetrics: false,
            skillsFormat: 'bulleted'
        },
        'ats-sales': {
            sectionOrder: ['summary', 'experience', 'skills', 'education', 'certifications'],
            headerStyle: 'sales',
            useMetrics: true,
            skillsFormat: 'inline'
        },
        'ats-hr': {
            sectionOrder: ['summary', 'experience', 'certifications', 'education', 'skills'],
            headerStyle: 'business',
            useMetrics: true,
            skillsFormat: 'inline'
        },
        'ats-legal': {
            sectionOrder: ['education', 'certifications', 'experience', 'skills', 'summary'],
            headerStyle: 'business',
            useMetrics: false,
            skillsFormat: 'bulleted'
        }
    };
    
    const config = templateConfig[template] || templateConfig['ats-tech'];
    
    html += renderHeader(personal, config.headerStyle);
    
    const sections = {
        summary: () => renderSummary(summary),
        experience: () => renderExperience(experience, config.useMetrics),
        projects: () => renderProjects(state.data.projects),
        education: () => renderEducation(education),
        skills: () => renderSkills(skills, config.skillsFormat),
        certifications: () => renderCertifications(certifications)
    };
    
    config.sectionOrder.forEach(sectionName => {
        if (sections[sectionName]) {
            html += sections[sectionName]();
        }
    });
    
    if (dom.resumeOutput) {
        dom.resumeOutput.innerHTML = html;
    }
    } catch (error) {
        console.error('Render error:', error);
        console.error('State data:', state.data);
        if (dom.resumeOutput) {
            dom.resumeOutput.innerHTML = `
                <div style="padding: 20px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px;">
                    <h3 style="color: #856404; margin-bottom: 10px;">⚠️ Rendering Issue Detected</h3>
                    <p style="color: #856404; margin-bottom: 10px;">There was an error rendering your resume. This is usually caused by corrupted saved data.</p>
                    <button onclick="localStorage.removeItem('resumeBuilder_v1'); location.reload();" 
                            style="padding: 10px 20px; background: #ffc107; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        Clear Data & Refresh
                    </button>
                    <p style="color: #856404; margin-top: 10px; font-size: 12px;">Error: ${error.message}</p>
                </div>
            `;
        }
    }
}

function renderHeader(personal, style) {
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
    if (personal.github) contactInfo.push(escapeHTML(personal.github));
    if (personal.portfolio) contactInfo.push(escapeHTML(personal.portfolio));
    
    if (contactInfo.length > 0) {
        html += `<div class="rb-resume-contact">${contactInfo.join(' | ')}</div>`;
    }
    
    html += '</div>';
    return html;
}

function renderSummary(summary) {
    if (!summary) return '';
    return `
        <div class="rb-resume-section">
            <h2 class="rb-resume-section-title">Summary</h2>
            <div class="rb-resume-summary">${escapeHTML(summary)}</div>
        </div>
    `;
}

function renderExperience(experience, useMetrics) {
    if (!experience || experience.length === 0) return '';
    
    let html = '<div class="rb-resume-section"><h2 class="rb-resume-section-title">Experience</h2>';
    
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
                const description = escapeHTML(exp.description);
                const lines = description.split('\n').filter(line => line.trim());
                
                if (lines.length > 1) {
                    html += '<ul class="rb-resume-list">';
                    lines.forEach(line => {
                        html += `<li>${line}</li>`;
                    });
                    html += '</ul>';
                } else {
                    html += `<div class="rb-resume-entry-description">${description}</div>`;
                }
            }
            html += '</div>';
        }
    });
    
    html += '</div>';
    return html;
}

function renderEducation(education) {
    if (!education || education.length === 0) return '';
    
    let html = '<div class="rb-resume-section"><h2 class="rb-resume-section-title">Education</h2>';
    
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
    return html;
}

function renderProjects(projects) {
    if (!projects || projects.length === 0) return '';
    
    let html = '<div class="rb-resume-section"><h2 class="rb-resume-section-title">Projects</h2>';
    
    projects.forEach(proj => {
        if (proj.name) {
            html += '<div class="rb-resume-entry">';
            html += '<div class="rb-resume-entry-header">';
            html += '<div>';
            html += `<div class="rb-resume-entry-title">${escapeHTML(proj.name)}</div>`;
            if (proj.link) {
                html += `<div class="rb-resume-entry-subtitle">${escapeHTML(proj.link)}</div>`;
            }
            html += '</div>';
            html += '</div>';
            
            if (proj.techStack) {
                html += `<div class="rb-resume-entry-location"><strong>Tech Stack:</strong> ${escapeHTML(proj.techStack)}</div>`;
            }
            
            if (proj.description) {
                html += `<div class="rb-resume-entry-description">${escapeHTML(proj.description)}</div>`;
            }
            
            if (proj.highlights) {
                const highlights = escapeHTML(proj.highlights).split('\n').filter(line => line.trim());
                if (highlights.length > 0) {
                    html += '<ul class="rb-resume-list">';
                    highlights.forEach(highlight => {
                        html += `<li>${highlight}</li>`;
                    });
                    html += '</ul>';
                }
            }
            
            html += '</div>';
        }
    });
    
    html += '</div>';
    return html;
}

function renderSkills(skills, format) {
    if (!skills || skills.length === 0) return '';
    
    let html = '<div class="rb-resume-section"><h2 class="rb-resume-section-title">Technical Skills</h2>';
    
    if (format === 'grouped') {
        html += '<div class="rb-resume-skills-list">';
        skills.forEach(skill => {
            html += `<span class="rb-resume-skill">${escapeHTML(skill.name)}</span>`;
        });
        html += '</div>';
    } else if (format === 'inline') {
        const skillNames = skills.map(s => escapeHTML(s.name)).join(', ');
        html += `<div class="rb-resume-summary">${skillNames}</div>`;
    } else if (format === 'bulleted') {
        html += '<ul class="rb-resume-list">';
        skills.forEach(skill => {
            html += `<li>${escapeHTML(skill.name)}</li>`;
        });
        html += '</ul>';
    }
    
    html += '</div>';
    return html;
}

function renderCertifications(certifications) {
    if (!certifications || certifications.length === 0) return '';
    
    let html = '<div class="rb-resume-section"><h2 class="rb-resume-section-title">Certifications</h2>';
    
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
    return html;
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
                
                // Ensure all arrays exist (for backwards compatibility)
                if (!state.data.projects) state.data.projects = [];
                if (!state.data.experience) state.data.experience = [];
                if (!state.data.education) state.data.education = [];
                if (!state.data.skills) state.data.skills = [];
                if (!state.data.certifications) state.data.certifications = [];
                
                populateForm();
            }
        }
    } catch (error) {
        console.error('Load state error:', error);
        // Clear corrupt data and start fresh
        localStorage.removeItem(STORAGE_KEY);
        showToast('Starting with fresh data', 'info');
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
    
    if (state.data.experience && Array.isArray(state.data.experience)) {
        state.data.experience.forEach(exp => addExperience(exp));
    }
    
    if (state.data.projects && Array.isArray(state.data.projects)) {
        state.data.projects.forEach(proj => addProject(proj));
    }
    
    if (state.data.education && Array.isArray(state.data.education)) {
        state.data.education.forEach(edu => addEducation(edu));
    }
    
    if (state.data.skills && Array.isArray(state.data.skills)) {
        state.data.skills.forEach(skill => renderSkill(skill));
    }
    
    if (state.data.certifications && Array.isArray(state.data.certifications)) {
        state.data.certifications.forEach(cert => addCertification(cert));
    }
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
window.removeProject = removeProject;
window.removeEducation = removeEducation;
window.removeSkill = removeSkill;
window.removeCertification = removeCertification;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Mobile Menu Toggle (add this at the end of init function)
const menuToggle = document.getElementById('menu-toggle');
const sidenav = document.getElementById('sidenav');
const fabPreview = document.getElementById('fab-preview');

if (menuToggle && sidenav) {
    menuToggle.addEventListener('click', () => {
        sidenav.classList.toggle('open');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!sidenav.contains(e.target) && !menuToggle.contains(e.target)) {
            sidenav.classList.remove('open');
        }
    });
    
    // Close menu when selecting a section
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidenav.classList.remove('open');
            }
        });
    });
}

// Mobile Preview FAB
if (fabPreview) {
    fabPreview.addEventListener('click', () => {
        const previewSidebar = document.getElementById('preview-sidebar');
        if (previewSidebar) {
            previewSidebar.classList.toggle('mobile-open');
        }
    });
}

// Update badge display function
function updateAllBadges() {
    ['personal', 'summary', 'experience', 'projects', 'education', 'skills', 'certifications'].forEach(section => {
        const badge = document.getElementById(`badge-${section}`);
        if (!badge) return;
        
        let count = 0;
        switch (section) {
            case 'personal':
                count = Object.values(state.data.personal).filter(v => v && v.trim()).length;
                break;
            case 'summary':
                count = state.data.summary ? 1 : 0;
                break;
            default:
                count = state.data[section]?.length || 0;
        }
        
        if (count > 0) {
            badge.textContent = count;
            badge.classList.add('show');
        } else {
            badge.classList.remove('show');
        }
    });
}