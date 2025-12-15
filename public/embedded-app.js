// WILLOW V50 Embedded App Controller
(function () {
    'use strict';

    const API_BASE = window.location.hostname === 'localhost'
        ? 'http://localhost:8888/.netlify/functions'
        : '/.netlify/functions';

    let currentPersonId = null;
    let currentAddress = null;
    let behavioralData = null;
    let smartDefaults = null;

    // UI Elements
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const mainContent = document.getElementById('main-content');
    const scoreValue = document.getElementById('behavior-score');
    const priorityBadge = document.getElementById('priority-badge');
    const scoreBreakdown = document.getElementById('score-breakdown');
    const triggersList = document.getElementById('triggers-list');
    const propertyInfo = document.getElementById('property-info');

    // Sliders
    const radiusSlider = document.getElementById('radius-slider');
    const daysSlider = document.getElementById('days-slider');
    const compsSlider = document.getElementById('comps-slider');
    const varianceSlider = document.getElementById('variance-slider');

    const radiusValue = document.getElementById('radius-value');
    const daysValue = document.getElementById('days-value');
    const compsValue = document.getElementById('comps-value');
    const varianceValue = document.getElementById('variance-value');

    // AMZ UI Elements
    const amzStatusBadge = document.getElementById('amz-status-badge');
    const amzEstValue = document.getElementById('amz-est-value');
    const amzRange = document.getElementById('amz-range');
    const amzWhyNow = document.getElementById('amz-why-now');
    const amzAction = document.getElementById('amz-action');
    const amzScript = document.getElementById('amz-script');

    // V1 Features UI
    const momentumCount = document.getElementById('momentum-count');
    const cmaGate = document.getElementById('cma-pricing-gate');

    // Audio UI
    const playBriefingBtn = document.getElementById('play-briefing-btn');
    const audioTranscript = document.getElementById('audio-transcript');
    const audioVisualizer = document.querySelector('.audio-visualizer');

    // Chat UI
    const chatToggle = document.getElementById('chat-toggle');
    const chatBody = document.getElementById('chat-body');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');

    // AMZ Buttons
    const amzLogNoteBtn = document.getElementById('amz-log-note-btn');
    const amzCmaBtn = document.getElementById('amz-cma-btn');
    const amzUpdateValBtn = document.getElementById('amz-update-val-btn');
    const copyScriptBtn = document.getElementById('copy-script-btn');

    // Buttons (Existing)
    const generateCMABtn = document.getElementById('generate-cma-btn');
    const openFullBtn = document.getElementById('open-full-btn');

    // DOCTRINE ENFORCEMENT: Client Scripts must NEVEER mention internal signals
    const AMZ_TRIGGERS_MAP = {
        'HIGH_FELLO_SCORE': {
            whyNow: 'High Fello Engagement Score', // Internal Only
            action: 'Call Now',
            script: '“I noticed your property is in a high-demand zone this week. We’re seeing a shift in buyer activity—wanted to share those insights.”' // Safe
        },
        'SUSTAINED_EMAIL_ENGAGEMENT': {
            whyNow: 'Sustained Email Interest',
            action: 'Personal Email',
            script: '“You’ve been receiving our market updates. I’m curating a specific report on [Neighborhood Name] trends—would that be valuable to you?”'
        },
        'MULTI_CMA_REQUEST': {
            whyNow: 'Multiple Valuation Requests',
            action: 'Call Now',
            script: '“I see you’re keeping a close eye on your home’s value. The automated models vary wildly—I’d like to manually adjust it for you.”'
        },
        'PROPERTY_COLLECTION_BEHAVIOR': {
            whyNow: 'Saving Multiple Similar Listings',
            action: 'Text Message',
            script: '“Noticing market activity in [Area]. Are you comparing these against your own value, or looking for an investment move?”'
        },
        'FORM_SUBMISSION': {
            whyNow: 'Direct Inquiry / Form Fill',
            action: 'Call Immediately',
            script: '“Received your request regarding [Topic]. I have the file open right now—do you have two minutes to review the details?”'
        },
        'DEFAULT': {
            whyNow: 'Periodic Review',
            action: 'Check In',
            script: '“Just reviewing my priority client list and wanted to ensure our valuation of your home is still accurate given this months market changes.”'
        }
    };

    // Initialize
    async function init() {
        try {
            // Get person ID from FUB URL
            currentPersonId = getPersonIdFromURL();

            if (!currentPersonId) {
                throw new Error('No person ID found in URL');
            }

            // Load behavioral scoring
            await loadBehavioralScore();

            // Load smart defaults if address available
            if (currentAddress) {
                await loadSmartDefaults();
            }

            // Setup event listeners
            // Setup event listeners
            setupEventListeners();
            setupAMZListeners();
            setupV1Listeners();

            // Initialize V1 State
            initMomentum();

            // Render Agent Moment Zero
            renderAgentMomentZero();

            // Show main content
            hideLoading();
            showMainContent();

        } catch (error) {
            console.error('Initialization error:', error);
            showError(error.message);
        }
    }

    function getPersonIdFromURL() {
        const url = window.location.href;
        const match = url.match(/people\/(\d+)/);
        return match ? match[1] : null;
    }

    async function loadBehavioralScore() {
        const response = await fetch(`${API_BASE}/behavioral-scoring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personId: currentPersonId })
        });

        if (!response.ok) {
            throw new Error(`Failed to load behavioral score: ${response.status}`);
        }

        behavioralData = await response.json();

        // Extract address from raw data if available
        if (behavioralData.rawData && behavioralData.rawData.address) {
            currentAddress = behavioralData.rawData.address;
        }

        renderBehavioralScore();
    }

    function renderBehavioralScore() {
        // Score display
        scoreValue.textContent = behavioralData.enhancedBehavioralScore;
        priorityBadge.textContent = behavioralData.priority;
        priorityBadge.className = `badge ${behavioralData.priority}`;

        // Breakdown
        const breakdown = behavioralData.breakdown;
        scoreBreakdown.innerHTML = `
            <div class="breakdown-item">
                <div class="breakdown-label">Fello</div>
                <div class="breakdown-value">${breakdown.fello}</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">CloudCMA</div>
                <div class="breakdown-value">${breakdown.cloudCMA}</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">WILLOW</div>
                <div class="breakdown-value">${breakdown.willow}</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">Sierra</div>
                <div class="breakdown-value">${breakdown.sierra}</div>
            </div>
        `;

        // Triggers
        if (behavioralData.activeTriggers && behavioralData.activeTriggers.length > 0) {
            triggersList.innerHTML = behavioralData.activeTriggers
                .map(trigger => `<span class="trigger-tag">${formatTrigger(trigger)}</span>`)
                .join('');
        } else {
            triggersList.innerHTML = '<p style="color: #6b7280; font-size: 13px;">No active triggers</p>';
        }
    }

    function formatTrigger(trigger) {
        return trigger
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
    }

    async function loadSmartDefaults() {
        if (!currentAddress) return;

        const response = await fetch(`${API_BASE}/cma-smart-defaults-embedded`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: currentAddress })
        });

        if (!response.ok) {
            console.warn('Failed to load smart defaults, using fallback');
            return;
        }

        smartDefaults = await response.json();

        // Apply defaults to sliders
        if (smartDefaults.defaults) {
            radiusSlider.value = smartDefaults.defaults.radius;
            radiusValue.textContent = smartDefaults.defaults.radius;

            daysSlider.value = smartDefaults.defaults.daysBack;
            daysValue.textContent = smartDefaults.defaults.daysBack;

            compsSlider.value = smartDefaults.defaults.maxComparables;
            compsValue.textContent = smartDefaults.defaults.maxComparables;

            varianceSlider.value = smartDefaults.defaults.priceVariance;
            varianceValue.textContent = smartDefaults.defaults.priceVariance;
        }

        // Render property intelligence
        if (smartDefaults.propertyIntelligence) {
            renderPropertyInfo();
        }
    }

    function renderPropertyInfo() {
        const prop = smartDefaults.propertyIntelligence;
        propertyInfo.innerHTML = `
            <div class="property-info-item">
                <div class="property-info-label">Lot Size</div>
                <div class="property-info-value">${prop.lotSize || 'N/A'} acres</div>
            </div>
            <div class="property-info-item">
                <div class="property-info-label">Year Built</div>
                <div class="property-info-value">${prop.yearBuilt || 'N/A'}</div>
            </div>
            <div class="property-info-item">
                <div class="property-info-label">Beds / Baths</div>
                <div class="property-info-value">${prop.beds || '?'} / ${prop.baths || '?'}</div>
            </div>
            <div class="property-info-item">
                <div class="property-info-label">Est. Value</div>
                <div class="property-info-value">$${formatNumber(prop.estimatedValue) || 'N/A'}</div>
            </div>
        `;
    }

    function formatNumber(num) {
        if (!num) return null;
        return new Intl.NumberFormat('en-US').format(num);
    }

    function setupEventListeners() {
        // Slider updates
        radiusSlider.addEventListener('input', (e) => {
            radiusValue.textContent = e.target.value;
        });

        daysSlider.addEventListener('input', (e) => {
            daysValue.textContent = e.target.value;
        });

        compsSlider.addEventListener('input', (e) => {
            compsValue.textContent = e.target.value;
        });

        varianceSlider.addEventListener('input', (e) => {
            varianceValue.textContent = e.target.value;
        });

        // Generate CMA button
        generateCMABtn.addEventListener('click', generateCMA);

        // Open Full Window button
        openFullBtn.addEventListener('click', openFullWindow);
    }

    async function generateCMA() {
        if (!currentAddress) {
            alert('No property address found. Please ensure the lead has an address.');
            return;
        }

        generateCMABtn.disabled = true;
        generateCMABtn.textContent = 'Generating...';

        try {
            const response = await fetch(`${API_BASE}/cloudcma-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personId: currentPersonId,
                    address: currentAddress,
                    radius: parseFloat(radiusSlider.value),
                    daysBack: parseInt(daysSlider.value),
                    maxComparables: parseInt(compsSlider.value),
                    priceVariance: parseInt(varianceSlider.value)
                })
            });

            if (!response.ok) {
                throw new Error(`CMA generation failed: ${response.status}`);
            }

            const result = await response.json();

            // Open CloudCMA editor in new tab
            if (result.cma && result.cma.editUrl) {
                window.open(result.cma.editUrl, '_blank');
            }

            // Sync FUB fields
            await syncFUBFields(result.cma.editUrl);

        } catch (error) {
            console.error('CMA generation error:', error);
            alert(`Failed to generate CMA: ${error.message}`);
        } finally {
            generateCMABtn.disabled = false;
            generateCMABtn.innerHTML = '<span class="btn-icon">📊</span> Generate CMA';
        }
    }

    async function syncFUBFields(cmaUrl) {
        try {
            await fetch(`${API_BASE}/fub-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personId: currentPersonId,
                    cmaUrl: cmaUrl,
                    cmaGeneratedDate: new Date().toISOString()
                })
            });
        } catch (error) {
            console.warn('FUB sync failed (non-critical):', error);
        }
    }

    function openFullWindow() {
        // Phase 2: Standalone dashboard
        alert('Full dashboard coming in Phase 2');
    }

    function hideLoading() {
        loadingState.classList.add('hidden');
    }

    function showMainContent() {
        mainContent.classList.remove('hidden');
    }

    function showError(message) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        errorState.querySelector('.error-message').textContent = message;
    }

    function renderAgentMomentZero() {
        // 1. Status & Priority
        const score = behavioralData.enhancedBehavioralScore || 0;
        amzStatusBadge.textContent = behavioralData.priority || 'COLD';
        amzStatusBadge.className = `badge ${behavioralData.priority || 'COLD'}`;

        // 2. Values (from Smart Defaults or existing props)
        if (smartDefaults && smartDefaults.propertyIntelligence) {
            const prop = smartDefaults.propertyIntelligence;
            amzEstValue.textContent = `$${formatNumber(prop.estimatedValue) || '--'}`;
            // Simple range logic if not provided
            const val = prop.estimatedValue;
            if (val) {
                const low = Math.round(val * 0.95);
                const high = Math.round(val * 1.05);
                amzRange.textContent = `$${formatNumber(low)} - $${formatNumber(high)}`;
            }
        }

        // 3. Trigger & Logic
        const triggers = behavioralData.activeTriggers || [];
        const primaryTriggerKey = triggers.length > 0 ? triggers[0] : 'DEFAULT';
        const logic = AMZ_TRIGGERS_MAP[primaryTriggerKey] || AMZ_TRIGGERS_MAP['DEFAULT'];

        amzWhyNow.textContent = logic.whyNow;
        amzAction.textContent = logic.action;
        amzScript.textContent = logic.script;
    }

    function setupAMZListeners() {
        amzLogNoteBtn.addEventListener('click', async () => {
            const note = prompt("Enter note content:", `Action taken: ${amzAction.textContent}`);
            if (note) {
                await logAction(note);
            }
        });

        amzCmaBtn.addEventListener('click', () => {
            // Trigger the existing CMA logic
            generateCMABtn.click();
            // Also log the intent
            logAction(`Initiated CMA Draft generation. Trigger: ${amzWhyNow.textContent}`);
        });

        amzUpdateValBtn.addEventListener('click', async () => {
            const newVal = prompt("Enter new Estimated Value:", amzEstValue.textContent.replace(/[^0-9]/g, ''));
            if (newVal) {
                // Update specific field sync logic here
                await logAction(`Updated Estimated Value to $${formatNumber(newVal)} (Manual Agent Override)`);
                amzEstValue.textContent = `$${formatNumber(newVal)}`;
            }
        });

        copyScriptBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(amzScript.textContent);
            const originalText = copyScriptBtn.textContent;
            copyScriptBtn.textContent = '✅';
        });
    }

    function setupV1Listeners() {
        // CMA Gate
        cmaGate.addEventListener('change', (e) => {
            generateCMABtn.disabled = !e.target.checked;
        });

        // Audio Player
        playBriefingBtn.addEventListener('click', handleAudioBriefing);

        // Chat Interface
        chatToggle.addEventListener('click', () => {
            const isHidden = chatBody.classList.contains('hidden');
            chatBody.classList.toggle('hidden');
            chatToggle.querySelector('.toggle-icon').textContent = isHidden ? '▼' : '▲';
        });

        chatSendBtn.addEventListener('click', handleChat);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChat();
        });
    }

    function initMomentum() {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('willow_momentum');
        let data = { date: today, count: 0 };

        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.date === today) {
                data = parsed;
            }
        }

        momentumCount.textContent = data.count;
    }

    function incrementMomentum() {
        let count = parseInt(momentumCount.textContent) || 0;
        count++;
        momentumCount.textContent = count;

        // Persist
        const data = { date: new Date().toDateString(), count: count };
        localStorage.setItem('willow_momentum', JSON.stringify(data));

        // Anim
        const chip = document.getElementById('momentum-chip');
        chip.classList.add('momentum-streak');
        setTimeout(() => chip.classList.remove('momentum-streak'), 2000);
    }

    // AUDIO LOGIC: Doctrine Enforced
    async function handleAudioBriefing() {
        if (playBriefingBtn.classList.contains('playing')) return;

        playBriefingBtn.classList.add('playing');
        playBriefingBtn.textContent = '⏸';
        audioVisualizer.classList.add('playing');

        // Simulate Generation Delay
        await new Promise(r => setTimeout(r, 800));

        // MOCK GENERATION - In real app, this comes from backend with strict prompt
        const trigger = (behavioralData && behavioralData.activeTriggers[0]) || 'DEFAULT';

        // Internal Context (What the agent needs to know)
        const internalContext = `Flagged due to ${AMZ_TRIGGERS_MAP[trigger].whyNow}.`;

        // Client Safe Script (What maps to the audio)
        const safeScript = AMZ_TRIGGERS_MAP[trigger].script;

        // Structure: [Intro] + [Market Reason] + [Question]
        const transcriptText = `(Briefing for ${currentPersonId})\n\n[Analyst]: ${internalContext} Market conditions favor a check-in.\n\n[Suggested Voice]: "${safeScript}"`;

        audioTranscript.textContent = transcriptText;
        audioTranscript.classList.remove('hidden');

        // Simulate play time then stop
        setTimeout(() => {
            playBriefingBtn.classList.remove('playing');
            playBriefingBtn.textContent = '▶';
            audioVisualizer.classList.remove('playing');
            incrementMomentum(); // Listening counts as prep action
            logAction('Listened to Audio Lead Review');
        }, 3000);
    }

    // CHAT LOGIC: Mock
    async function handleChat() {
        const text = chatInput.value.trim();
        if (!text) return;

        // User Message
        const userDiv = document.createElement('div');
        userDiv.className = 'message user';
        userDiv.textContent = text;
        chatMessages.appendChild(userDiv);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // AI Response Mock
        setTimeout(() => {
            const aiDiv = document.createElement('div');
            aiDiv.className = 'message ai';
            aiDiv.textContent = "I've logged that note for you. Pricing approval is required before the next CMA.";
            chatMessages.appendChild(aiDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Auto Log if it looks like a note
            incrementMomentum();
            logAction(`Chat Interaction: ${text}`);
        }, 1000);
    }

    async function logAction(noteBody) {
        if (!currentPersonId) {
            console.error('No Person ID for logging');
            return;
        }

        const originalText = amzLogNoteBtn.innerHTML;
        amzLogNoteBtn.innerHTML = 'Saving...';
        amzLogNoteBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/log-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personId: currentPersonId,
                    noteBody: noteBody
                })
            });

            if (!response.ok) throw new Error('Failed to log');

            // Visual success feedback
            amzLogNoteBtn.innerHTML = '✅ Saved';

            // V1: Momentum
            incrementMomentum();

            setTimeout(() => {
                amzLogNoteBtn.innerHTML = originalText;
                amzLogNoteBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Logging error:', error);
            alert('Failed to save note to FUB.');
            amzLogNoteBtn.innerHTML = originalText;
            amzLogNoteBtn.disabled = false;
        }
    }

    // Start initialization when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();