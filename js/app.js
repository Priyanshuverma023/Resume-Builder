'use strict';

const STORAGE_KEY = 'resumeBuilder_v1';
const TOAST_DURATION = 3000;

let activeToast = null;

const state = {
    version: 1,
    template: 'modern-professional',
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
        updateATSTips(state.template || 'modern-professional');
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
    if (clearAllBtn) clearAllBtn.addEventListener('click', handleClearAllData);

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

    if (dom.templateSelect) dom.templateSelect.addEventListener('change', handleTemplateChange);
    if (dom.downloadBtn) dom.downloadBtn.addEventListener('click', handleDownloadPDF);

    Object.values(dom.personalInputs).forEach(input => {
        if (input) input.addEventListener('input', debounce(handlePersonalInput, 300));
    });

    if (dom.summaryInput) dom.summaryInput.addEventListener('input', debounce(handleSummaryInput, 300));
    if (dom.addExperienceBtn) dom.addExperienceBtn.addEventListener('click', () => addExperience());
    if (dom.addProjectBtn) dom.addProjectBtn.addEventListener('click', () => addProject());
    if (dom.addEducationBtn) dom.addEducationBtn.addEventListener('click', () => addEducation());
    if (dom.addSkillBtn) dom.addSkillBtn.addEventListener('click', addSkill);
    if (dom.addCertificationBtn) dom.addCertificationBtn.addEventListener('click', () => addCertification());

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
        if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
        if (zoomInBtn) zoomInBtn.disabled = zoomLevel >= ZOOM_MAX;
        if (zoomOutBtn) zoomOutBtn.disabled = zoomLevel <= ZOOM_MIN;
        if (previewContent) previewContent.style.cursor = zoomLevel > 1.0 ? 'grab' : 'default';
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
            if (zoomLevel <= 1.0 && previewContent) { previewContent.scrollLeft = 0; previewContent.scrollTop = 0; }
        });
    }

    if (previewContent) {
        previewContent.addEventListener('wheel', (e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
            zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, parseFloat((zoomLevel + delta).toFixed(1))));
            applyZoom();
            if (zoomLevel <= 1.0) { previewContent.scrollLeft = 0; previewContent.scrollTop = 0; }
        }, { passive: false });
    }

    let isDragging = false, dragStartX = 0, dragStartY = 0, scrollStartX = 0, scrollStartY = 0;

    function onMouseDown(e) {
        if (e.button !== 0 || e.target.closest('button, input, select, a, textarea') || zoomLevel <= 1.0) return;
        isDragging = true;
        dragStartX = e.clientX; dragStartY = e.clientY;
        scrollStartX = previewContent ? previewContent.scrollLeft : 0;
        scrollStartY = previewContent ? previewContent.scrollTop : 0;
        if (previewContent) { previewContent.style.cursor = 'grabbing'; previewContent.classList.add('is-dragging'); }
        e.preventDefault();
    }
    function onMouseMove(e) {
        if (!isDragging || !previewContent) return;
        previewContent.scrollLeft = scrollStartX - (e.clientX - dragStartX);
        previewContent.scrollTop = scrollStartY - (e.clientY - dragStartY);
    }
    function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        if (previewContent) { previewContent.classList.remove('is-dragging'); previewContent.style.cursor = zoomLevel > 1.0 ? 'grab' : 'default'; }
    }

    if (previewContent) {
        previewContent.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mouseleave', onMouseUp);
    }

    let isTouchPanning = false, touchStartX = 0, touchStartY = 0, touchScrollX = 0, touchScrollY = 0;

    if (previewContent) {
        previewContent.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1 || zoomLevel <= 1.0) return;
            isTouchPanning = true;
            touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
            touchScrollX = previewContent.scrollLeft; touchScrollY = previewContent.scrollTop;
        }, { passive: true });
        previewContent.addEventListener('touchmove', (e) => {
            if (!isTouchPanning || e.touches.length !== 1) return;
            e.preventDefault();
            previewContent.scrollLeft = touchScrollX - (e.touches[0].clientX - touchStartX);
            previewContent.scrollTop = touchScrollY - (e.touches[0].clientY - touchStartY);
        }, { passive: false });
        previewContent.addEventListener('touchend', () => { isTouchPanning = false; }, { passive: true });
        previewContent.addEventListener('touchcancel', () => { isTouchPanning = false; }, { passive: true });
        previewContent.setAttribute('tabindex', '0');
        previewContent.addEventListener('keydown', (e) => {
            if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key) || zoomLevel <= 1.0) return;
            e.preventDefault();
            const step = e.shiftKey ? PAN_KEY_STEP * 3 : PAN_KEY_STEP;
            if (e.key === 'ArrowLeft') previewContent.scrollLeft -= step;
            if (e.key === 'ArrowRight') previewContent.scrollLeft += step;
            if (e.key === 'ArrowUp') previewContent.scrollTop -= step;
            if (e.key === 'ArrowDown') previewContent.scrollTop += step;
        });
        previewContent.addEventListener('dblclick', (e) => {
            if (e.target.closest('button, input, select, a, textarea')) return;
            zoomLevel = 1.0; applyZoom();
            previewContent.scrollLeft = 0; previewContent.scrollTop = 0;
        });
    }

    applyZoom();
}

function handleNavClick(e) {
    const sectionName = e.currentTarget.dataset.section;
    if (!sectionName) return;
    if (dom.navItems) dom.navItems.forEach(item => item.classList.remove('active'));
    e.currentTarget.classList.add('active');
    if (dom.sections) dom.sections.forEach(section => {
        section.classList.remove('active');
        if (section.dataset.section === sectionName) section.classList.add('active');
    });
}

function handleTemplateChange(e) {
    state.template = e.target.value || 'modern-professional';
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

function handleClearAllData() { openClearAllConfirm(); }

function performClearAllData() {
    closeClearAllConfirm();
    state.data = {
        personal: { fullName:'', jobTitle:'', email:'', phone:'', location:'', linkedin:'', github:'', portfolio:'' },
        summary: '', experience: [], projects: [], education: [], skills: [], certifications: []
    };
    state.template = 'modern-professional';
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
        emptyEl.style.display = listEl.querySelector(`.${itemClass}`) ? 'none' : 'flex';
    });
}

function updateSummaryCharCount() {
    const el = document.getElementById('summary-char-count');
    if (!el) return;
    const len = (state.data.summary || '').length;
    el.textContent = `${len} / 500`;
    el.classList.toggle('over-limit', len > 500);
}

// ============================================================
//  ATS TIPS — 6 ResumeATS templates
// ============================================================
function updateATSTips(template) {
    const tipsContent = document.getElementById('ats-tips-content');
    if (!tipsContent) return;

    const tips = {
        'modern-professional': `
            <ul>
                <li><strong>Keywords:</strong> Include industry-specific terms in your summary and experience sections</li>
                <li><strong>Metrics:</strong> Quantify achievements — "Increased revenue by 35%", "Managed team of 12", "Reduced costs by $50K"</li>
                <li><strong>Format:</strong> Results-driven summary, strong verb-led bullet points, blue section headings aid readability</li>
                <li><strong>Action verbs:</strong> Achieved, Managed, Developed, Implemented, Led, Delivered, Optimized</li>
            </ul>
        `,
        'simple-clean': `
            <ul>
                <li><strong>Keywords:</strong> Mirror exact language from job postings — ATS scores keyword matches</li>
                <li><strong>Metrics:</strong> Every bullet should ideally include a number: %, $, headcount, or time saved</li>
                <li><strong>Format:</strong> Ultra-clean Arial font and uppercase headings ensure maximum ATS parsing accuracy</li>
                <li><strong>Action verbs:</strong> Delivered, Achieved, Improved, Supervised, Developed, Contributed, Completed</li>
            </ul>
        `,
        'executive-professional': `
            <ul>
                <li><strong>Keywords:</strong> Strategic leadership, P&L management, board governance, M&A, organizational transformation, stakeholder relations</li>
                <li><strong>Metrics:</strong> "Drove $50M revenue growth", "Led 500+ person org", "Managed $200M P&L", "Reduced costs by 30%"</li>
                <li><strong>Format:</strong> Times New Roman lends gravitas; lead with executive summary, show scope of responsibility</li>
                <li><strong>Action verbs:</strong> Spearheaded, Orchestrated, Championed, Transformed, Directed, Negotiated, Established</li>
            </ul>
        `,
        'entry-level': `
            <ul>
                <li><strong>Keywords:</strong> Highlight coursework, projects, and internships that match the job description</li>
                <li><strong>Metrics:</strong> "GPA: 3.8", "Led team of 4", "Presented to 50+ stakeholders", "Completed in 2 weeks ahead of schedule"</li>
                <li><strong>Format:</strong> Education first, then experience; blue headings draw attention to your strongest sections</li>
                <li><strong>Action verbs:</strong> Assisted, Collaborated, Developed, Researched, Created, Contributed, Demonstrated</li>
            </ul>
        `,
        'technical-it': `
            <ul>
                <li><strong>Keywords:</strong> Programming languages (Python, JavaScript, Java), frameworks (React, Node.js), cloud (AWS, Azure, GCP), tools (Docker, Kubernetes, Git)</li>
                <li><strong>Metrics:</strong> "Improved performance by 40%", "Reduced load time by 2s", "System serves 1M+ users", "Deployed 99.9% uptime"</li>
                <li><strong>Format:</strong> Skills section appears first; categorized skill labels ensure clean ATS parsing</li>
                <li><strong>Action verbs:</strong> Developed, Implemented, Architected, Optimized, Deployed, Engineered, Automated</li>
            </ul>
        `,
        'creative-professional': `
            <ul>
                <li><strong>Keywords:</strong> Adobe Creative Suite, Figma, branding, typography, UI/UX, campaign management, content strategy</li>
                <li><strong>Metrics:</strong> "Delivered 50+ campaigns", "Increased engagement by 150%", "Designed for audience of 100K+"</li>
                <li><strong>Format:</strong> Portfolio link prominently in header; purple accent still ATS-safe as all text is standard</li>
                <li><strong>Action verbs:</strong> Designed, Created, Conceptualized, Produced, Collaborated, Directed, Delivered</li>
            </ul>
        `
    };

    tipsContent.innerHTML = tips[template] || tips['modern-professional'];
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
    const experience = data || { id, company:'', position:'', location:'', startDate:'', endDate:'', current:false, description:'' };
    if (!data) { state.data.experience.push(experience); saveState(); }

    const itemHTML = `
        <div class="rb-list-item" data-id="${experience.id}">
            <div class="rb-list-item-header">
                <h3 class="rb-section-title" style="font-size: var(--fs-12-18);">Experience Entry</h3>
                <div class="rb-list-item-actions">
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeExperience('${String(experience.id).replace(/'/g, "\\'")}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width:1rem;height:1rem;"> Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Company</label>
                        <input type="text" class="rb-input" data-field="company" value="${escapeHTML(experience.company||'')}" placeholder="Acme Corporation">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Position</label>
                        <input type="text" class="rb-input" data-field="position" value="${escapeHTML(experience.position||'')}" placeholder="Senior Developer">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Location</label>
                        <input type="text" class="rb-input" data-field="location" value="${escapeHTML(experience.location||'')}" placeholder="San Francisco, CA">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label rb-label-inline">
                            <input type="checkbox" data-field="current" ${experience.current ? 'checked' : ''}> Currently working here
                        </label>
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Start Date</label>
                        <input type="text" class="rb-input" data-field="startDate" value="${escapeHTML(experience.startDate||'')}" placeholder="January 2020">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">End Date</label>
                        <input type="text" class="rb-input" data-field="endDate" value="${escapeHTML(experience.endDate||'')}" placeholder="Present" ${experience.current ? 'disabled' : ''}>
                    </div>
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Description</label>
                    <textarea class="rb-textarea" data-field="description" rows="4" placeholder="Key achievements and responsibilities...">${escapeHTML(experience.description||'')}</textarea>
                </div>
            </div>
        </div>`;

    dom.experienceList.insertAdjacentHTML('beforeend', itemHTML);
    const item = dom.experienceList.querySelector(`[data-id="${experience.id}"]`);
    item.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', debounce((e) => {
            updateExperience(experience.id, e.target.dataset.field, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
        }, 300));
        if (input.dataset.field === 'current') {
            input.addEventListener('change', (e) => {
                const endDateInput = item.querySelector('[data-field="endDate"]');
                if (endDateInput) {
                    endDateInput.disabled = e.target.checked;
                    if (e.target.checked) { endDateInput.value = 'Present'; updateExperience(experience.id, 'endDate', 'Present'); }
                }
                updateExperience(experience.id, 'current', e.target.checked);
            });
        }
    });
    updateEmptyStates();
    updateAllBadges();
}

function updateExperience(id, field, value) {
    const exp = state.data.experience.find(e => e.id === id);
    if (exp) { exp[field] = value; saveState(); renderResume(); }
}

function removeExperience(id) {
    if (!id) return;
    state.data.experience = state.data.experience.filter(e => e.id !== id);
    if (dom.experienceList) { const item = dom.experienceList.querySelector(`[data-id="${id}"]`); if (item) item.remove(); }
    saveState(); renderResume(); updateEmptyStates(); updateAllBadges();
    showToast('Experience entry deleted', 'success');
}

function addEducation(data = null) {
    if (!dom.educationList) return;
    const id = (data && data.id) ? data.id : Date.now().toString();
    if (data && !data.id) data.id = id;
    const education = data || { id, institution:'', degree:'', field:'', location:'', graduationDate:'', gpa:'' };
    if (!data) { state.data.education.push(education); saveState(); }

    const itemHTML = `
        <div class="rb-list-item" data-id="${education.id}">
            <div class="rb-list-item-header">
                <h3 class="rb-section-title" style="font-size:var(--fs-12-18);">Education Entry</h3>
                <div class="rb-list-item-actions">
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeEducation('${String(education.id).replace(/'/g,"\\'")}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width:1rem;height:1rem;"> Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Institution</label>
                        <input type="text" class="rb-input" data-field="institution" value="${escapeHTML(education.institution||'')}" placeholder="University of California">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Degree</label>
                        <input type="text" class="rb-input" data-field="degree" value="${escapeHTML(education.degree||'')}" placeholder="Bachelor of Science">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Field of Study</label>
                        <input type="text" class="rb-input" data-field="field" value="${escapeHTML(education.field||'')}" placeholder="Computer Science">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Location</label>
                        <input type="text" class="rb-input" data-field="location" value="${escapeHTML(education.location||'')}" placeholder="Berkeley, CA">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Graduation Date</label>
                        <input type="text" class="rb-input" data-field="graduationDate" value="${escapeHTML(education.graduationDate||'')}" placeholder="May 2020">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">GPA (Optional)</label>
                        <input type="text" class="rb-input" data-field="gpa" value="${escapeHTML(education.gpa||'')}" placeholder="3.8/4.0">
                    </div>
                </div>
            </div>
        </div>`;

    dom.educationList.insertAdjacentHTML('beforeend', itemHTML);
    const item = dom.educationList.querySelector(`[data-id="${education.id}"]`);
    item.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', debounce((e) => updateEducation(education.id, e.target.dataset.field, e.target.value), 300));
    });
    updateEmptyStates(); updateAllBadges();
}

function updateEducation(id, field, value) {
    const edu = state.data.education.find(e => e.id === id);
    if (edu) { edu[field] = value; saveState(); renderResume(); }
}

function removeEducation(id) {
    if (!id) return;
    state.data.education = state.data.education.filter(e => e.id !== id);
    if (dom.educationList) { const item = dom.educationList.querySelector(`[data-id="${id}"]`); if (item) item.remove(); }
    saveState(); renderResume(); updateEmptyStates(); updateAllBadges();
    showToast('Education entry deleted', 'success');
}

function addProject(data = null) {
    if (!dom.projectsList) return;
    const id = (data && data.id) ? data.id : Date.now().toString();
    if (data && !data.id) data.id = id;
    const project = data || { id, name:'', description:'', techStack:'', link:'', highlights:'' };
    if (!data) { state.data.projects.push(project); saveState(); }

    const itemHTML = `
        <div class="rb-list-item" data-id="${project.id}">
            <div class="rb-list-item-header">
                <h3 class="rb-section-title" style="font-size:var(--fs-12-18);">Project Entry</h3>
                <div class="rb-list-item-actions">
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeProject('${String(project.id).replace(/'/g,"\\'")}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width:1rem;height:1rem;"> Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Project Name</label>
                        <input type="text" class="rb-input" data-field="name" value="${escapeHTML(project.name||'')}" placeholder="E-Commerce Platform">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Project Link (Optional)</label>
                        <input type="url" class="rb-input" data-field="link" value="${escapeHTML(project.link||'')}" placeholder="github.com/username/project">
                    </div>
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Tech Stack</label>
                    <input type="text" class="rb-input" data-field="techStack" value="${escapeHTML(project.techStack||'')}" placeholder="React, Node.js, MongoDB">
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Description</label>
                    <textarea class="rb-textarea" data-field="description" rows="3" placeholder="Brief description of the project...">${escapeHTML(project.description||'')}</textarea>
                </div>
                <div class="rb-form-group">
                    <label class="rb-label">Key Highlights (one per line)</label>
                    <textarea class="rb-textarea" data-field="highlights" rows="4" placeholder="Built responsive UI with role-based access&#10;Integrated third-party payment API&#10;Achieved 99.9% uptime">${escapeHTML(project.highlights||'')}</textarea>
                </div>
            </div>
        </div>`;

    dom.projectsList.insertAdjacentHTML('beforeend', itemHTML);
    const item = dom.projectsList.querySelector(`[data-id="${project.id}"]`);
    item.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', debounce((e) => updateProject(project.id, e.target.dataset.field, e.target.value), 300));
    });
    updateEmptyStates(); updateAllBadges();
}

function updateProject(id, field, value) {
    const proj = state.data.projects.find(p => p.id === id);
    if (proj) { proj[field] = value; saveState(); renderResume(); }
}

function removeProject(id) {
    if (!id) return;
    state.data.projects = state.data.projects.filter(p => p.id !== id);
    if (dom.projectsList) { const item = dom.projectsList.querySelector(`[data-id="${id}"]`); if (item) item.remove(); }
    saveState(); renderResume(); updateEmptyStates(); updateAllBadges();
    showToast('Project deleted', 'success');
}

function addSkill() {
    if (!dom.skillsList) return;
    const existingInput = dom.skillsList.querySelector('.rb-skill-input-card');
    if (existingInput) { existingInput.querySelector('input').focus(); return; }

    const inputCard = document.createElement('div');
    inputCard.className = 'rb-skill-input-card';
    inputCard.innerHTML = `
        <input type="text" class="rb-input rb-skill-input" placeholder="Enter skill name" autofocus>
        <div class="rb-skill-input-actions">
            <button class="rb-btn rb-btn-primary rb-btn-small" data-action="save">
                <img src="assets/svg/success.svg" alt="Save" class="rb-icon" style="width:1rem;height:1rem;"> Add
            </button>
            <button class="rb-btn rb-btn-secondary rb-btn-small" data-action="cancel">
                <img src="assets/svg/close.svg" alt="Cancel" class="rb-icon" style="width:1rem;height:1rem;"> Cancel
            </button>
        </div>`;

    dom.skillsList.insertBefore(inputCard, dom.skillsList.firstChild);
    const input = inputCard.querySelector('input');

    const saveSkill = () => {
        const skillName = input.value.trim();
        if (skillName) {
            const skill = { id: Date.now().toString(), name: skillName };
            state.data.skills.push(skill);
            inputCard.remove();
            renderSkill(skill);
            saveState(); renderResume(); updateEmptyStates(); updateAllBadges();
            showToast('Skill added successfully', 'success');
        } else { input.focus(); showToast('Please enter a skill name', 'warning'); }
    };
    const cancelAdd = () => { inputCard.remove(); updateEmptyStates(); };

    inputCard.querySelector('[data-action="save"]').addEventListener('click', saveSkill);
    inputCard.querySelector('[data-action="cancel"]').addEventListener('click', cancelAdd);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveSkill(); }
        else if (e.key === 'Escape') cancelAdd();
    });
    input.focus();
}

function renderSkill(skill) {
    if (!dom.skillsList || !skill || !skill.id) return;
    const safeId = String(skill.id).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    dom.skillsList.insertAdjacentHTML('beforeend', `
        <div class="rb-skill-tag" data-id="${escapeHTML(skill.id)}">
            <span>${escapeHTML(skill.name||'')}</span>
            <button onclick="removeSkill('${safeId}')" aria-label="Remove skill">
                <img src="assets/svg/close.svg" alt="Remove" class="rb-icon" style="width:1rem;height:1rem;">
            </button>
        </div>`);
}

function removeSkill(id) {
    if (!id) return;
    state.data.skills = state.data.skills.filter(s => s.id !== id);
    if (dom.skillsList) { const tag = dom.skillsList.querySelector(`[data-id="${id}"]`); if (tag) tag.remove(); }
    saveState(); renderResume(); updateEmptyStates(); updateAllBadges();
}

function addCertification(data = null) {
    if (!dom.certificationsList) return;
    const id = (data && data.id) ? data.id : Date.now().toString();
    if (data && !data.id) data.id = id;
    const certification = data || { id, name:'', issuer:'', date:'', credentialId:'' };
    if (!data) { state.data.certifications.push(certification); saveState(); }

    const itemHTML = `
        <div class="rb-list-item" data-id="${certification.id}">
            <div class="rb-list-item-header">
                <h3 class="rb-section-title" style="font-size:var(--fs-12-18);">Certification Entry</h3>
                <div class="rb-list-item-actions">
                    <button class="rb-btn rb-btn-danger rb-btn-small" onclick="removeCertification('${String(certification.id).replace(/'/g,"\\'")}')">
                        <img src="assets/svg/delete.svg" alt="Delete" class="rb-icon" style="width:1rem;height:1rem;"> Delete
                    </button>
                </div>
            </div>
            <div class="rb-form">
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Certification Name</label>
                        <input type="text" class="rb-input" data-field="name" value="${escapeHTML(certification.name||'')}" placeholder="AWS Certified Solutions Architect">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Issuing Organization</label>
                        <input type="text" class="rb-input" data-field="issuer" value="${escapeHTML(certification.issuer||'')}" placeholder="Amazon Web Services">
                    </div>
                </div>
                <div class="rb-form-row">
                    <div class="rb-form-group">
                        <label class="rb-label">Date Obtained</label>
                        <input type="text" class="rb-input" data-field="date" value="${escapeHTML(certification.date||'')}" placeholder="June 2023">
                    </div>
                    <div class="rb-form-group">
                        <label class="rb-label">Credential ID (Optional)</label>
                        <input type="text" class="rb-input" data-field="credentialId" value="${escapeHTML(certification.credentialId||'')}" placeholder="ABC123XYZ">
                    </div>
                </div>
            </div>
        </div>`;

    dom.certificationsList.insertAdjacentHTML('beforeend', itemHTML);
    const item = dom.certificationsList.querySelector(`[data-id="${certification.id}"]`);
    item.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', debounce((e) => updateCertification(certification.id, e.target.dataset.field, e.target.value), 300));
    });
    updateEmptyStates(); updateAllBadges();
}

function updateCertification(id, field, value) {
    const cert = state.data.certifications.find(c => c.id === id);
    if (cert) { cert[field] = value; saveState(); renderResume(); }
}

function removeCertification(id) {
    if (!id) return;
    state.data.certifications = state.data.certifications.filter(c => c.id !== id);
    if (dom.certificationsList) { const item = dom.certificationsList.querySelector(`[data-id="${id}"]`); if (item) item.remove(); }
    saveState(); renderResume(); updateEmptyStates(); updateAllBadges();
    showToast('Certification deleted', 'success');
}

// ============================================================
//  TEMPLATE CONFIGURATIONS — 6 ResumeATS Templates
// ============================================================
const TEMPLATE_CONFIG = {
    'modern-professional': {
        sectionOrder: ['summary','experience','projects','education','skills','certifications'],
        skillsFormat: 'bullet-inline',  // skills as inline bullet list (•)
        headerAlign: 'center'
    },
    'simple-clean': {
        sectionOrder: ['summary','experience','education','skills','certifications'],
        skillsFormat: 'category-inline', // bold category label + comma list
        headerAlign: 'left'
    },
    'executive-professional': {
        sectionOrder: ['summary','experience','education','skills','certifications'],
        skillsFormat: 'pipe-inline',    // skills separated by |
        headerAlign: 'center'
    },
    'entry-level': {
        sectionOrder: ['summary','education','experience','projects','skills','certifications'],
        skillsFormat: 'category-inline',
        headerAlign: 'left'
    },
    'technical-it': {
        sectionOrder: ['summary','skills','experience','projects','education','certifications'],
        skillsFormat: 'tech-category',  // fixed-width label: values
        headerAlign: 'left'
    },
    'creative-professional': {
        sectionOrder: ['summary','experience','projects','education','skills'],
        skillsFormat: 'grouped',
        headerAlign: 'left'
    }
};

// ============================================================
//  RENDER RESUME
// ============================================================
function renderResume() {
    try {
        const { personal, summary, experience, education, skills, certifications } = state.data;
        const template = state.template;
        const config = TEMPLATE_CONFIG[template] || TEMPLATE_CONFIG['modern-professional'];

        let html = renderHeader(personal, config.headerAlign);

        const sections = {
            summary:        () => renderSummary(summary, template),
            experience:     () => renderExperience(experience, template),
            projects:       () => renderProjects(state.data.projects, template),
            education:      () => renderEducation(education, template),
            skills:         () => renderSkills(skills, config.skillsFormat, template),
            certifications: () => renderCertifications(certifications, template)
        };

        config.sectionOrder.forEach(name => { if (sections[name]) html += sections[name](); });

        if (dom.resumeOutput) {
            dom.resumeOutput.dataset.template = template;
            dom.resumeOutput.innerHTML = html;
        }
    } catch (error) {
        console.error('Render error:', error);
        if (dom.resumeOutput) {
            dom.resumeOutput.innerHTML = `
                <div style="padding:20px;background:#fff3cd;border:2px solid #ffc107;border-radius:8px;">
                    <h3 style="color:#856404;margin-bottom:10px;">⚠️ Rendering Issue</h3>
                    <p style="color:#856404;">Error: ${error.message}</p>
                    <button onclick="localStorage.removeItem('resumeBuilder_v1');location.reload();"
                            style="padding:10px 20px;background:#ffc107;border:none;border-radius:4px;cursor:pointer;font-weight:bold;margin-top:10px;">
                        Clear Data & Refresh
                    </button>
                </div>`;
        }
    }
}

function renderHeader(personal, align) {
    let html = '<div class="rb-resume-header">';
    if (personal.fullName) html += `<h1 class="rb-resume-name">${escapeHTML(personal.fullName)}</h1>`;
    if (personal.jobTitle) html += `<div class="rb-resume-title">${escapeHTML(personal.jobTitle)}</div>`;

    const contactParts = [];
    if (personal.email) contactParts.push(escapeHTML(personal.email));
    if (personal.phone) contactParts.push(escapeHTML(personal.phone));
    if (personal.location) contactParts.push(escapeHTML(personal.location));
    if (personal.linkedin) contactParts.push(escapeHTML(personal.linkedin));
    if (personal.github) contactParts.push(escapeHTML(personal.github));
    if (personal.portfolio) contactParts.push(escapeHTML(personal.portfolio));
    if (contactParts.length) html += `<div class="rb-resume-contact">${contactParts.join(' | ')}</div>`;

    html += '</div>';
    return html;
}

function renderSummary(summary, template) {
    if (!summary) return '';
    // Executive uses italic class, Creative uses "Profile" label
    const label = template === 'executive-professional' ? 'Executive Summary'
                : template === 'creative-professional'  ? 'Profile'
                : template === 'entry-level'            ? 'Objective'
                : template === 'technical-it'           ? 'Technical Summary'
                : 'Professional Summary';
    return `
        <div class="rb-resume-section">
            <h2 class="rb-resume-section-title">${label}</h2>
            <div class="rb-resume-summary">${escapeHTML(summary)}</div>
        </div>`;
}

function renderExperience(experience, template) {
    if (!experience || experience.length === 0) return '';
    const label = template === 'creative-professional' ? 'Professional Experience'
                : template === 'simple-clean'          ? 'Work Experience'
                : 'Professional Experience';

    let html = `<div class="rb-resume-section"><h2 class="rb-resume-section-title">${label}</h2>`;
    experience.forEach(exp => {
        if (!exp.company && !exp.position) return;
        html += '<div class="rb-resume-entry">';
        html += '<div class="rb-resume-entry-header"><div>';
        if (exp.position) html += `<div class="rb-resume-entry-title">${escapeHTML(exp.position)}</div>`;
        if (exp.company)  html += `<div class="rb-resume-entry-subtitle">${escapeHTML(exp.company)}</div>`;
        html += '</div>';
        if (exp.startDate || exp.endDate) {
            html += `<div class="rb-resume-entry-date">${escapeHTML(exp.startDate)}${exp.startDate && exp.endDate ? ' – ' : ''}${escapeHTML(exp.endDate)}</div>`;
        }
        html += '</div>';
        if (exp.location) html += `<div class="rb-resume-entry-location">${escapeHTML(exp.location)}</div>`;
        if (exp.description) {
            const lines = escapeHTML(exp.description).split('\n').filter(l => l.trim());
            if (lines.length > 1) {
                html += '<ul class="rb-resume-list">' + lines.map(l => `<li>${l}</li>`).join('') + '</ul>';
            } else {
                html += `<div class="rb-resume-entry-description">${lines[0] || ''}</div>`;
            }
        }
        html += '</div>';
    });
    html += '</div>';
    return html;
}

function renderEducation(education, template) {
    if (!education || education.length === 0) return '';
    let html = '<div class="rb-resume-section"><h2 class="rb-resume-section-title">Education</h2>';
    education.forEach(edu => {
        if (!edu.institution && !edu.degree) return;
        html += '<div class="rb-resume-entry"><div class="rb-resume-entry-header"><div>';
        if (edu.degree) html += `<div class="rb-resume-entry-title">${escapeHTML(edu.degree)}${edu.field ? ' in ' + escapeHTML(edu.field) : ''}</div>`;
        if (edu.institution) html += `<div class="rb-resume-entry-subtitle">${escapeHTML(edu.institution)}</div>`;
        html += '</div>';
        if (edu.graduationDate) html += `<div class="rb-resume-entry-date">${escapeHTML(edu.graduationDate)}</div>`;
        html += '</div>';
        if (edu.location) html += `<div class="rb-resume-entry-location">${escapeHTML(edu.location)}</div>`;
        if (edu.gpa) html += `<div class="rb-resume-entry-description">GPA: ${escapeHTML(edu.gpa)}</div>`;
        html += '</div>';
    });
    html += '</div>';
    return html;
}

function renderProjects(projects, template) {
    if (!projects || projects.length === 0) return '';
    const label = template === 'entry-level' ? 'Projects' : 'Projects';
    let html = `<div class="rb-resume-section"><h2 class="rb-resume-section-title">${label}</h2>`;
    projects.forEach(proj => {
        if (!proj.name) return;
        html += '<div class="rb-resume-entry"><div class="rb-resume-entry-header"><div>';
        html += `<div class="rb-resume-entry-title">${escapeHTML(proj.name)}</div>`;
        if (proj.link) html += `<div class="rb-resume-entry-subtitle">${escapeHTML(proj.link)}</div>`;
        html += '</div></div>';
        if (proj.techStack) html += `<div class="rb-resume-entry-location"><strong>Tech Stack:</strong> ${escapeHTML(proj.techStack)}</div>`;
        if (proj.description) html += `<div class="rb-resume-entry-description">${escapeHTML(proj.description)}</div>`;
        if (proj.highlights) {
            const lines = escapeHTML(proj.highlights).split('\n').filter(l => l.trim());
            if (lines.length) html += '<ul class="rb-resume-list">' + lines.map(l => `<li>${l}</li>`).join('') + '</ul>';
        }
        html += '</div>';
    });
    html += '</div>';
    return html;
}

function renderSkills(skills, format, template) {
    if (!skills || skills.length === 0) return '';

    // Determine section label
    const label = template === 'technical-it'           ? 'Technical Skills'
                : template === 'creative-professional'  ? 'Skills & Tools'
                : 'Skills';

    let html = `<div class="rb-resume-section"><h2 class="rb-resume-section-title">${label}</h2>`;

    if (format === 'bullet-inline') {
        // Modern Professional: inline list with bullet separators
        html += '<ul class="rb-resume-skills-list">';
        skills.forEach(s => { html += `<li class="rb-resume-skill">${escapeHTML(s.name)}</li>`; });
        html += '</ul>';
    } else if (format === 'pipe-inline') {
        // Executive: pipe-separated inline text
        html += `<div class="rb-resume-summary">${skills.map(s => escapeHTML(s.name)).join(' | ')}</div>`;
    } else if (format === 'category-inline') {
        // Simple Clean / Entry Level: comma-separated list
        html += `<div class="rb-resume-summary">${skills.map(s => escapeHTML(s.name)).join(', ')}</div>`;
    } else if (format === 'tech-category') {
        // Technical IT: each skill on its own line with category label style
        html += '<div class="rb-resume-tech-skills">';
        skills.forEach(s => {
            html += `<div class="rb-resume-tech-row"><span class="rb-resume-tech-label">${escapeHTML(s.name)}</span></div>`;
        });
        html += '</div>';
    } else {
        // grouped (Creative): tag pills
        html += '<div class="rb-resume-skills-list">';
        skills.forEach(s => { html += `<span class="rb-resume-skill">${escapeHTML(s.name)}</span>`; });
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function renderCertifications(certifications, template) {
    if (!certifications || certifications.length === 0) return '';
    const label = template === 'entry-level' ? 'Certifications & Awards' : 'Certifications';
    let html = `<div class="rb-resume-section"><h2 class="rb-resume-section-title">${label}</h2>`;
    certifications.forEach(cert => {
        if (!cert.name && !cert.issuer) return;
        html += '<div class="rb-resume-entry"><div class="rb-resume-entry-header"><div>';
        if (cert.name)   html += `<div class="rb-resume-entry-title">${escapeHTML(cert.name)}</div>`;
        if (cert.issuer) html += `<div class="rb-resume-entry-subtitle">${escapeHTML(cert.issuer)}</div>`;
        html += '</div>';
        if (cert.date) html += `<div class="rb-resume-entry-date">${escapeHTML(cert.date)}</div>`;
        html += '</div>';
        if (cert.credentialId) html += `<div class="rb-resume-entry-description">Credential ID: ${escapeHTML(cert.credentialId)}</div>`;
        html += '</div>';
    });
    html += '</div>';
    return html;
}

// ============================================================
//  PDF DOWNLOAD
// ============================================================
function buildResumeHTML() {
    const config = TEMPLATE_CONFIG[state.template] || TEMPLATE_CONFIG['modern-professional'];
    let body = renderHeader(state.data.personal, config.headerAlign);
    const sections = {
        summary:        () => renderSummary(state.data.summary, state.template),
        experience:     () => renderExperience(state.data.experience, state.template),
        projects:       () => renderProjects(state.data.projects, state.template),
        education:      () => renderEducation(state.data.education, state.template),
        skills:         () => renderSkills(state.data.skills, config.skillsFormat, state.template),
        certifications: () => renderCertifications(state.data.certifications, state.template)
    };
    config.sectionOrder.forEach(name => { if (sections[name]) body += sections[name](); });
    return body;
}

function handleDownloadPDF() {
    const fullName = (state.data.personal && state.data.personal.fullName)
        ? state.data.personal.fullName.trim() : '';
    if (!fullName) { showToast('Please enter your name before downloading', 'warning'); return; }
    if (typeof html2pdf === 'undefined') { showToast('PDF library not loaded — using print dialog', 'info'); window.print(); return; }

    showToast('Preparing your PDF…', 'info');

    setTimeout(() => {
        try {
            const safeName = fullName.replace(/\s+/g,'_').replace(/[<>:"/\\|?*]/g,'') || 'Resume';
            const filename = `${safeName}_Resume.pdf`;
            const A4_PX = 794;
            const template = state.template;

            const resumeCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Merriweather:wght@400;700&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${A4_PX}px!important;background:#fff;margin:0;padding:0;overflow:hidden;}

/* ── Base resume ── */
#pdf-resume{
  width:${A4_PX}px;padding:20mm 16mm;box-sizing:border-box;
  background:#fff;box-shadow:none!important;transform:none!important;
}

/* ── Base classes ── */
.rb-resume-header{margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #333;}
.rb-resume-name{font-size:22pt;font-weight:700;line-height:1.1;margin:0 0 4px;color:#1a1a1a;}
.rb-resume-title{font-size:11pt;font-weight:500;color:#444;margin:0 0 8px;}
.rb-resume-contact{font-size:8.5pt;color:#555;line-height:1.6;}
.rb-resume-section{margin-bottom:16px;}
.rb-resume-section-title{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1a1a1a;border-bottom:1.5px solid #1a1a1a;padding-bottom:3px;margin-bottom:10px;}
.rb-resume-entry{margin-bottom:12px;}
.rb-resume-entry:last-child{margin-bottom:0;}
.rb-resume-entry-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:2px;}
.rb-resume-entry-title{font-size:10pt;font-weight:700;color:#1a1a1a;line-height:1.3;}
.rb-resume-entry-subtitle{font-size:9.5pt;font-weight:500;color:#333;font-style:italic;}
.rb-resume-entry-date{font-size:8.5pt;color:#555;white-space:nowrap;flex-shrink:0;font-weight:500;}
.rb-resume-entry-location{font-size:8.5pt;color:#666;margin-bottom:4px;}
.rb-resume-entry-description{font-size:9.5pt;color:#333;margin-top:4px;line-height:1.5;}
.rb-resume-list{margin:4px 0 0 16px;padding:0;}
.rb-resume-list li{font-size:9.5pt;color:#333;margin-bottom:3px;line-height:1.45;}
.rb-resume-summary{font-size:9.5pt;color:#333;line-height:1.55;}
.rb-resume-skills-list{display:flex;flex-wrap:wrap;gap:5px;}
.rb-resume-skill{display:inline-block;padding:2px 9px;border:1px solid #999;border-radius:3px;font-size:8.5pt;color:#333;background:#f5f5f5;}
.rb-resume-tech-skills{display:block;}
.rb-resume-tech-row{margin-bottom:5px;font-size:9.5pt;color:#333;}
.rb-resume-tech-label{font-size:9.5pt;}
.rb-resume-entry,.rb-resume-section{page-break-inside:avoid;break-inside:avoid;}
.rb-resume-section-title{page-break-after:avoid;break-after:avoid;}

/* ══ MODERN PROFESSIONAL ══ */
[data-template="modern-professional"] #pdf-resume,
[data-template="modern-professional"].resume{font-family:Calibri,Arial,sans-serif;color:#333;}
[data-template="modern-professional"] .rb-resume-header{border-bottom:2px solid #3498db;text-align:center;}
[data-template="modern-professional"] .rb-resume-name{font-size:24pt;color:#2c3e50;}
[data-template="modern-professional"] .rb-resume-title{color:#666;font-weight:400;}
[data-template="modern-professional"] .rb-resume-section-title{color:#2c3e50;border-bottom:2px solid #3498db;font-size:14pt;letter-spacing:0;text-transform:uppercase;}
[data-template="modern-professional"] .rb-resume-entry-title{font-size:12pt;color:#2c3e50;}
[data-template="modern-professional"] .rb-resume-entry-subtitle{font-weight:700;font-style:normal;color:#333;}
[data-template="modern-professional"] .rb-resume-entry-date{font-style:italic;color:#666;}
[data-template="modern-professional"] .rb-resume-skills-list{display:block;list-style:none;margin:0;padding:0;}
[data-template="modern-professional"] .rb-resume-skill{display:inline;background:none;border:none;padding:0;font-size:9.5pt;color:#333;border-radius:0;}
[data-template="modern-professional"] .rb-resume-skill::after{content:" 2022  ";}
[data-template="modern-professional"] .rb-resume-skill:last-child::after{content:"";}

/* ══ SIMPLE CLEAN ══ */
[data-template="simple-clean"] #pdf-resume,
[data-template="simple-clean"].resume{font-family:Arial,sans-serif;color:#000;}
[data-template="simple-clean"] .rb-resume-header{border-bottom:none;text-align:left;}
[data-template="simple-clean"] .rb-resume-name{font-size:22pt;font-weight:700;text-transform:uppercase;letter-spacing:1pt;color:#000;}
[data-template="simple-clean"] .rb-resume-title{display:none;}
[data-template="simple-clean"] .rb-resume-section-title{font-size:13pt;text-transform:uppercase;letter-spacing:0.5pt;color:#000;border-bottom:none;border:none;font-weight:700;}
[data-template="simple-clean"] .rb-resume-entry-title{font-size:11pt;font-weight:700;color:#000;}
[data-template="simple-clean"] .rb-resume-entry-subtitle{font-style:normal;font-weight:400;color:#000;}
[data-template="simple-clean"] .rb-resume-entry-date{color:#000;}
[data-template="simple-clean"] .rb-resume-summary{color:#000;font-size:11pt;}
[data-template="simple-clean"] .rb-resume-skills-list{display:block;}
[data-template="simple-clean"] .rb-resume-skill{display:inline;background:none;border:none;padding:0;font-size:11pt;color:#000;}

/* ══ EXECUTIVE PROFESSIONAL ══ */
[data-template="executive-professional"] #pdf-resume,
[data-template="executive-professional"].resume{font-family:'Times New Roman',Times,serif;color:#000;font-size:11pt;}
[data-template="executive-professional"] .rb-resume-header{border-bottom:1px solid #000;text-align:center;padding-bottom:10px;}
[data-template="executive-professional"] .rb-resume-name{font-family:'Times New Roman',Times,serif;font-size:26pt;font-weight:700;color:#000;letter-spacing:0;}
[data-template="executive-professional"] .rb-resume-title{font-family:'Times New Roman',Times,serif;font-size:11pt;font-style:italic;font-weight:400;color:#333;}
[data-template="executive-professional"] .rb-resume-contact{font-family:'Times New Roman',Times,serif;font-size:10pt;color:#000;}
[data-template="executive-professional"] .rb-resume-section-title{font-family:'Times New Roman',Times,serif;font-size:12pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#000;border-bottom:1px solid #000;padding-bottom:2pt;background:none;border-left:none;padding-left:0;}
[data-template="executive-professional"] .rb-resume-entry-title{font-family:'Times New Roman',Times,serif;font-size:11.5pt;font-weight:700;color:#000;}
[data-template="executive-professional"] .rb-resume-entry-subtitle{font-family:'Times New Roman',Times,serif;font-size:11pt;font-weight:700;font-style:normal;color:#000;}
[data-template="executive-professional"] .rb-resume-entry-date{font-family:'Times New Roman',Times,serif;font-style:italic;color:#333;font-weight:400;}
[data-template="executive-professional"] .rb-resume-summary{font-family:'Times New Roman',Times,serif;font-style:italic;color:#000;font-size:11pt;}
[data-template="executive-professional"] .rb-resume-list li{font-family:'Times New Roman',Times,serif;font-size:11pt;color:#000;}
[data-template="executive-professional"] .rb-resume-skills-list{display:block;}
[data-template="executive-professional"] .rb-resume-skill{display:inline;background:transparent;border:none;padding:0;font-family:'Times New Roman',Times,serif;font-size:11pt;color:#000;}
[data-template="executive-professional"] .rb-resume-skill+.rb-resume-skill::before{content:" | ";}

/* ══ ENTRY LEVEL ══ */
[data-template="entry-level"] #pdf-resume,
[data-template="entry-level"].resume{font-family:Calibri,Arial,sans-serif;color:#333;font-size:11pt;}
[data-template="entry-level"] .rb-resume-header{border-bottom:none;text-align:left;}
[data-template="entry-level"] .rb-resume-name{font-size:24pt;color:#1a5490;}
[data-template="entry-level"] .rb-resume-title{font-size:11pt;font-style:italic;color:#444;font-weight:400;}
[data-template="entry-level"] .rb-resume-section-title{font-size:13pt;color:#1a5490;border-bottom:2px solid #1a5490;font-weight:700;text-transform:uppercase;letter-spacing:0;padding-bottom:3pt;}
[data-template="entry-level"] .rb-resume-entry-title{font-size:11.5pt;font-weight:700;color:#333;}
[data-template="entry-level"] .rb-resume-entry-subtitle{font-style:italic;font-weight:400;color:#555;}
[data-template="entry-level"] .rb-resume-entry-date{font-style:italic;color:#555;}
[data-template="entry-level"] .rb-resume-skills-list{display:block;}
[data-template="entry-level"] .rb-resume-skill{display:inline;background:none;border:none;padding:0;font-size:11pt;color:#333;}

/* ══ TECHNICAL IT ══ */
[data-template="technical-it"] #pdf-resume,
[data-template="technical-it"].resume{font-family:Arial,Helvetica,sans-serif;color:#000;font-size:10.5pt;}
[data-template="technical-it"] .rb-resume-header{border-bottom:none;text-align:left;}
[data-template="technical-it"] .rb-resume-name{font-size:22pt;font-weight:700;color:#000;}
[data-template="technical-it"] .rb-resume-title{font-size:10.5pt;font-weight:400;color:#333;}
[data-template="technical-it"] .rb-resume-contact{font-size:10pt;color:#000;}
[data-template="technical-it"] .rb-resume-section-title{font-size:12pt;font-weight:700;color:#000;border-bottom:1px solid #000;text-transform:uppercase;letter-spacing:0;padding-bottom:2pt;}
[data-template="technical-it"] .rb-resume-entry-title{font-size:11pt;font-weight:700;color:#000;}
[data-template="technical-it"] .rb-resume-entry-subtitle{font-style:normal;font-weight:400;color:#000;}
[data-template="technical-it"] .rb-resume-entry-date{color:#000;}
[data-template="technical-it"] .rb-resume-list li{font-size:10pt;color:#000;}
[data-template="technical-it"] .rb-resume-summary{font-size:10.5pt;color:#000;}
[data-template="technical-it"] .rb-resume-tech-skills{display:block;}
[data-template="technical-it"] .rb-resume-tech-row{font-size:10pt;margin-bottom:6pt;color:#000;}
[data-template="technical-it"] .rb-resume-tech-label{display:inline;font-size:10pt;color:#000;font-weight:400;}

/* ══ CREATIVE PROFESSIONAL ══ */
[data-template="creative-professional"] #pdf-resume,
[data-template="creative-professional"].resume{font-family:Calibri,Arial,sans-serif;color:#2c2c2c;font-size:11pt;}
[data-template="creative-professional"] .rb-resume-header{border-bottom:none;text-align:left;padding-bottom:0;}
[data-template="creative-professional"] .rb-resume-name{font-size:28pt;font-weight:700;color:#6b46c1;letter-spacing:-0.5pt;}
[data-template="creative-professional"] .rb-resume-title{font-size:13pt;font-style:italic;color:#666;font-weight:400;}
[data-template="creative-professional"] .rb-resume-contact{font-size:10pt;color:#2c2c2c;}
[data-template="creative-professional"] .rb-resume-section-title{font-size:13pt;color:#6b46c1;border-bottom:none;text-transform:uppercase;letter-spacing:1pt;font-weight:700;padding-bottom:0;}
[data-template="creative-professional"] .rb-resume-entry-title{font-size:11.5pt;font-weight:700;color:#333;}
[data-template="creative-professional"] .rb-resume-entry-subtitle{font-size:10pt;font-style:italic;color:#666;font-weight:400;}
[data-template="creative-professional"] .rb-resume-entry-date{font-style:italic;color:#666;}
[data-template="creative-professional"] .rb-resume-skills-list{display:flex;flex-wrap:wrap;gap:5px;}
[data-template="creative-professional"] .rb-resume-skill{display:inline-block;background:none;border:none;padding:0;font-size:11pt;color:#2c2c2c;}
[data-template="creative-professional"] .rb-resume-skill+.rb-resume-skill::before{content:", ";}
`;

            const resumeBodyHTML = buildResumeHTML();
            const iframeDoc = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<style>${resumeCSS}</style>
</head><body>
<div id="pdf-resume" class="resume" data-template="${template}">${resumeBodyHTML}</div>
</body></html>`;

            const iframe = document.createElement('iframe');
            iframe.setAttribute('aria-hidden', 'true');
            iframe.style.cssText = `position:fixed;top:0;left:0;width:${A4_PX}px;height:100vh;border:none;opacity:0;pointer-events:none;z-index:99999;overflow:hidden;`;
            document.body.appendChild(iframe);

            const iwin = iframe.contentWindow;
            const idoc = iframe.contentDocument || iwin.document;
            idoc.open(); idoc.write(iframeDoc); idoc.close();

            const capture = () => {
                const resumeEl = idoc.getElementById('pdf-resume');
                if (!resumeEl) { document.body.removeChild(iframe); showToast('PDF generation failed', 'error'); return; }
                const elHeight = resumeEl.scrollHeight || resumeEl.offsetHeight || 1122;

              const opt = {
    margin: 0,   // IMPORTANT — remove extra margin
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff'
    },
    jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
    },
    pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['.rb-resume-entry', '.rb-resume-section']
    }
};


                html2pdf().set(opt).from(resumeEl).save()
                    .then(() => { document.body.removeChild(iframe); showToast('PDF downloaded successfully!', 'success'); })
                    .catch((err) => { console.error('html2pdf error:', err); document.body.removeChild(iframe); showToast('PDF download failed — trying print dialog', 'error'); setTimeout(() => window.print(), 500); });
            };

            iwin.requestAnimationFrame(() => iwin.requestAnimationFrame(() => setTimeout(capture, 250)));

        } catch (err) {
            console.error('Download error:', err);
            showToast('Using print dialog as fallback', 'info');
            setTimeout(() => window.print(), 200);
        }
    }, 100);
}

// ============================================================
//  PERSISTENCE
// ============================================================
function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); showAutosaveIndicator(); }
    catch (error) { showToast('Failed to save changes', 'error'); }
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

        state.template = parsed.template || 'modern-professional';
        if (!parsed.data || typeof parsed.data !== 'object') return;

        const defPersonal = { fullName:'', jobTitle:'', email:'', phone:'', location:'', linkedin:'', github:'', portfolio:'' };
        state.data.personal = { ...defPersonal, ...(parsed.data.personal || {}) };
        state.data.summary = typeof parsed.data.summary === 'string' ? parsed.data.summary : '';
        state.data.experience    = Array.isArray(parsed.data.experience)    ? parsed.data.experience    : [];
        state.data.projects      = Array.isArray(parsed.data.projects)      ? parsed.data.projects      : [];
        state.data.education     = Array.isArray(parsed.data.education)     ? parsed.data.education     : [];
        state.data.skills        = Array.isArray(parsed.data.skills)        ? parsed.data.skills        : [];
        state.data.certifications= Array.isArray(parsed.data.certifications)? parsed.data.certifications: [];

        ['experience','projects','education','certifications'].forEach(key => {
            state.data[key].forEach((item, i) => { if (item && !item.id) item.id = `loaded-${key}-${i}-${Date.now()}`; });
        });
        state.data.skills.forEach((item, i) => { if (item && !item.id) item.id = `loaded-skill-${i}-${Date.now()}`; });

        // Migrate old template names to new ones
        const templateMigration = {
            'ats-tech': 'technical-it', 'ats-data-science': 'technical-it', 'ats-devops': 'technical-it',
            'ats-product': 'modern-professional', 'ats-uiux': 'creative-professional',
            'ats-business': 'executive-professional', 'ats-healthcare': 'simple-clean',
            'ats-engineering': 'technical-it', 'ats-marketing': 'creative-professional',
            'ats-education': 'entry-level', 'ats-sales': 'modern-professional',
            'ats-hr': 'simple-clean', 'ats-legal': 'executive-professional'
        };
        if (templateMigration[state.template]) state.template = templateMigration[state.template];

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
        if (input && state.data.personal.hasOwnProperty(key)) input.value = state.data.personal[key] || '';
    });
    if (dom.summaryInput) dom.summaryInput.value = state.data.summary || '';
    if (dom.templateSelect && state.template) dom.templateSelect.value = state.template;
    if (Array.isArray(state.data.experience))     state.data.experience.forEach(exp  => addExperience(exp));
    if (Array.isArray(state.data.projects))        state.data.projects.forEach(proj   => addProject(proj));
    if (Array.isArray(state.data.education))       state.data.education.forEach(edu   => addEducation(edu));
    if (Array.isArray(state.data.skills))          state.data.skills.forEach(skill    => renderSkill(skill));
    if (Array.isArray(state.data.certifications))  state.data.certifications.forEach(cert => addCertification(cert));
    updateEmptyStates(); updateAllBadges(); updateSummaryCharCount();
}

// ============================================================
//  TOAST
// ============================================================
let toastDismissTimeout = null;

function showToast(message, type = 'info') {
    if (typeof message !== 'string' && message != null) message = String(message);
    const text = (message || '').trim() || 'Notification';
    const safeType = ['success','error','warning','info'].includes(type) ? type : 'info';
    if (activeToast) {
        dismissToast(activeToast);
        toastDismissTimeout = setTimeout(() => { toastDismissTimeout = null; createToast(text, safeType); }, 320);
    } else { createToast(text, safeType); }
}

function dismissToast(toast) {
    if (!toast || !toast.classList) return;
    if (toast.dismissTimeout) { clearTimeout(toast.dismissTimeout); toast.dismissTimeout = null; }
    if (toastDismissTimeout) { clearTimeout(toastDismissTimeout); toastDismissTimeout = null; }
    if (activeToast === toast) activeToast = null;
    toast.classList.add('rb-toast-exit');
    setTimeout(() => { if (toast.parentNode) toast.remove(); if (activeToast === toast) activeToast = null; }, 300);
}

function createToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success:'assets/svg/success.svg', error:'assets/svg/error.svg', warning:'assets/svg/warning.svg', info:'assets/svg/info.svg' };
    const toast = document.createElement('div');
    toast.className = `rb-toast rb-toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
        <img src="${icons[type]||icons.info}" alt="" class="rb-toast-icon">
        <div class="rb-toast-content"><div class="rb-toast-message">${escapeHTML(message)}</div></div>
        <button type="button" class="rb-toast-close" aria-label="Dismiss notification">
            <img src="assets/svg/close.svg" alt="" width="16" height="16" class="icon">
        </button>`;
    toast.querySelector('.rb-toast-close').addEventListener('click', (e) => { e.stopPropagation(); dismissToast(toast); });
    container.appendChild(toast);
    activeToast = toast;
    toast.dismissTimeout = setTimeout(() => { toast.dismissTimeout = null; dismissToast(toast); }, TOAST_DURATION);
}

// ============================================================
//  UTILITIES
// ============================================================
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => { clearTimeout(timeout); func(...args); }, wait);
    };
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function updateAllBadges() {
    ['personal','summary','experience','projects','education','skills','certifications'].forEach(section => {
        const badge = document.getElementById(`badge-${section}`);
        if (!badge || !state.data) return;
        let count = 0;
        switch (section) {
            case 'personal':
                count = (state.data.personal && typeof state.data.personal === 'object')
                    ? Object.values(state.data.personal).filter(v => v != null && String(v).trim()).length : 0;
                break;
            case 'summary': count = (state.data.summary && String(state.data.summary).trim()) ? 1 : 0; break;
            default: count = Array.isArray(state.data[section]) ? state.data[section].length : 0;
        }
        badge.textContent = count > 0 ? count : '';
        badge.classList.toggle('show', count > 0);
    });
}

// Expose to global scope for onclick handlers
window.removeExperience    = removeExperience;
window.removeProject       = removeProject;
window.removeEducation     = removeEducation;
window.removeSkill         = removeSkill;
window.removeCertification = removeCertification;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

