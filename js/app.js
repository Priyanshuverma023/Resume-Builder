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
        updateATSTips(state.template || 'ats-tech');
        renderResume();
        updateEmptyStates();
        updateAllBadges();
        updateSummaryCharCount();
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to initialize Resume Builder. Please refresh the page.');
    }
}

function cacheDOMElements() {
    dom.navItems = document.querySelectorAll('.nav-tab');
    dom.sections = document.querySelectorAll('.section');
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
    if (dom.navItems && dom.navItems.length) {
        dom.navItems.forEach(item => {
            item.addEventListener('click', handleNavClick);
        });
    }

    const clearAllBtn = document.getElementById('clear-all-data');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', handleClearAllData);
    }

    const clearOverlay = document.getElementById('clear-all-confirm-overlay');
    const clearCancel = document.getElementById('clear-all-cancel');
    const clearConfirm = document.getElementById('clear-all-confirm');
    if (clearOverlay) {
        clearOverlay.addEventListener('click', (e) => {
            if (e.target === clearOverlay) closeClearAllConfirm();
        });
    }
    if (clearCancel) clearCancel.addEventListener('click', closeClearAllConfirm);
    if (clearConfirm) clearConfirm.addEventListener('click', performClearAllData);

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const overlay = document.getElementById('clear-all-confirm-overlay');
        if (overlay && overlay.classList.contains('is-open')) closeClearAllConfirm();
        const previewModal = document.getElementById('preview-modal');
        if (previewModal && previewModal.classList.contains('is-open')) closePreviewModal();
    });

    // ── Preview Modal ──
    const previewModal = document.getElementById('preview-modal');
    const previewOpenBtn = document.getElementById('preview-btn');
    const previewCloseBtn = document.getElementById('close-preview');

    function openPreviewModal() {
        if (!previewModal) return;
        previewModal.classList.add('is-open');
        previewModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        renderResume();
    }

    function closePreviewModal() {
        if (!previewModal) return;
        previewModal.classList.remove('is-open');
        previewModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (previewOpenBtn) previewOpenBtn.addEventListener('click', openPreviewModal);
    if (previewCloseBtn) previewCloseBtn.addEventListener('click', closePreviewModal);

    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) closePreviewModal();
        });
    }

    const toggleTipsBtn = document.getElementById('toggle-tips');
    if (toggleTipsBtn) {
        toggleTipsBtn.addEventListener('click', () => {
            const atsTips = document.getElementById('ats-tips');
            if (atsTips) atsTips.classList.toggle('collapsed');
        });
    }

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

    // ── Preview Pan + Zoom ──
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomLevelEl = document.getElementById('zoom-level');
    const resumeWrapper = document.getElementById('resume-wrapper');
    const previewContent = document.getElementById('preview-content');

    let zoomLevel = 1.0;
    const ZOOM_STEP = 0.1;
    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 2.0;
    const PAN_KEY_STEP = 40;

    function applyZoom() {
        if (!resumeWrapper) return;
        resumeWrapper.style.transform = `scale(${zoomLevel})`;
        resumeWrapper.style.transformOrigin = 'top center';
        if (zoomLevelEl) {
            zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
        }
        if (zoomInBtn) zoomInBtn.disabled = zoomLevel >= ZOOM_MAX;
        if (zoomOutBtn) zoomOutBtn.disabled = zoomLevel <= ZOOM_MIN;
        if (previewContent) {
            previewContent.style.cursor = zoomLevel > 1.0 ? 'grab' : 'default';
        }
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            zoomLevel = Math.min(ZOOM_MAX, parseFloat((zoomLevel + ZOOM_STEP).toFixed(1)));
            applyZoom();
        });
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            zoomLevel = Math.max(ZOOM_MIN, parseFloat((zoomLevel - ZOOM_STEP).toFixed(1)));
            applyZoom();
            if (zoomLevel <= 1.0 && previewContent) {
                previewContent.scrollLeft = 0;
                previewContent.scrollTop = 0;
            }
        });
    }

    if (previewContent) {
        previewContent.addEventListener('wheel', (e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
            zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, parseFloat((zoomLevel + delta).toFixed(1))));
            applyZoom();
            if (zoomLevel <= 1.0 && previewContent) {
                previewContent.scrollLeft = 0;
                previewContent.scrollTop = 0;
            }
        }, { passive: false });
    }

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let scrollStartX = 0;
    let scrollStartY = 0;

    function onMouseDown(e) {
        if (e.button !== 0) return;
        if (e.target.closest('button, input, select, a, textarea')) return;
        if (zoomLevel <= 1.0) return;

        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        scrollStartX = previewContent ? previewContent.scrollLeft : 0;
        scrollStartY = previewContent ? previewContent.scrollTop : 0;

        if (previewContent) {
            previewContent.style.cursor = 'grabbing';
            previewContent.classList.add('is-dragging');
        }
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!isDragging || !previewContent) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        previewContent.scrollLeft = scrollStartX - dx;
        previewContent.scrollTop = scrollStartY - dy;
    }

    function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        if (previewContent) {
            previewContent.classList.remove('is-dragging');
            previewContent.style.cursor = zoomLevel > 1.0 ? 'grab' : 'default';
        }
    }

    if (previewContent) {
        previewContent.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mouseleave', onMouseUp);
    }

    let isTouchPanning = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchScrollX = 0;
    let touchScrollY = 0;

    function onTouchStart(e) {
        if (e.touches.length !== 1) return;
        if (zoomLevel <= 1.0) return;
        isTouchPanning = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchScrollX = previewContent ? previewContent.scrollLeft : 0;
        touchScrollY = previewContent ? previewContent.scrollTop : 0;
    }

    function onTouchMove(e) {
        if (!isTouchPanning || !previewContent || e.touches.length !== 1) return;
        e.preventDefault();
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        previewContent.scrollLeft = touchScrollX - dx;
        previewContent.scrollTop = touchScrollY - dy;
    }

    function onTouchEnd() { isTouchPanning = false; }

    if (previewContent) {
        previewContent.addEventListener('touchstart', onTouchStart, { passive: true });
        previewContent.addEventListener('touchmove', onTouchMove, { passive: false });
        previewContent.addEventListener('touchend', onTouchEnd, { passive: true });
        previewContent.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }

    if (previewContent) {
        previewContent.setAttribute('tabindex', '0');
        previewContent.addEventListener('keydown', (e) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
            if (zoomLevel <= 1.0) return;
            e.preventDefault();
            const step = e.shiftKey ? PAN_KEY_STEP * 3 : PAN_KEY_STEP;
            if (e.key === 'ArrowLeft') previewContent.scrollLeft -= step;
            if (e.key === 'ArrowRight') previewContent.scrollLeft += step;
            if (e.key === 'ArrowUp') previewContent.scrollTop -= step;
            if (e.key === 'ArrowDown') previewContent.scrollTop += step;
        });
    }

    if (previewContent) {
        previewContent.addEventListener('dblclick', (e) => {
            if (e.target.closest('button, input, select, a, textarea')) return;
            zoomLevel = 1.0;
            applyZoom();
            previewContent.scrollLeft = 0;
            previewContent.scrollTop = 0;
        });
    }

    applyZoom();
}


function handleNavClick(e) {
    const sectionName = e.currentTarget.dataset.section;
    if (!sectionName) return;

    if (dom.navItems && dom.navItems.length) {
        dom.navItems.forEach(item => item.classList.remove('active'));
        e.currentTarget.classList.add('active');
    }
    if (dom.sections && dom.sections.length) {
        dom.sections.forEach(section => {
            section.classList.remove('active');
            if (section.dataset.section === sectionName) {
                section.classList.add('active');
            }
        });
    }
}

function handleTemplateChange(e) {
    state.template = e.target.value || 'ats-tech';
    updateATSTips(state.template);
    saveState();
    renderResume();
}

function openClearAllConfirm() {
    const overlay = document.getElementById('clear-all-confirm-overlay');
    if (!overlay) return;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const firstFocus = overlay.querySelector('#clear-all-cancel');
    if (firstFocus) firstFocus.focus();
}

function closeClearAllConfirm() {
    const overlay = document.getElementById('clear-all-confirm-overlay');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function handleClearAllData() {
    openClearAllConfirm();
}

function performClearAllData() {
    closeClearAllConfirm();
    state.data = {
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
    };
    state.template = 'ats-tech';
    if (dom.templateSelect) dom.templateSelect.value = state.template;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}

function updateEmptyStates() {
    const map = [
        ['experience', 'experience-empty', 'experience-list', 'rb-list-item'],
        ['projects', 'projects-empty', 'projects-list', 'rb-list-item'],
        ['education', 'education-empty', 'education-list', 'rb-list-item'],
        ['skills', 'skills-empty', 'skills-list', 'rb-skill-tag'],
        ['certifications', 'certifications-empty', 'certifications-list', 'rb-list-item']
    ];
    map.forEach(([key, emptyId, listId, itemClass]) => {
        const emptyEl = document.getElementById(emptyId);
        const listEl = document.getElementById(listId);
        if (!emptyEl || !listEl) return;
        const hasItems = listEl.querySelector(`.${itemClass}`);
        emptyEl.style.display = hasItems ? 'none' : 'flex';
    });
}

function updateSummaryCharCount() {
    const el = document.getElementById('summary-char-count');
    if (!el) return;
    const len = (state.data.summary || '').length;
    const max = 500;
    el.textContent = `${len} / ${max}`;
    if (len > max) el.classList.add('over-limit');
    else el.classList.remove('over-limit');
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
    const id = e.target.id;
    if (!id) return;
    const field = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    if (!state.data.personal.hasOwnProperty(field)) return;
    state.data.personal[field] = (e.target.value || '').trim();
    saveState();
    renderResume();
    updateAllBadges();
}

function handleSummaryInput(e) {
    const val = (e.target.value || '').trim();
    state.data.summary = val.length > 500 ? val.slice(0, 500) : val;
    if (e.target.value !== state.data.summary) e.target.value = state.data.summary;
    saveState();
    renderResume();
    updateSummaryCharCount();
    updateAllBadges();
}

function addExperience(data = null) {
    if (!dom.experienceList) return;
    const id = (data && data.id) ? data.id : Date.now().toString();
    if (data && !data.id) data.id = id;
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
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeExperience('${String(experience.id).replace(/'/g, "\\'")}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width: 1rem; height: 1rem;">
                        Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Company</label>
                        <input type="text" class="rb-input" data-field="company" value="${escapeHTML(experience.company || '')}" placeholder="Acme Corporation">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Position</label>
                        <input type="text" class="rb-input" data-field="position" value="${escapeHTML(experience.position || '')}" placeholder="Senior Developer">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Location</label>
                        <input type="text" class="rb-input" data-field="location" value="${escapeHTML(experience.location || '')}" placeholder="San Francisco, CA">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label rb-label-inline">
                            <input type="checkbox" data-field="current" ${experience.current ? 'checked' : ''}>
                            Currently working here
                        </label>
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Start Date</label>
                        <input type="text" class="rb-input" data-field="startDate" value="${escapeHTML(experience.startDate || '')}" placeholder="January 2020">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">End Date</label>
                        <input type="text" class="rb-input" data-field="endDate" value="${escapeHTML(experience.endDate || '')}" placeholder="Present" ${experience.current ? 'disabled' : ''}>
                    </div>
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Description</label>
                    <textarea class="rb-textarea" data-field="description" rows="4" placeholder="Key achievements and responsibilities...">${escapeHTML(experience.description || '')}</textarea>
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
                if (endDateInput) {
                    if (e.target.checked) {
                        endDateInput.disabled = true;
                        endDateInput.value = 'Present';
                        updateExperience(experience.id, 'endDate', 'Present');
                    } else {
                        endDateInput.disabled = false;
                    }
                }
                updateExperience(experience.id, 'current', e.target.checked);
            });
        }
    });
    updateEmptyStates();
    updateAllBadges();
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
    if (!id) return;
    state.data.experience = state.data.experience.filter(exp => exp.id !== id);
    if (dom.experienceList) {
        const item = dom.experienceList.querySelector(`[data-id="${id}"]`);
        if (item) item.remove();
    }
    saveState();
    renderResume();
    updateEmptyStates();
    updateAllBadges();
    showToast('Experience entry deleted', 'success');
}

function addEducation(data = null) {
    if (!dom.educationList) return;
    const id = (data && data.id) ? data.id : Date.now().toString();
    if (data && !data.id) data.id = id;
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
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeEducation('${String(education.id).replace(/'/g, "\\'")}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width: 1rem; height: 1rem;">
                        Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Institution</label>
                        <input type="text" class="rb-input" data-field="institution" value="${escapeHTML(education.institution || '')}" placeholder="University of California">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Degree</label>
                        <input type="text" class="rb-input" data-field="degree" value="${escapeHTML(education.degree || '')}" placeholder="Bachelor of Science">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Field of Study</label>
                        <input type="text" class="rb-input" data-field="field" value="${escapeHTML(education.field || '')}" placeholder="Computer Science">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Location</label>
                        <input type="text" class="rb-input" data-field="location" value="${escapeHTML(education.location || '')}" placeholder="Berkeley, CA">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Graduation Date</label>
                        <input type="text" class="rb-input" data-field="graduationDate" value="${escapeHTML(education.graduationDate || '')}" placeholder="May 2020">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">GPA (Optional)</label>
                        <input type="text" class="rb-input" data-field="gpa" value="${escapeHTML(education.gpa || '')}" placeholder="3.8/4.0">
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
    updateEmptyStates();
    updateAllBadges();
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
    if (!id) return;
    state.data.education = state.data.education.filter(edu => edu.id !== id);
    if (dom.educationList) {
        const item = dom.educationList.querySelector(`[data-id="${id}"]`);
        if (item) item.remove();
    }
    saveState();
    renderResume();
    updateEmptyStates();
    updateAllBadges();
    showToast('Education entry deleted', 'success');
}

function addProject(data = null) {
    if (!dom.projectsList) return;
    const id = (data && data.id) ? data.id : Date.now().toString();
    if (data && !data.id) data.id = id;
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
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeProject('${String(project.id).replace(/'/g, "\\'")}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width: 1rem; height: 1rem;">
                        Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Project Name</label>
                        <input type="text" class="rb-input" data-field="name" value="${escapeHTML(project.name || '')}" placeholder="E-Commerce Platform">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Project Link (Optional)</label>
                        <input type="url" class="rb-input" data-field="link" value="${escapeHTML(project.link || '')}" placeholder="github.com/username/project">
                    </div>
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Tech Stack</label>
                    <input type="text" class="rb-input" data-field="techStack" value="${escapeHTML(project.techStack || '')}" placeholder="React, Node.js, MongoDB, Express">
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Description</label>
                    <textarea class="rb-textarea" data-field="description" rows="3" placeholder="Brief description of the project...">${escapeHTML(project.description || '')}</textarea>
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Key Highlights (one per line)</label>
                    <textarea class="rb-textarea" data-field="highlights" rows="4" placeholder="Built responsive UI with role-based access control
Implemented complete CRUD operations
Integrated Cloudinary for media storage">${escapeHTML(project.highlights || '')}</textarea>
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
    updateEmptyStates();
    updateAllBadges();
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
    if (!id) return;
    state.data.projects = state.data.projects.filter(proj => proj.id !== id);
    if (dom.projectsList) {
        const item = dom.projectsList.querySelector(`[data-id="${id}"]`);
        if (item) item.remove();
    }
    saveState();
    renderResume();
    updateEmptyStates();
    updateAllBadges();
    showToast('Project deleted', 'success');
}

function addSkill() {
    if (!dom.skillsList) return;
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
            updateEmptyStates();
            updateAllBadges();
            showToast('Skill added successfully', 'success');
        } else {
            input.focus();
            showToast('Please enter a skill name', 'warning');
        }
    };

    const cancelAdd = () => {
        inputCard.remove();
        updateEmptyStates();
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
    if (!dom.skillsList || !skill || !skill.id) return;
    const name = (skill.name && String(skill.name).trim()) ? escapeHTML(skill.name) : '';
    const safeId = String(skill.id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const skillHTML = `
        <div class="rb-skill-tag" data-id="${escapeHTML(skill.id)}">
            <span>${name}</span>
            <button onclick="removeSkill('${safeId}')" aria-label="Remove skill">
                <img src="assets/svg/close.svg" alt="Remove" class="rb-icon" style="width: 1rem; height: 1rem;">
            </button>
        </div>
    `;
    dom.skillsList.insertAdjacentHTML('beforeend', skillHTML);
}

function removeSkill(id) {
    if (!id) return;
    state.data.skills = state.data.skills.filter(skill => skill.id !== id);
    if (dom.skillsList) {
        const skillTag = dom.skillsList.querySelector(`[data-id="${id}"]`);
        if (skillTag) skillTag.remove();
    }
    saveState();
    renderResume();
    updateEmptyStates();
    updateAllBadges();
}

function addCertification(data = null) {
    if (!dom.certificationsList) return;
    const id = (data && data.id) ? data.id : Date.now().toString();
    if (data && !data.id) data.id = id;
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
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeCertification('${String(certification.id).replace(/'/g, "\\'")}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width: 1rem; height: 1rem;">
                        Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Certification Name</label>
                        <input type="text" class="rb-input" data-field="name" value="${escapeHTML(certification.name || '')}" placeholder="AWS Certified Solutions Architect">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Issuing Organization</label>
                        <input type="text" class="rb-input" data-field="issuer" value="${escapeHTML(certification.issuer || '')}" placeholder="Amazon Web Services">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Date Obtained</label>
                        <input type="text" class="rb-input" data-field="date" value="${escapeHTML(certification.date || '')}" placeholder="June 2023">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Credential ID (Optional)</label>
                        <input type="text" class="rb-input" data-field="credentialId" value="${escapeHTML(certification.credentialId || '')}" placeholder="ABC123XYZ">
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
    updateEmptyStates();
    updateAllBadges();
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
    if (!id) return;
    state.data.certifications = state.data.certifications.filter(cert => cert.id !== id);
    if (dom.certificationsList) {
        const item = dom.certificationsList.querySelector(`[data-id="${id}"]`);
        if (item) item.remove();
    }
    saveState();
    renderResume();
    updateEmptyStates();
    updateAllBadges();
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
            dom.resumeOutput.dataset.template = template;
            dom.resumeOutput.innerHTML = html;
        }
    } catch (error) {
        console.error('Render error:', error);
        if (dom.resumeOutput) {
            dom.resumeOutput.innerHTML = `
                <div style="padding: 20px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px;">
                    <h3 style="color: #856404; margin-bottom: 10px;">⚠️ Rendering Issue Detected</h3>
                    <p style="color: #856404; margin-bottom: 10px;">There was an error rendering your resume.</p>
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

// ============================================================
//  BULLETPROOF PDF DOWNLOAD
//  Strategy: Build a completely isolated, self-contained HTML
//  document inside a hidden off-screen iframe, sized exactly
//  to A4 width (794px). All CSS is inlined from the page's
//  stylesheets. html2pdf captures from the iframe's document,
//  which is completely independent of window size, scroll
//  position, zoom, or any UI state.
// ============================================================

function buildInlineCSS() {
    // Collect all CSS text from document stylesheets
    const parts = [];
    try {
        for (const sheet of document.styleSheets) {
            try {
                const rules = sheet.cssRules || sheet.rules || [];
                for (const rule of rules) {
                    // Skip print media queries (we want screen rendering for capture)
                    if (rule.type === CSSRule.MEDIA_RULE) {
                        const mq = rule.conditionText || rule.media.mediaText || '';
                        if (mq.includes('print')) continue;
                    }
                    parts.push(rule.cssText);
                }
            } catch (e) {
                // Cross-origin stylesheet — skip
            }
        }
    } catch (e) {
        // ignore
    }
    return parts.join('\n');
}

function buildResumeHTML() {
    // Generate fresh resume HTML from current state (same logic as renderResume)
    const { personal, summary, experience, education, skills, certifications } = state.data;
    const template = state.template;

    const templateConfig = {
        'ats-tech':        { sectionOrder: ['skills','experience','projects','education','certifications','summary'], skillsFormat: 'grouped' },
        'ats-data-science':{ sectionOrder: ['skills','experience','projects','education','certifications','summary'], skillsFormat: 'grouped' },
        'ats-devops':      { sectionOrder: ['skills','certifications','experience','projects','education','summary'], skillsFormat: 'grouped' },
        'ats-product':     { sectionOrder: ['summary','experience','skills','education','certifications'], skillsFormat: 'inline' },
        'ats-uiux':        { sectionOrder: ['summary','experience','projects','skills','education'], skillsFormat: 'grouped' },
        'ats-business':    { sectionOrder: ['summary','experience','education','skills','certifications'], skillsFormat: 'inline' },
        'ats-healthcare':  { sectionOrder: ['certifications','experience','education','skills','summary'], skillsFormat: 'bulleted' },
        'ats-engineering': { sectionOrder: ['summary','skills','experience','projects','education','certifications'], skillsFormat: 'grouped' },
        'ats-marketing':   { sectionOrder: ['summary','experience','projects','skills','education','certifications'], skillsFormat: 'inline' },
        'ats-education':   { sectionOrder: ['education','certifications','experience','skills','summary'], skillsFormat: 'bulleted' },
        'ats-sales':       { sectionOrder: ['summary','experience','skills','education','certifications'], skillsFormat: 'inline' },
        'ats-hr':          { sectionOrder: ['summary','experience','certifications','education','skills'], skillsFormat: 'inline' },
        'ats-legal':       { sectionOrder: ['education','certifications','experience','skills','summary'], skillsFormat: 'bulleted' }
    };

    const config = templateConfig[template] || templateConfig['ats-tech'];
    let body = '';

    body += renderHeader(personal, '');

    const sectionRenderers = {
        summary:        () => renderSummary(summary),
        experience:     () => renderExperience(experience, true),
        projects:       () => renderProjects(state.data.projects),
        education:      () => renderEducation(education),
        skills:         () => renderSkills(skills, config.skillsFormat),
        certifications: () => renderCertifications(certifications)
    };

    config.sectionOrder.forEach(name => {
        if (sectionRenderers[name]) body += sectionRenderers[name]();
    });

    return body;
}

function handleDownloadPDF() {
    const fullName = (state.data.personal && state.data.personal.fullName)
        ? state.data.personal.fullName.trim() : '';

    if (!fullName) {
        showToast('Please enter your name before downloading', 'warning');
        return;
    }

    if (typeof html2pdf === 'undefined') {
        showToast('PDF library not loaded — using print dialog', 'info');
        window.print();
        return;
    }

    showToast('Preparing your PDF…', 'info');

    setTimeout(() => {
        try {
            const safeName = fullName.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '') || 'Resume';
            const filename = `${safeName}_Resume.pdf`;

            // A4 at 96dpi = 794px exactly
            const A4_PX = 794;
            const template = state.template;

            // ── 1. Build all resume CSS as a single hardcoded string ─────────
            // We do NOT use buildInlineCSS() / cssRules because cross-origin
            // Google Fonts sheets throw SecurityError. Instead we embed all the
            // resume-specific styles we need directly so nothing can go wrong.
            const resumeCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Merriweather:wght@400;700&display=swap');

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: ${A4_PX}px !important;
  background: #ffffff;
  margin: 0;
  padding: 0;
  overflow: hidden;   /* ← FIX: prevent scrollbar from adding offset */
}
/* ── Core resume container ── */
#pdf-resume {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 10.5pt;
  line-height: 1.4;
  color: #1a1a1a;
  background: #ffffff;
  width: ${A4_PX}px;
  padding: 20mm 16mm;
  box-sizing: border-box;
  box-shadow: none !important;
  transform: none !important;
}

/* ── Header ── */
.rb-resume-header {
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 2px solid #1a1a1a;
  text-align: center;
}
.rb-resume-name {
  font-size: 22pt;
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: 1.1;
  margin: 0 0 4px;
  color: #1a1a1a;
}
.rb-resume-title {
  font-size: 11pt;
  font-weight: 500;
  color: #444;
  margin: 0 0 8px;
  letter-spacing: 0.3px;
}
.rb-resume-contact {
  font-size: 8.5pt;
  color: #555;
  line-height: 1.6;
}

/* ── Sections ── */
.rb-resume-section { margin-bottom: 16px; }
.rb-resume-section-title {
  font-size: 10pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #1a1a1a;
  border-bottom: 1.5px solid #1a1a1a;
  padding-bottom: 3px;
  margin-bottom: 10px;
}

/* ── Entries ── */
.rb-resume-entry { margin-bottom: 12px; }
.rb-resume-entry:last-child { margin-bottom: 0; }
.rb-resume-entry-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 2px;
}
.rb-resume-entry-title {
  font-size: 10pt;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
}
.rb-resume-entry-subtitle {
  font-size: 9.5pt;
  font-weight: 500;
  color: #333;
  font-style: italic;
}
.rb-resume-entry-date {
  font-size: 8.5pt;
  color: #555;
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 500;
}
.rb-resume-entry-location {
  font-size: 8.5pt;
  color: #666;
  margin-bottom: 4px;
}
.rb-resume-entry-description {
  font-size: 9.5pt;
  color: #333;
  margin-top: 4px;
  line-height: 1.5;
}

/* ── Lists ── */
.rb-resume-list { margin: 4px 0 0 16px; padding: 0; }
.rb-resume-list li {
  font-size: 9.5pt;
  color: #333;
  margin-bottom: 3px;
  line-height: 1.45;
}

/* ── Summary ── */
.rb-resume-summary { font-size: 9.5pt; color: #333; line-height: 1.55; }

/* ── Skills ── */
.rb-resume-skills-list { display: flex; flex-wrap: wrap; gap: 5px; }
.rb-resume-skill {
  display: inline-block;
  padding: 2px 9px;
  border: 1px solid #999;
  border-radius: 3px;
  font-size: 8.5pt;
  color: #333;
  background: #f5f5f5;
}

/* ── Page breaks ── */
.rb-resume-entry,
.rb-resume-section { page-break-inside: avoid; break-inside: avoid; }
.rb-resume-section-title { page-break-after: avoid; break-after: avoid; }

/* ══════════════════════════════════════════════════════════════
   TEMPLATE OVERRIDES
══════════════════════════════════════════════════════════════ */

/* ── ats-tech ── */
[data-template="ats-tech"] .rb-resume-header { border-bottom: 3px solid #1e40af; text-align: left; }
[data-template="ats-tech"] .rb-resume-name { color: #1e3a8a; }
[data-template="ats-tech"] .rb-resume-title { color: #1e40af; font-weight: 600; }
[data-template="ats-tech"] .rb-resume-section-title { color: #1e40af; border-bottom-color: #1e40af; border-bottom-width: 2px; }
[data-template="ats-tech"] .rb-resume-entry-title { color: #1e3a8a; }
[data-template="ats-tech"] .rb-resume-skill { background: #eff6ff; border-color: #93c5fd; color: #1e40af; border-radius: 4px; font-weight: 500; }

/* ── ats-data-science ── */
[data-template="ats-data-science"] .rb-resume-header { border-bottom: 3px solid #7c3aed; text-align: left; padding-bottom: 12px; }
[data-template="ats-data-science"] .rb-resume-name { color: #4c1d95; }
[data-template="ats-data-science"] .rb-resume-title { color: #7c3aed; font-weight: 600; }
[data-template="ats-data-science"] .rb-resume-section-title { color: #7c3aed; border-bottom: none; background: #f5f3ff; padding: 3px 8px; border-left: 4px solid #7c3aed; border-radius: 0 3px 3px 0; }
[data-template="ats-data-science"] .rb-resume-entry-title { color: #4c1d95; }
[data-template="ats-data-science"] .rb-resume-skill { background: #f5f3ff; border-color: #c4b5fd; color: #6d28d9; border-radius: 12px; font-weight: 500; padding: 2px 10px; }

/* ── ats-devops ── */
[data-template="ats-devops"] .rb-resume-header { border-bottom: none; background: #0f172a; color: #e2e8f0; padding: 14px 16px; margin-bottom: 18px; border-radius: 4px; text-align: left; }
[data-template="ats-devops"] .rb-resume-name { color: #38bdf8; font-family: 'Courier New', monospace; letter-spacing: -0.5px; }
[data-template="ats-devops"] .rb-resume-title { color: #94a3b8; font-weight: 400; }
[data-template="ats-devops"] .rb-resume-contact { color: #64748b; }
[data-template="ats-devops"] .rb-resume-section-title { color: #0f766e; border-bottom: none; border-left: 4px solid #0d9488; padding-left: 8px; letter-spacing: 1.5px; }
[data-template="ats-devops"] .rb-resume-entry-title { color: #0f766e; }
[data-template="ats-devops"] .rb-resume-skill { background: #f0fdfa; border-color: #5eead4; color: #0f766e; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 8pt; }

/* ── ats-product ── */
[data-template="ats-product"] .rb-resume-header { border-bottom: 1px solid #cbd5e1; text-align: left; padding-bottom: 12px; }
[data-template="ats-product"] .rb-resume-name { color: #0f172a; font-size: 20pt; }
[data-template="ats-product"] .rb-resume-title { color: #475569; font-weight: 600; text-transform: uppercase; font-size: 9pt; letter-spacing: 1.5px; }
[data-template="ats-product"] .rb-resume-section-title { color: #334155; border-bottom: 2px solid #334155; font-size: 9pt; letter-spacing: 2px; }
[data-template="ats-product"] .rb-resume-entry-title { color: #0f172a; }
[data-template="ats-product"] .rb-resume-entry-subtitle { color: #475569; font-style: normal; font-weight: 600; }
[data-template="ats-product"] .rb-resume-skill { background: transparent; border: none; padding: 0; font-size: 9pt; color: #334155; }
[data-template="ats-product"] .rb-resume-skills-list { gap: 0; }
[data-template="ats-product"] .rb-resume-skill::after { content: " · "; color: #94a3b8; }
[data-template="ats-product"] .rb-resume-skill:last-child::after { content: ""; }

/* ── ats-uiux ── */
[data-template="ats-uiux"] .rb-resume-header { border-bottom: none; text-align: center; padding-bottom: 0; margin-bottom: 20px; }
[data-template="ats-uiux"] .rb-resume-header::after { content: ''; display: block; width: 60px; height: 3px; background: linear-gradient(90deg,#4f46e5,#818cf8); margin: 10px auto 0; border-radius: 2px; }
[data-template="ats-uiux"] .rb-resume-name { color: #312e81; font-size: 24pt; letter-spacing: -0.5px; }
[data-template="ats-uiux"] .rb-resume-title { color: #4f46e5; font-weight: 500; }
[data-template="ats-uiux"] .rb-resume-section-title { color: #4f46e5; border-bottom: none; padding-bottom: 4px; }
[data-template="ats-uiux"] .rb-resume-section-title::after { content: ''; display: block; height: 2px; background: linear-gradient(90deg,#4f46e5,transparent); margin-top: 3px; border-radius: 1px; }
[data-template="ats-uiux"] .rb-resume-entry-title { color: #312e81; }
[data-template="ats-uiux"] .rb-resume-skill { background: #eef2ff; border-color: #a5b4fc; color: #4338ca; border-radius: 20px; font-weight: 500; padding: 2px 10px; }

/* ── ats-business ── */
[data-template="ats-business"] .rb-resume-header { border-bottom: 3px double #1e3a5f; text-align: center; padding-bottom: 14px; }
[data-template="ats-business"] .rb-resume-name { color: #1e3a5f; font-family: 'Merriweather', Georgia, serif; font-size: 20pt; }
[data-template="ats-business"] .rb-resume-title { color: #2d5282; font-weight: 400; font-style: italic; }
[data-template="ats-business"] .rb-resume-section-title { color: #1e3a5f; border-bottom: 1px solid #1e3a5f; font-family: 'Merriweather', Georgia, serif; font-weight: 700; letter-spacing: 0.5px; text-transform: none; font-size: 10.5pt; }
[data-template="ats-business"] .rb-resume-entry-title { color: #1e3a5f; font-family: 'Merriweather', Georgia, serif; }
[data-template="ats-business"] .rb-resume-entry-subtitle { font-style: normal; color: #2d5282; font-weight: 600; }
[data-template="ats-business"] .rb-resume-skill { background: transparent; border: none; padding: 0; color: #1e3a5f; font-size: 9.5pt; }
[data-template="ats-business"] .rb-resume-skills-list { gap: 0; }
[data-template="ats-business"] .rb-resume-skill::after { content: " | "; color: #94a3b8; }
[data-template="ats-business"] .rb-resume-skill:last-child::after { content: ""; }

/* ── ats-healthcare ── */
[data-template="ats-healthcare"] .rb-resume-header { border-bottom: 2px solid #0d9488; text-align: left; padding-bottom: 12px; }
[data-template="ats-healthcare"] .rb-resume-name { color: #134e4a; }
[data-template="ats-healthcare"] .rb-resume-title { color: #0d9488; font-weight: 600; }
[data-template="ats-healthcare"] .rb-resume-section-title { color: #0f766e; border-bottom: none; background: #f0fdfa; padding: 4px 10px; border-radius: 3px; border-left: 4px solid #0d9488; }
[data-template="ats-healthcare"] .rb-resume-entry-title { color: #134e4a; }
[data-template="ats-healthcare"] .rb-resume-entry-subtitle { color: #0f766e; font-style: normal; font-weight: 600; }
[data-template="ats-healthcare"] .rb-resume-skill { background: #f0fdfa; border-color: #5eead4; color: #0f766e; border-radius: 4px; font-weight: 500; }

/* ── ats-engineering ── */
[data-template="ats-engineering"] .rb-resume-header { border-bottom: none; border-top: 4px solid #374151; border-bottom: 1px solid #9ca3af; text-align: left; padding: 10px 0; }
[data-template="ats-engineering"] .rb-resume-name { color: #111827; font-size: 20pt; letter-spacing: 0.5px; }
[data-template="ats-engineering"] .rb-resume-title { color: #374151; font-weight: 600; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 2px; }
[data-template="ats-engineering"] .rb-resume-section-title { color: #111827; border-bottom: 2px solid #374151; text-transform: uppercase; letter-spacing: 1.5px; font-size: 9pt; }
[data-template="ats-engineering"] .rb-resume-entry-title { color: #111827; }
[data-template="ats-engineering"] .rb-resume-entry-subtitle { color: #374151; font-style: normal; font-weight: 600; }
[data-template="ats-engineering"] .rb-resume-skill { background: #f9fafb; border-color: #6b7280; color: #374151; border-radius: 2px; font-size: 8pt; font-weight: 500; }

/* ── ats-marketing ── */
[data-template="ats-marketing"] .rb-resume-header { border-bottom: none; background: linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%); padding: 16px; margin-bottom: 18px; border-radius: 6px; border-left: 5px solid #ea580c; text-align: left; }
[data-template="ats-marketing"] .rb-resume-name { color: #9a3412; font-size: 21pt; }
[data-template="ats-marketing"] .rb-resume-title { color: #ea580c; font-weight: 600; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 1.5px; }
[data-template="ats-marketing"] .rb-resume-contact { color: #7c2d12; }
[data-template="ats-marketing"] .rb-resume-section-title { color: #ea580c; border-bottom: 2px solid #fed7aa; padding-bottom: 4px; letter-spacing: 1px; }
[data-template="ats-marketing"] .rb-resume-entry-title { color: #9a3412; }
[data-template="ats-marketing"] .rb-resume-entry-subtitle { color: #c2410c; font-style: normal; font-weight: 600; }
[data-template="ats-marketing"] .rb-resume-skill { background: #fff7ed; border-color: #fdba74; color: #c2410c; border-radius: 12px; font-weight: 500; padding: 2px 10px; }

/* ── ats-education ── */
[data-template="ats-education"] .rb-resume-header { border-bottom: 2px solid #d97706; text-align: center; padding-bottom: 12px; }
[data-template="ats-education"] .rb-resume-name { color: #78350f; font-family: 'Merriweather', Georgia, serif; font-size: 20pt; }
[data-template="ats-education"] .rb-resume-title { color: #b45309; font-weight: 500; font-style: italic; }
[data-template="ats-education"] .rb-resume-section-title { color: #92400e; border-bottom: none; background: #fffbeb; border-bottom: 2px solid #fcd34d; padding-bottom: 4px; font-family: 'Merriweather', Georgia, serif; font-size: 10pt; text-transform: none; letter-spacing: 0.3px; }
[data-template="ats-education"] .rb-resume-entry-title { color: #78350f; font-family: 'Merriweather', Georgia, serif; }
[data-template="ats-education"] .rb-resume-entry-subtitle { color: #92400e; font-style: normal; font-weight: 600; }
[data-template="ats-education"] .rb-resume-skill { background: #fffbeb; border-color: #fcd34d; color: #92400e; border-radius: 4px; font-weight: 500; }

/* ── ats-sales ── */
[data-template="ats-sales"] .rb-resume-header { border-bottom: 4px solid #dc2626; text-align: left; padding-bottom: 12px; }
[data-template="ats-sales"] .rb-resume-name { color: #7f1d1d; font-size: 22pt; font-weight: 800; }
[data-template="ats-sales"] .rb-resume-title { color: #dc2626; font-weight: 700; text-transform: uppercase; font-size: 9pt; letter-spacing: 1.5px; }
[data-template="ats-sales"] .rb-resume-section-title { color: #dc2626; border-bottom: 2px solid #dc2626; letter-spacing: 1.5px; }
[data-template="ats-sales"] .rb-resume-entry-title { color: #7f1d1d; font-weight: 700; }
[data-template="ats-sales"] .rb-resume-entry-subtitle { color: #b91c1c; font-style: normal; font-weight: 600; }
[data-template="ats-sales"] .rb-resume-skill { background: #fef2f2; border-color: #fca5a5; color: #b91c1c; border-radius: 4px; font-weight: 600; }

/* ── ats-hr ── */
[data-template="ats-hr"] .rb-resume-header { border-bottom: 2px solid #9333ea; text-align: left; padding-bottom: 12px; }
[data-template="ats-hr"] .rb-resume-name { color: #581c87; }
[data-template="ats-hr"] .rb-resume-title { color: #9333ea; font-weight: 500; }
[data-template="ats-hr"] .rb-resume-section-title { color: #7e22ce; border-bottom: none; background: #faf5ff; padding: 4px 10px; border-radius: 3px; border-left: 4px solid #9333ea; text-transform: uppercase; letter-spacing: 1px; font-size: 9pt; }
[data-template="ats-hr"] .rb-resume-entry-title { color: #581c87; }
[data-template="ats-hr"] .rb-resume-entry-subtitle { color: #7e22ce; font-style: normal; font-weight: 600; }
[data-template="ats-hr"] .rb-resume-skill { background: #faf5ff; border-color: #d8b4fe; color: #7e22ce; border-radius: 12px; font-weight: 500; padding: 2px 10px; }

/* ── ats-legal ── */
[data-template="ats-legal"] .rb-resume-header { border-bottom: 1px solid #374151; border-top: 3px solid #111827; text-align: center; padding: 12px 0; margin-bottom: 18px; }
[data-template="ats-legal"] .rb-resume-name { color: #111827; font-family: 'Merriweather', Georgia, serif; font-size: 20pt; font-weight: 700; letter-spacing: 0.5px; }
[data-template="ats-legal"] .rb-resume-title { color: #374151; font-weight: 400; font-style: italic; font-family: 'Merriweather', Georgia, serif; }
[data-template="ats-legal"] .rb-resume-section-title { color: #111827; border-bottom: 1px solid #374151; font-family: 'Merriweather', Georgia, serif; font-weight: 700; text-transform: none; font-size: 10.5pt; letter-spacing: 0.3px; }
[data-template="ats-legal"] .rb-resume-entry-title { color: #111827; font-family: 'Merriweather', Georgia, serif; }
[data-template="ats-legal"] .rb-resume-entry-subtitle { color: #374151; font-style: normal; font-weight: 600; }
[data-template="ats-legal"] .rb-resume-skill { background: transparent; border: none; padding: 0; color: #374151; font-size: 9.5pt; }
[data-template="ats-legal"] .rb-resume-skills-list { gap: 0; }
[data-template="ats-legal"] .rb-resume-skill::after { content: " · "; color: #9ca3af; }
[data-template="ats-legal"] .rb-resume-skill:last-child::after { content: ""; }
`;

            // ── 2. Generate resume HTML from current state ───────────────────
            const resumeBodyHTML = buildResumeHTML();

            // ── 3. Build the complete self-contained iframe document ─────────
            const iframeDoc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${resumeCSS}</style>
</head>
<body>
<div id="pdf-resume" class="resume" data-template="${template}">
${resumeBodyHTML}
</div>
</body>
</html>`;

            // ── 4. Create iframe — MUST be on-screen (opacity:0) ─────────────
            // CRITICAL: html2canvas measures element position relative to the
            // viewport. If the iframe is off-screen (left:-9999px), it reports
            // a negative x-offset and html2canvas clips the left side of the
            // content. We use opacity:0 + pointer-events:none to hide it while
            // keeping it at position 0,0 so coordinates are correct.
            const iframe = document.createElement('iframe');
            iframe.setAttribute('aria-hidden', 'true');
           iframe.style.cssText = [
                'position:fixed',
                'top:0',
                'left:0',
                `width:${A4_PX}px`,
                'height:100vh',
                'border:none',
                'opacity:0',              // invisible but on-screen
                'pointer-events:none',    // no interaction
                'z-index:99999',          // above everything so nothing overlaps
                'overflow:hidden'         // ← FIX: prevent phantom scrollbar offset
            ].join(';');

            document.body.appendChild(iframe);

            // ── 5. Write document into iframe ────────────────────────────────
            const iwin = iframe.contentWindow;
            const idoc = iframe.contentDocument || iwin.document;
            idoc.open();
            idoc.write(iframeDoc);
            idoc.close();

            // ── 6. Capture after layout is fully settled ─────────────────────
            const capture = () => {
                const resumeEl = idoc.getElementById('pdf-resume');
                if (!resumeEl) {
                    document.body.removeChild(iframe);
                    showToast('PDF generation failed — element not found', 'error');
                    return;
                }

                // Measure the true rendered height so jsPDF pages fit content
                const elHeight = resumeEl.scrollHeight || resumeEl.offsetHeight || 1122;

                const opt = {
                    margin:   [0, 0, 10, 0],
                    filename: filename,
                    image:    { type: 'jpeg', quality: 0.98 },
                   html2canvas: {
                        scale:           2,
                        useCORS:         true,
                        letterRendering: true,
                        logging:         false,
                        scrollX:         0,
                        scrollY:         0,
                        x:               0,   // ← FIX: anchor capture to element left
                        y:               0,   // ← FIX: anchor capture to element top
                        windowWidth:     A4_PX,
                        width:           A4_PX,
                        height:          elHeight,
                        backgroundColor: '#ffffff',
                        foreignObjectRendering: false
                    },
                    jsPDF: {
                        unit:        'mm',
                        format:      'a4',
                        orientation: 'portrait',
                        compress:    true
                    },
                    pagebreak: { mode: ['css', 'legacy'] }
                };

                html2pdf()
                    .set(opt)
                    .from(resumeEl)
                    .save()
                    .then(() => {
                        document.body.removeChild(iframe);
                        showToast('PDF downloaded successfully!', 'success');
                    })
                    .catch((err) => {
                        console.error('html2pdf error:', err);
                        document.body.removeChild(iframe);
                        showToast('PDF download failed — trying print dialog', 'error');
                        setTimeout(() => window.print(), 500);
                    });
            };

            // Two rAF cycles + extra settle time for fonts
            iwin.requestAnimationFrame(() => {
                iwin.requestAnimationFrame(() => {
                    setTimeout(capture, 250);
                });
            });

        } catch (err) {
            console.error('Download error:', err);
            showToast('Using print dialog as fallback', 'info');
            setTimeout(() => window.print(), 200);
        }
    }, 100);
}


function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        showAutosaveIndicator();
    } catch (error) {
        showToast('Failed to save changes', 'error');
    }
}

function showAutosaveIndicator() {
    const el = document.getElementById('autosave-indicator');
    if (!el) return;
    el.classList.add('show');
    clearTimeout(showAutosaveIndicator._tid);
    showAutosaveIndicator._tid = setTimeout(() => el.classList.remove('show'), 1500);
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (!parsed || parsed.version !== state.version) return;

        state.template = parsed.template || 'ats-tech';
        if (!parsed.data || typeof parsed.data !== 'object') return;

        const defPersonal = {
            fullName: '', jobTitle: '', email: '', phone: '', location: '',
            linkedin: '', github: '', portfolio: ''
        };
        state.data.personal = { ...defPersonal, ...(parsed.data.personal || {}) };
        state.data.summary = typeof parsed.data.summary === 'string' ? parsed.data.summary : '';
        state.data.experience = Array.isArray(parsed.data.experience) ? parsed.data.experience : [];
        state.data.projects = Array.isArray(parsed.data.projects) ? parsed.data.projects : [];
        state.data.education = Array.isArray(parsed.data.education) ? parsed.data.education : [];
        state.data.skills = Array.isArray(parsed.data.skills) ? parsed.data.skills : [];
        state.data.certifications = Array.isArray(parsed.data.certifications) ? parsed.data.certifications : [];

        ['experience', 'projects', 'education', 'certifications'].forEach(key => {
            state.data[key].forEach((item, i) => {
                if (!item || typeof item !== 'object') return;
                if (!item.id) item.id = `loaded-${key}-${i}-${Date.now()}`;
            });
        });
        state.data.skills.forEach((item, i) => {
            if (item && typeof item === 'object' && !item.id) item.id = `loaded-skill-${i}-${Date.now()}`;
        });

        populateForm();
    } catch (error) {
        console.error('Load state error:', error);
        localStorage.removeItem(STORAGE_KEY);
        showToast('Starting with fresh data', 'info');
    }
}

function populateForm() {
    if (!state.data || !state.data.personal) return;
    Object.keys(dom.personalInputs || {}).forEach(key => {
        const input = dom.personalInputs[key];
        if (input && state.data.personal.hasOwnProperty(key)) {
            input.value = state.data.personal[key] || '';
        }
    });

    if (dom.summaryInput) {
        dom.summaryInput.value = state.data.summary || '';
    }
    if (dom.templateSelect && state.template) {
        dom.templateSelect.value = state.template;
    }
    if (Array.isArray(state.data.experience)) {
        state.data.experience.forEach(exp => addExperience(exp));
    }
    if (Array.isArray(state.data.projects)) {
        state.data.projects.forEach(proj => addProject(proj));
    }
    if (Array.isArray(state.data.education)) {
        state.data.education.forEach(edu => addEducation(edu));
    }
    if (Array.isArray(state.data.skills)) {
        state.data.skills.forEach(skill => renderSkill(skill));
    }
    if (Array.isArray(state.data.certifications)) {
        state.data.certifications.forEach(cert => addCertification(cert));
    }
    updateEmptyStates();
    updateAllBadges();
    updateSummaryCharCount();
}

let toastDismissTimeout = null;

function showToast(message, type = 'info') {
    if (typeof message !== 'string' && message != null) message = String(message);
    const text = (message || '').trim() || 'Notification';
    const safeType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';

    if (activeToast) {
        dismissToast(activeToast);
        toastDismissTimeout = setTimeout(() => {
            toastDismissTimeout = null;
            createToast(text, safeType);
        }, 320);
    } else {
        createToast(text, safeType);
    }
}

function dismissToast(toast) {
    if (!toast || !toast.classList) return;
    if (toast.dismissTimeout) {
        clearTimeout(toast.dismissTimeout);
        toast.dismissTimeout = null;
    }
    if (toastDismissTimeout) {
        clearTimeout(toastDismissTimeout);
        toastDismissTimeout = null;
    }
    if (activeToast === toast) activeToast = null;
    toast.classList.add('rb-toast-exit');
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
        if (activeToast === toast) activeToast = null;
    }, 300);
}

function createToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconPaths = {
        success: 'assets/svg/success.svg',
        error: 'assets/svg/error.svg',
        warning: 'assets/svg/warning.svg',
        info: 'assets/svg/info.svg'
    };
    const iconSrc = iconPaths[type] || iconPaths.info;

    const toast = document.createElement('div');
    toast.className = `rb-toast rb-toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
        <img src="${iconSrc}" alt="" class="rb-toast-icon">
        <div class="rb-toast-content">
            <div class="rb-toast-message">${escapeHTML(message)}</div>
        </div>
        <button type="button" class="rb-toast-close" aria-label="Dismiss notification">
            <img src="assets/svg/close.svg" alt="" width="16" height="16" class="icon">
        </button>
    `;

    const closeBtn = toast.querySelector('.rb-toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dismissToast(toast);
        });
    }

    container.appendChild(toast);
    activeToast = toast;

    const duration = typeof TOAST_DURATION === 'number' && TOAST_DURATION > 0 ? TOAST_DURATION : 3000;
    toast.dismissTimeout = setTimeout(() => {
        toast.dismissTimeout = null;
        dismissToast(toast);
    }, duration);
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

function updateAllBadges() {
    const sections = ['personal', 'summary', 'experience', 'projects', 'education', 'skills', 'certifications'];
    sections.forEach(section => {
        const badge = document.getElementById(`badge-${section}`);
        if (!badge) return;

        let count = 0;
        if (!state.data) return;
        switch (section) {
            case 'personal':
                count = (state.data.personal && typeof state.data.personal === 'object')
                    ? Object.values(state.data.personal).filter(v => v != null && String(v).trim()).length
                    : 0;
                break;
            case 'summary':
                count = (state.data.summary && String(state.data.summary).trim()) ? 1 : 0;
                break;
            default:
                count = Array.isArray(state.data[section]) ? state.data[section].length : 0;
        }

        if (count > 0) {
            badge.textContent = count;
            badge.classList.add('show');
        } else {
            badge.textContent = '';
            badge.classList.remove('show');
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}