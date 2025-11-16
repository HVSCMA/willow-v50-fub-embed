// WILLOW V50 Embedded App Controller
(function() {
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

    // Buttons
    const generateCMABtn = document.getElementById('generate-cma-btn');
    const openFullBtn = document.getElementById('open-full-btn');

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
            setupEventListeners();

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

    // Start initialization when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();