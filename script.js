window.openPanelInNewTab = function(panelKeyword) {
    const baseUrl = window.location.origin + window.location.pathname;
    const newUrl = `${baseUrl}?search=${panelKeyword}&exact=true`;
    window.open(newUrl, '_blank');
};

// New global function to handle navigation and search for biomarkers
window.navigateToBiomarker = function(loincCode, biomarkerName) {
    // 1. Find the "Search Biomarkers Only" radio button and check it
    const biomarkerRadio = document.getElementById('searchModeBiomarkers');
    if (biomarkerRadio) {
        biomarkerRadio.checked = true;
    }

    // 2. Set the search input with the biomarker's name instead of the LOINC code
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = biomarkerName;
        window.searchTriggeredFromDropdown = true; 
    }

    // 3. Trigger the search using the LOINC code to ensure accuracy
    // We will simulate the search event with a slight delay
    // to give the browser time to update the input field and trigger the search logic correctly.
    setTimeout(() => {
        // Here, we can temporarily set the input value to the LOINC for the search logic
        const originalValue = searchInput.value;
        searchInput.value = loincCode;
        
        // Trigger the search
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
            searchButton.click();
        }
        
        // Restore the original name to the search input after the search has been initiated
        searchInput.value = originalValue;
    }, 100);
};

// Expand all associated panels within a biomarker container
// Function to expand the panels list within a biomarker container
window.expandAllPanels = function(container) {
    container.classList.add('panel-expanded');
};

// Function to collapse the panels list within a biomarker container
window.collapseAllPanels = function(container) {
    container.classList.remove('panel-expanded');
};
document.addEventListener('DOMContentLoaded', function() {
   const searchInput = document.getElementById('searchInput');
   const paragraphContainer = document.getElementById('paragraphContainer');
   const searchButton = document.getElementById('searchButton');

   let allContentData = [];
   let biomarkerUrlMap = new Map();
   let biomarkerColorMap = new Map();
   let calculationData = []; // Store calculation data
   let pureBiomarkerData = []; // Store pure biomarker data for biomarker type lookup
   let fusePanels;
   let fuseBiomarkers;
   let fuseWordSuggestions;
   let allSuggestionWords = []; // To store words for general suggestions
   let searchTriggeredFromDropdown = false; // Flag to prevent suggestion loops
   
   let searchTimeout;

   createHomepageButton();
   // Your Google Apps Script deployment URL (replace with your actual URL)
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzohnuS8ftTBdV5_1xYWCnuJrF6T3g8iZ3ZRkxvh7o53dA9NDJmO81K81BAPvMD8RQ/exec'; // Using Version 16 of Bioassay Getter (Attached)

   // Cache configuration
   const CACHE_KEY = 'labcorp_data_cache';
   const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
   // const CACHE_DURATION = 1000; // 1 sec for debugging


    // Modified addExpandableStyles function - ADD these new styles to your existing styles
    function addExpandableStyles() {
        const expandableStyles = `
            <style>

            /* Panel status messages */
                .panel-status-message {
                    position: absolute;
                    top: 16px;
                    right: 20px;
                    font-size: 20px;
                    font-weight: normal;
                }

                /* Colored panel containers */
                .panel-container.green {
                    background-color: #d7f5dc;
                    border-color: #28a745;
                }

                .panel-container.yellow {
                    background-color: #fff9d6;
                    border-color: #ffc107;
                }

                .panel-container.red {
                    background-color: #efefef;
                    border-color: #b7b7b7;
                }

                .panel-container.yellowgreen {
                    background-color: #eafccfff;
                    border-color: #adff2f;
                }

                .panel-status-wrapper {
                    position: absolute;
                    top: 18px;
                    right: 20px;
                    display: inline-block;
                    cursor: default;
                }

                .panel-status-icon {
                    font-size: 20px;
                    display: inline-block;
                }

                .panel-tooltip {
                    visibility: hidden;
                    opacity: 0;
                    background-color: #333;
                    color: #fff;
                    text-align: center;
                    border-radius: 6px;
                    padding: 6px 10px;
                    position: absolute;
                    z-index: 100;
                    top: 30px;
                    right: 0;
                    white-space: nowrap;
                    font-size: 12px;
                    transition: opacity 0.1s ease-in-out;
                }

                .panel-status-wrapper:hover .panel-tooltip {
                    visibility: visible;
                    opacity: 1;
                }

                .panel-container {
                    background-color: #d7f5dc;
                    border: 2px solid #28a745;
                    border-radius: 8px;
                    padding: 16px 20px; /* Corrected typo from '16 px' to '16px' */
                    margin: 0 auto 20px auto;
                    width: 620px; /* This is the initial/collapsed width */
                    position: relative;
                    overflow: hidden; /* Important for containing flex children and smooth transitions */
                    transition: width 0.3s ease, height 0.3s ease, max-width 0.3s ease, min-height 0.3s ease, border-color 0.3s, background-color 0.3s;
                    display: flex;
                    flex-direction: row;
                    align-items: flex-start;
                    min-height: auto; /* Allow content to dictate natural height when collapsed */
                    height: auto; /* Let content define height normally */
                    box-shadow: 0 3px 10px rgba(40, 167, 69, 0.2);
                }

                .panel-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 4px;
                    padding-right: 150px;
                }

                .panel-title {
                    color: #28a745;
                    font-size: 20px;
                    font-weight: bold;
                    margin: 0;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    max-width: 420px;
                    line-height: 1.2;
                }


                .panel-label {
                    background-color: #28a745;
                    color: white;
                    padding: 3px 10px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    margin-right: 8px;
                }

                
                .panel-content {
                    background-color: #fff;
                    padding: 12px 16px;
                    border-radius: 4px;
                    flex-shrink: 0; 
                    width: 570px; 
                    min-height: 200px; 
                    transition: min-height 0.1s ease;
                    position: relative;
                }

                .panel-container.panel-expanded .panel-content {
                    width: 400px;
                }

                .panel-content.adapt-height {
                    min-height: var(--biomarker-details-height, 200px); /* Custom property for dynamic height */
                    /* Ensure any specific static min-height is overridden by this */
                }
                
                .panel-container .panel-content:not(:has(.biomarker-details-container.has-active-biomarker)) {
                    min-height: auto; /* Ensure panel-content can shrink if no active biomarker details */
                }


                
                .expand-all-button {
                    background-color: #28a745;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-top: 10px;
                    transition: background-color 0.3s;
                }
                
                .expand-all-button:hover {
                    background-color: #218838;
                }
                
                .collapse-all-button {
                    background-color: #2874e8ff;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-top: 10px;
                    margin-left: 10px;
                    transition: background-color 0.3s;
                }
                
                .collapse-all-button:hover {
                    background-color: #0f3884ff;
                }
                
                .biomarker-details-container {
                    margin-top: 15px;
                    padding-left: 20px;
                    display: flex;
                    flex-direction: column; 
                    flex-grow: 1; 
                    max-width: 0; 
                    overflow: hidden;
                    opacity: 0; 
                    transition: max-width 0.3s ease-out, opacity 0.3s ease-out, max-height 0.3s ease-out;
                    max-height: 0; 
                    overflow-y: hidden;
                    padding-bottom: 0; 
                    padding-top: 0; 
                    box-sizing: border-box;
                }
                
                .biomarker-detail-expanded {
                    border: 2px solid #007bff;
                    background-color: #ffffffff;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 15px;
                    display: none;   /* remain non-rendered until JS sets display */
                    opacity: 0;      /* start invisible */
                    transition: opacity 220ms ease; /* fade in/out duration */
                    will-change: opacity;
                }

                /* Visible state: display is set from JS, class triggers opacity change */
                .biomarker-detail-expanded.visible {
                    display: block;
                    opacity: 1;
                }


                .biomarker-detail-expanded.invalid-biomarker {
                    display: none; /* Hidden by default */
                    border: 2px solid #000000;
                    background-color: #ffffffff;
                    animation: slideDown 0.3s ease-out;
                }
                
                .biomarker-detail-expanded.invalid-biomarker.show {
                    display: block; /* Show when .show class is added */
                }

                .biomarker-detail-expanded.active {
                    border-left: 4px solid #007bff; /* Or whatever color you want for active */
                    background-color: #f0f8ff; /* Active background */
                }
                
                .biomarker-detail-expanded.invalid-biomarker.active {
                    border-left: 4px solid #000000;
                    background-color: #f5f5f5;
                }

                .biomarker-detail-expanded.gray-biomarker {
                    border: 2px solid #999999;
                    background-color: #f9f9f9;
                }
                
                .biomarker-detail-expanded.gray-biomarker.show {
                    display: block;
                }

                .biomarker-detail-expanded.gray-biomarker.active {
                    border-left: 4px solid #999999;
                    background-color: #f0f0f0;
                }

                .panel-container .panel-content:not(.matching-height) { /* Use a class added by JS */
                    min-height: auto; 
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        max-height: 0;
                        padding-top: 0;
                        padding-bottom: 0;
                    }
                    to {
                        opacity: 1;
                        max-height: 500px;
                        padding-top: 12px;
                        padding-bottom: 12px;
                    }
                }
                
                .biomarker-detail-expanded h4 {
                    margin: 0 0 10px 0;
                    color: #333;
                    font-size: 16px;
                }
                
                .detail-item {
                    margin: 5px 0;
                    display: flex;
                    align-items: flex-start;
                }
                
                .detail-label {
                    font-weight: bold;
                    color: #555;
                    min-width: 120px;
                    margin-right: 10px;
                }
                
                .detail-value {
                    flex: 1;
                }
                
                .detail-separator {
                    border-top: 1px solid #ddd;
                    margin: 10px 0;
                    width: 100%;
                }
                
                .detail-link {
                    color: #007bff;
                    text-decoration: none;
                }
                
                .detail-link:hover {
                    text-decoration: underline;
                }
                
                /* Associated biomarkers styling */
                .associated-biomarkers-list {
                    margin: 0;
                    padding-left: 20px;
                    list-style-type: disc;
                }
                
                .associated-biomarkers-list li {
                    margin-bottom: 5px;
                    line-height: 1.4;
                }
                
                .associated-biomarker-name {
                    font-weight: bold;
                    color: #333;
                }
                
                .biomarker-loinc,
                .associated-biomarker-loinc,
                .loinc-code {
                    font-size: 0.8em;
                    color: #666;
                    vertical-align: baseline;
                }
                                
                .biomarker-clickable {
                    color: #28a745;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                
                .biomarker-clickable:hover {
                    color: #218838;
                }
                
                .associated-biomarker-clickable {
                    color: #007bff;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                
                .associated-biomarker-clickable:hover {
                    color: #0056b3;
                }
                
                .biomarker-clickable.expanded {
                    color: #28a745;
                    font-weight: bold;
                }
                
                /* NEW STYLES FOR INVALID BIOMARKERS */
                .biomarker-clickable.invalid-biomarker {
                    color: #514f4fff;
                }
                
                .biomarker-clickable.invalid-biomarker:hover {
                    color: #333333;
                }
                
                .biomarker-clickable.invalid-biomarker.expanded {
                    color: #000000;
                    font-weight: bold;
                }

                /* Eye icon shown when a biomarker is expanded */
                .biomarker-eye {
                    width: 20px;
                    height: 20px;
                    vertical-align: text-bottom;
                    margin-left: 6px;
                    pointer-events: none; /* clicks pass through */
                }

                .panel-toggle-header {
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    font-size: 16px;
                    font-weight: bold;
                    color: #28a745;
                    user-select: none;
                    gap: 6px;
                    margin-bottom: 8px;
                }

                .panel-toggle-header:hover .panel-toggle-text {
                    text-decoration: underline;
                }

                .panel-toggle-arrow {
                    font-size: 14px;
                }


                /* Duplicate .panel-container definition removed to prevent conflicts */

                .panel-container.panel-expanded {
                    width: 1200px; 
                    min-height: auto; 
                    height: auto; 
                }

                .panel-container.panel-expanded .biomarker-details-container {
                    max-width: 745px; /* The width the right section takes when expanded */
                    opacity: 1; /* Make it fully visible */
                    max-height: 1000px; 

                    overflow-y: auto; 
                    padding-bottom: 12px; 
                    padding-top: 12px; 
                }

                .panel-wrapper {
                    display: flex;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .biomarker-details-container {
                    max-width: 100%;
                    transition: all 0.3s ease;
                }

                               
                .associated-panel-container {
                    margin-bottom: 10px;
                    list-style: none;
                }

                .associated-panel-content {
                    border: 2px solid #28a745;
                    border-radius: 8px;
                    padding: 12px;
                    background-color: #fff;
                }

                .associated-panel-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 6px;
                }

                .associated-panel-label {
                    background-color: #28a745;
                    color: white;
                    padding: 3px 10px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                }
                /* Make the BIOMARKER pill blue in biomarker containers */
                .panel-label.biomarker-label-panel {
                    background-color: #1877f2;   /* blue */
                }


                .associated-panel-title {
                    font-weight: bold;
                    font-size: 17px;
                    color: #333;
                }

                .associated-panel-meta {
                    font-size: 14px;
                    color: #555;
                    margin: 0;
                }

                .panel-container .panel-content h3 {
                    margin: 0;
                    margin-top: 0;
                    font-size: 20px;
                    font-weight: bold;
                    color: #000;
                    display: block; 
                }

                .open-new-tab-icon {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    margin-left: auto;
                    margin-top: 2px;
                    filter: brightness(0) saturate(100%) invert(30%) sepia(95%) saturate(1732%) hue-rotate(82deg) brightness(95%) contrast(97%);
                    transition: transform 0.2s;
                }

                .open-new-tab-icon:hover {
                    transform: scale(1.2);
                }

                .status-icon {
                    font-weight: bold;
                    font-size: 18px;
                }

                .status-icon.green {
                    color: #28a745;
                }

                .status-icon.yellow {
                    color: #ffc107;
                }

                .status-icon.red {
                    color: #dc3545;
                }

                .status-icon-img {
                    width: 20px;
                    height: 20px;
                    display: inline-block;
                }

                /* Inline status for biomarker panels */
                .biomarker-panel-status {
                    display: inline-block;
                    margin-left: 6px;
                    position: relative;
                    cursor: default;
                    vertical-align: text-bottom;
                }

                .biomarker-panel-status .status-icon-img {
                    width: 16px;
                    height: 16px;
                    vertical-align: text-bottom;
                }

                .biomarker-panel-status:hover .panel-tooltip {
                    visibility: visible;
                    opacity: 1;
                }

                /* Homepage styles */
                .homepage-container {
                    display: none;
                    text-align: center;
                    padding: 10px 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                }

                .homepage-title {
                    font-size: 24px; /* Smaller than main title */
                    font-weight: bold;
                    color: #000000;
                    margin-bottom: 15px;
                    margin-top: -10px; /* Move closer to search bar */
                    text-shadow: none;
                    font-family: "Times New Roman", Times, serif;
                }

                .homepage-images-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    max-width: 800px;
                    margin: 0 auto;
                }

                .homepage-image-container {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    border: 2px solid #000000;
                }

                .homepage-image-container:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    border-color: #000000;
                }

                .homepage-image {
                    width: 100%;
                    height: auto;
                    max-width: 350px;
                    border-radius: 8px;
                    transition: opacity 0.3s ease;
                }

                .homepage-image:hover {
                    opacity: 0.9;
                }

                /* Homepage button styles */
                .homepage-button {
                    position: fixed;
                    left: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 60px;
                    height: 60px;
                    background: white;
                    border: 2px solid #000000;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .homepage-button:hover {
                    transform: translateY(-50%) scale(1.1);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
                }

                .homepage-button img {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                }

                /* Highlight for matched search text */
                mark.search-highlight {
                    background: #ffec86;       /* soft yellow */
                    border-radius: 3px;
                    color: inherit;  
                    font-weight: inherit; 
                    pointer-events: none;
                }

                @media (max-width: 768px) {
                    .homepage-images-grid {
                        grid-template-columns: 1fr;
                        gap: 20px;
                    }
                    
                    .homepage-title {
                        font-size: 20px; /* Smaller than main title on mobile */
                        margin-bottom: 12px;
                        margin-top: -10px; /* Move closer to search bar on mobile */
                    }
                    
                    .homepage-container {
                        padding: 10px 15px;
                    }

                    .homepage-button {
                        width: 50px;
                        height: 50px;
                        left: 15px;
                    }

                    .homepage-button img {
                        width: 42px;
                        height: 42px;
                    }

                }

            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', expandableStyles);
    }

        // Helper functions for keys
    // Helper functions for keys
    function makeBiomarkerKey(name, loinc) {
        return (loinc || '').trim().toLowerCase();
    }

    function extractLoincFromUrl(url) {
        if (!url) return '';
        const m = url.trim().match(/loinc\.org\/([0-9\-]+)/i);
        return m ? m[1] : '';
    }


    function clearSearchHighlights(root = paragraphContainer) {
        root.querySelectorAll('mark.search-highlight').forEach(m => {
            const parent = m.parentNode;
            parent.replaceChild(document.createTextNode(m.textContent), m);
            parent.normalize(); // merge adjacent text nodes
        });
        }

        // Safely highlight text in element's text nodes only (doesn't touch tags)
        function highlightMatchesInElement(el, query) {
        if (!query) return;

        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const textNodes = [];
        while (walk.nextNode()) textNodes.push(walk.currentNode);

        textNodes.forEach(node => {
            const { textContent } = node;
            if (!textContent) return;
            const frag = document.createDocumentFragment();
            let lastIdx = 0;
            textContent.replace(regex, (match, idx) => {
            if (idx > lastIdx) frag.appendChild(document.createTextNode(textContent.slice(lastIdx, idx)));
            const mark = document.createElement('mark');
            mark.className = 'search-highlight';
            mark.textContent = match;
            frag.appendChild(mark);
            lastIdx = idx + match.length;
            return match;
            });
            if (lastIdx === 0) return; // no match in this node
            if (lastIdx < textContent.length) {
            frag.appendChild(document.createTextNode(textContent.slice(lastIdx)));
            }
            node.parentNode.replaceChild(frag, node);
        });
        }


        // Apply to current UI
        function applySearchHighlights(query) {
        if (!query) return;

        // panel titles (e.g., "PANEL  Metabolic Panel…")
        paragraphContainer.querySelectorAll('.panel-container .panel-content h3')
            .forEach(h3 => highlightMatchesInElement(h3, query));

        // biomarker chips/names that are rendered
        paragraphContainer.querySelectorAll(
            '.biomarker-clickable, .biomarker-item-in-panel, .associated-biomarker-clickable, .result-title'
        ).forEach(el => highlightMatchesInElement(el, query));
    }

    // Helper function to check if biomarker is valid
    function isValidBiomarker(biomarkerName, loincCode, rowIndex, biomarkerColumnIndex) {
        // Check if we have the necessary parameters for color validation
        if (typeof rowIndex === 'undefined' || typeof biomarkerColumnIndex === 'undefined') {
            console.warn('Missing rowIndex or biomarkerColumnIndex for biomarker validation:', biomarkerName);
            return false;
        }

        // Get the color from biomarkerColorMap using row and column indices
        // biomarkerColorMap structure: { rowIndex: { columnIndex: color } }
        const rowColors = biomarkerColorMap.get(rowIndex.toString());
        if (!rowColors) {
            console.log(`No color data found for row ${rowIndex}, biomarker: ${biomarkerName}`);
            return false;
        }

        const color = rowColors[biomarkerColumnIndex.toString()];
        console.log(`Checking biomarker "${biomarkerName}" at row ${rowIndex}, column ${biomarkerColumnIndex}: color = ${color}`);
        
        // Valid biomarkers
        if (color && (color.toLowerCase() === '#b7e1cd' || color.toLowerCase() === '#d9d9d9')) {
            console.log(`Valid biomarker: ${biomarkerName}`);
            return true;
        }

        console.log(`Invalid biomarker: ${biomarkerName} (color: ${color})`);
        return false;
    }

    // Create and show homepage
    function createHomepage() {
        // Check if homepage already exists
        let homepageContainer = document.getElementById('homepage-container');
        if (!homepageContainer) {
            homepageContainer = document.createElement('div');
            homepageContainer.id = 'homepage-container';
            homepageContainer.className = 'homepage-container';
            
            homepageContainer.innerHTML = `
                <h1 class="homepage-title">Home Summary</h1>
                <div class="homepage-images-grid">
                    <div class="homepage-image-container">
                        <img src="BiomarkerTypes.png" alt="Biomarker Types" class="homepage-image">
                    </div>
                    <div class="homepage-image-container">
                        <img src="BiochemicalBiomarkersAssays.png" alt="Biochemical Biomarkers Assays" class="homepage-image">
                    </div>
                    <div class="homepage-image-container">
                        <img src="CalculationBiomarkers.png" alt="Calculation Biomarkers" class="homepage-image">
                    </div>
                    <div class="homepage-image-container">
                        <img src="PanelCompatability.png" alt="Panel Compatibility" class="homepage-image">
                    </div>
                </div>

            `;
            
            paragraphContainer.appendChild(homepageContainer);
        }
        
        return homepageContainer;
    }

    // Show homepage
    function showHomepage() {
        const homepageContainer = createHomepage();
        homepageContainer.style.display = 'block';
    }

    // Hide homepage
    function hideHomepage() {
        const homepageContainer = document.getElementById('homepage-container');
        if (homepageContainer) {
            homepageContainer.style.display = 'none';
        }
    }

    

    // Create homepage button
    // New version of the createHomepageButton function
function createHomepageButton() {
    const homeButton = document.getElementById('homeButton');

    // Add the event listener to the existing button
    if (homeButton) {
        homeButton.addEventListener('click', function() {
            // Your existing logic for the home button
            searchInput.value = '';
            hideSuggestions();
            showHomepage();
            paragraphContainer.querySelectorAll('.content-paragraph').forEach(p => p.classList.add('hide'));
            document.querySelectorAll('.biomarker-result-container, #search-results-summary, #noResultsMessage, .suggestion-message')
                .forEach(el => el.remove());
        });
    }
}
        function toggleBiomarkerDetails(biomarkerElement, biomarkerName, biomarkerData, panelContainer) {
            const loincForKey = (biomarkerData?.loinc || biomarkerElement?.getAttribute('data-loinc') || '').replace(/[^A-Za-z0-9-]/g,'');
            const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}-${loincForKey}`;
            let detailsContainer = document.getElementById(biomarkerKey);

            if (detailsContainer) {
                // Visible state uses class 'visible' instead of 'show'
                const isVisible = detailsContainer.classList.contains('visible');
                if (isVisible) {
                    // begin fade out
                    detailsContainer.classList.remove('visible');
                    biomarkerElement.classList.remove('expanded');

                    // when fade completes, set display none and adjust heights / panel classes
                    const onFadeOut = (e) => {
                        if (e.propertyName !== 'opacity') return;
                        detailsContainer.removeEventListener('transitionend', onFadeOut);
                        detailsContainer.style.display = 'none';

                        // remove eye icon
                        const existingEye = biomarkerElement.parentElement
                            ? biomarkerElement.parentElement.querySelector(`.biomarker-eye[data-for="${biomarkerKey}"]`)
                            : null;
                        if (existingEye) existingEye.remove();

                        // if no other visible details in this panel, collapse the panel-expanded styling
                        const anyExpanded = panelContainer.querySelector('.biomarker-detail-expanded.visible');
                        if (!anyExpanded) panelContainer.classList.remove('panel-expanded');

                        adjustBiomarkerDetailsMaxHeight(panelContainer);
                    };
                    detailsContainer.addEventListener('transitionend', onFadeOut);
                } else {
                    // show: set display block then add 'visible' to animate opacity
                    detailsContainer.style.display = 'block';
                    // force a reflow so transition will run
                    requestAnimationFrame(() => detailsContainer.classList.add('visible'));

                    biomarkerElement.classList.add('expanded');

                    // add eye icon if missing (same logic you used)
                    let eye = biomarkerElement.parentElement
                        ? biomarkerElement.parentElement.querySelector(`.biomarker-eye[data-for="${biomarkerKey}"]`)
                        : null;
                    if (!eye) {
                        let loincSpan = biomarkerElement.nextElementSibling;
                        while (loincSpan && !(loincSpan.classList && loincSpan.classList.contains('biomarker-loinc'))) {
                            loincSpan = loincSpan.nextElementSibling;
                        }
                        eye = document.createElement('img');
                        eye.src = 'Eye.png';
                        eye.alt = 'Viewing';
                        eye.className = 'biomarker-eye';
                        eye.setAttribute('data-for', `${biomarkerKey}`);
                        // Make eye non-interactive so it doesn't interfere with clicks
                        eye.style.pointerEvents = 'none';
                        if (loincSpan) loincSpan.insertAdjacentElement('afterend', eye);
                        else biomarkerElement.insertAdjacentElement('afterend', eye);
                    }

                    panelContainer.classList.add('panel-expanded');
                    adjustBiomarkerDetailsMaxHeight(panelContainer);
                }
            } else {
                // create new details element
                detailsContainer = createBiomarkerDetailsElement(biomarkerName, biomarkerData, biomarkerKey);

                let biomarkerDetailsContainer = panelContainer.querySelector('.biomarker-details-container');
                if (!biomarkerDetailsContainer) {
                    biomarkerDetailsContainer = document.createElement('div');
                    biomarkerDetailsContainer.className = 'biomarker-details-container';
                    panelContainer.appendChild(biomarkerDetailsContainer);
                }

                // insert in original order (your original insertion logic)
                const allClickables = Array.from(panelContainer.querySelectorAll('.biomarker-clickable'));
                const thisIndex = allClickables.findIndex(el => el === biomarkerElement);
                const existingDetails = Array.from(biomarkerDetailsContainer.querySelectorAll('.biomarker-detail-expanded'));

                let inserted = false;
                for (let i = 0; i < existingDetails.length; i++) {
                    const detail = existingDetails[i];
                    const detailId = detail.id;
                    const matchIndex = allClickables.findIndex(el => {
                        const ln = (el.getAttribute('data-loinc') || '').replace(/[^A-Za-z0-9-]/g,'');
                        const idForEl = `${panelContainer.id}-${el.getAttribute('data-biomarker').replace(/\s+/g, '-')}-${ln}`;
                        return idForEl === detailId;
                    });
                    if (matchIndex > thisIndex && detail.parentNode === biomarkerDetailsContainer) {
                        biomarkerDetailsContainer.insertBefore(detailsContainer, detail);
                        inserted = true; break;
                    }
                }
                if (!inserted) biomarkerDetailsContainer.appendChild(detailsContainer);

                // show with fade (set display then add visible)
                detailsContainer.style.display = 'block';
                requestAnimationFrame(() => detailsContainer.classList.add('visible'));
                biomarkerElement.classList.add('expanded');

                // add eye icon like above
                let eye = biomarkerElement.parentElement
                    ? biomarkerElement.parentElement.querySelector(`.biomarker-eye[data-for="${biomarkerKey}"]`)
                    : null;
                if (!eye) {
                    let loincSpan = biomarkerElement.nextElementSibling;
                    while (loincSpan && !(loincSpan.classList && loincSpan.classList.contains('biomarker-loinc'))) {
                        loincSpan = loincSpan.nextElementSibling;
                    }
                    eye = document.createElement('img');
                    eye.src = 'Eye.png';
                    eye.alt = 'Viewing';
                    eye.className = 'biomarker-eye';
                    eye.setAttribute('data-for', `${biomarkerKey}`);
                    eye.style.pointerEvents = 'none';
                    if (loincSpan) loincSpan.insertAdjacentElement('afterend', eye);
                    else biomarkerElement.insertAdjacentElement('afterend', eye);
                }

                panelContainer.classList.add('panel-expanded');
                adjustBiomarkerDetailsMaxHeight(panelContainer);
            }
        }

    // Updated createBiomarkerDetailsElement function
function createBiomarkerDetailsElement(biomarkerName, biomarkerData, elementId) {
    const assayKey = makeBiomarkerKey(biomarkerName, biomarkerData?.loinc);
    let biomarkerInfo = biomarkerUrlMap.get(assayKey);
    biomarkerInfo = verifyCalculationAssayType(biomarkerInfo, biomarkerData?.loinc);
    
    const detailsDiv = document.createElement('div');
    detailsDiv.id = elementId;
    detailsDiv.className = 'biomarker-detail-expanded';

    const isValid = isValidBiomarker(biomarkerName, biomarkerData?.loinc, biomarkerData?.rowIndex, biomarkerData?.biomarkerColumnIndex);
    
    // Check if biomarker is gray (#d9d9d9)
    const rowColors = biomarkerColorMap.get(biomarkerData?.rowIndex?.toString());
    const biomarkerColor = rowColors ? rowColors[biomarkerData?.biomarkerColumnIndex?.toString()] : null;
    const isGrayBiomarker = biomarkerColor && biomarkerColor.toLowerCase() === '#d9d9d9';
    
    if (!isValid) {
        detailsDiv.classList.add('invalid-biomarker');
    } else if (isGrayBiomarker) {
        detailsDiv.classList.add('gray-biomarker');
    }

    let detailsContent = `<h4>${biomarkerName}</h4>`;

    detailsContent += `
        <div class="detail-item">
            <span class="detail-label">Biomarker Name:</span>
            <span class="detail-value">${biomarkerName}</span>
        </div>`;

    // Get biomarker type from pureBiomarkerData
    let biomarkerType = 'Unknown';
    if (biomarkerData && biomarkerData.loinc) {
        biomarkerType = getBiomarkerTypeFromPureData(biomarkerName, biomarkerData.loinc);
    }
    
    // Override biomarker type to "Description" if biomarker is gray
    if (isGrayBiomarker) {
        biomarkerType = 'Description';
    }
    
    detailsContent += `
        <div class="detail-item">
            <span class="detail-label">Biomarker Type:</span>
            <span class="detail-value" ${!isValid ? 'style="color: #000000;"' : ''}>${biomarkerType}</span>
        </div>`; 

    if (biomarkerData && biomarkerData.loinc) {
        detailsContent += `
            <div class="detail-item">
                <span class="detail-label">LOINC Code:</span>
                <span class="detail-value">
                    <a href="https://loinc.org/${biomarkerData.loinc}" target="_blank">${biomarkerData.loinc}</a>
                </span>
            </div>`;
    }

    const loincName = (biomarkerInfo && biomarkerInfo.description) ? biomarkerInfo.description
        : (biomarkerData && biomarkerData.loincName ? biomarkerData.loincName : biomarkerName);

    detailsContent += `
        <div class="detail-item">
            <span class="detail-label">LOINC Name:</span>
            <span class="detail-value">${loincName}</span>
        </div>`;

    // Add separator line between biomarker info and assay info
    detailsContent += `<div class="detail-separator"></div>`;

    // Check if this is a calculation based on biomarker type from pureBiomarkerData
    if (biomarkerType === 'Calculation') {
        let associatedBiomarkers = [];
        if (biomarkerInfo && biomarkerInfo.associatedBiomarkers && biomarkerInfo.associatedBiomarkers.length > 0) {
            associatedBiomarkers = biomarkerInfo.associatedBiomarkers;
        } else {
            associatedBiomarkers = getAssociatedBiomarkersForCalculation(biomarkerName, biomarkerData.loinc);
        }
        
        if (associatedBiomarkers && associatedBiomarkers.length > 0) {
            const associatedCount = associatedBiomarkers.length;
            detailsContent += `
                <div class="detail-item">
                    <span class="detail-label">Associated Biomarkers (${associatedCount}):</span>
                    <div class="detail-value">
                        <ul class="associated-biomarkers-list">`;
            
            associatedBiomarkers.forEach(associated => {
                // Modified click handler
                detailsContent += `
                    <li>
                        <span class="associated-biomarker-name associated-biomarker-clickable" onclick="window.navigateToBiomarker('${associated.loinc}', '${associated.name}')">${associated.name}</span> 
                        <span class="associated-biomarker-loinc">(LOINC: ${associated.loinc})</span>
                    </li>`;
            });
            
            detailsContent += `
                        </ul>
                    </div>
                </div>`;
        }
    } else if (biomarkerInfo && biomarkerInfo.assayType && biomarkerType === "Biochemical") {
        detailsContent += `
            <div class="detail-item">
                <span class="detail-label">Assay Type:</span>
                <span class="detail-value">${biomarkerInfo.assayType}</span>
            </div>`;
    }

    if (biomarkerInfo && biomarkerInfo.vendor) {
        detailsContent += `
            <div class="detail-item">
                <span class="detail-label">Assay Vendor:</span>
                <span class="detail-value">${biomarkerInfo.vendor}</span>
            </div>`;
    }

    if (biomarkerInfo && biomarkerInfo.catalog) {
        detailsContent += `
            <div class="detail-item">
                <span class="detail-label">Catalog Number:</span>
                <span class="detail-value">${biomarkerInfo.catalog}</span>
            </div>`;
    }

    if (biomarkerInfo && biomarkerInfo.kitUrl) {
        detailsContent += `
            <div class="detail-item">
                <span class="detail-label">Kit URL:</span>
                <span class="detail-value"><a href="${biomarkerInfo.kitUrl}" target="_blank" class="detail-link">View Kit Details</a></span>
            </div>`;
    }

    const currentLoinc = (biomarkerData?.loinc || biomarkerInfo?.loincCode || '').trim();
    const compKey = makeBiomarkerKey(biomarkerName, currentLoinc);
    const panelsUsing = (biomarkerToPanelsMap.get(compKey)?.panels || [])
        .map(ref => ref.panelData);

    if (panelsUsing.length > 0) {
        const panelListId = `${elementId}-panel-list`;
        detailsContent += `
            <div class="panels-using-biomarker" style="margin-top: 15px;">
                <div class="panel-toggle-header" onclick="togglePanelList('${panelListId}', this)">
                    <span class="panel-toggle-text">Panels Using This Biomarker (${panelsUsing.length})</span>
                    <span class="panel-toggle-arrow">▼</span>
                </div>
                <div id="${panelListId}" style="display: none; margin-top: 10px;">
                    <ul style="list-style: none; padding-left: 0;">
        `;

        panelsUsing.forEach(({ keyword, cpt, testNumber, biomarkers, statusIcon, tooltipText }) => {
            detailsContent += `
                <li class="associated-panel-container">
                    <div class="associated-panel-content">
                        <div class="associated-panel-header">
                            <span class="associated-panel-label">PANEL</span>
                            <span class="associated-panel-title">${keyword}</span>
                            <img 
                                src="open-tab.png" 
                                class="open-new-tab-icon" 
                                title="Open in new tab"
                                onclick="window.openPanelInNewTab('${encodeURIComponent(keyword)}')"
                            />
                        </div>
                        <p class="associated-panel-meta">
                            ${cpt ? `CPT: ${cpt}` : 'CPT: Not Found'} | 
                            ${testNumber ? `Test #: ${testNumber}` : 'Test #: Not Found'} | 
                            ${(biomarkers?.length || 0)} biomarkers
                            <span class="biomarker-panel-status">${statusIcon || ''}<div class="panel-tooltip">${tooltipText || ''}</div></span>
                        </p>
                    </div>
                </li>`;
        });

        detailsContent += `
                    </ul>
                </div>
            </div>`;
    }

    detailsDiv.innerHTML = detailsContent;
    return detailsDiv;
}
        // Ensure biomarker details container doesn't overflow past the panel bottom.
    function adjustBiomarkerDetailsMaxHeight(panelContainer) {
        if (!panelContainer) return;
        const detailsContainer = panelContainer.querySelector('.biomarker-details-container');
        if (!detailsContainer) return;

        // Make it scroll if needed
        detailsContainer.style.overflowY = 'auto';

        try {
            const panelRect = panelContainer.getBoundingClientRect();
            const detailsRect = detailsContainer.getBoundingClientRect();

            // top offset of detailsContainer relative to panel top
            const topOffset = Math.max(0, detailsRect.top - panelRect.top);

            // account for panel's vertical padding
            const cs = window.getComputedStyle(panelContainer);
            const paddingBottom = parseFloat(cs.paddingBottom) || 0;

            // compute available height within the panel for the details container
            let maxH = panelContainer.clientHeight - topOffset - paddingBottom - 8; // small safety margin

            // If result is nonsensical (panel auto-sized), fallback to a large value
            if (!isFinite(maxH) || maxH < 100) {
                maxH = 1000;
            }

            detailsContainer.style.maxHeight = Math.max(80, Math.floor(maxH)) + 'px';
        } catch (e) {
            // Fallback: don't crash if DOM measurement fails
            detailsContainer.style.maxHeight = '1000px';
        }
    }


        // Ensure biomarker details container doesn't overflow past the panel bottom.
    function adjustBiomarkerDetailsMaxHeight(panelContainer) {
        if (!panelContainer) return;
        const detailsContainer = panelContainer.querySelector('.biomarker-details-container');
        if (!detailsContainer) return;

        // Make it scroll if needed
        detailsContainer.style.overflowY = 'auto';

        try {
            const panelRect = panelContainer.getBoundingClientRect();
            const detailsRect = detailsContainer.getBoundingClientRect();

            // top offset of detailsContainer relative to panel top
            const topOffset = Math.max(0, detailsRect.top - panelRect.top);

            // account for panel's vertical padding
            const cs = window.getComputedStyle(panelContainer);
            const paddingBottom = parseFloat(cs.paddingBottom) || 0;

            // compute available height within the panel for the details container
            let maxH = panelContainer.clientHeight - topOffset - paddingBottom - 8; // small safety margin

            // If result is nonsensical (panel auto-sized), fallback to a large value
            if (!isFinite(maxH) || maxH < 100) {
                maxH = 1000;
            }

            detailsContainer.style.maxHeight = Math.max(80, Math.floor(maxH)) + 'px';
        } catch (e) {
            // Fallback: don't crash if DOM measurement fails
            detailsContainer.style.maxHeight = '1000px';
        }
    }

    // Recompute on window resize so cutoff follows panel size
    window.addEventListener('resize', function() {
        document.querySelectorAll('.panel-container').forEach(pc => adjustBiomarkerDetailsMaxHeight(pc));
    });


   // Expand all biomarkers for a panel
   function expandAllBiomarkers(panelContainer) {
    const biomarkerElements = panelContainer.querySelectorAll('.biomarker-clickable');
    let anyExpanded = false;

    biomarkerElements.forEach(biomarkerElement => {
        const biomarkerName = biomarkerElement.getAttribute('data-biomarker');
        const loincCode = biomarkerElement.getAttribute('data-loinc');
        const rowIndex = biomarkerElement.getAttribute('data-row-index');
        const biomarkerColumnIndex = biomarkerElement.getAttribute('data-biomarker-column-index');
        const ln = (loincCode || '').replace(/[^A-Za-z0-9-]/g,'');
        const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}-${ln}`;        
        let detailsContainer = document.getElementById(biomarkerKey);

        const biomarkerData = {
            loinc: loincCode,
            rowIndex: parseInt(rowIndex),
            biomarkerColumnIndex: parseInt(biomarkerColumnIndex)
        };

        if (!detailsContainer) {
            // Create the details if they don't exist
            toggleBiomarkerDetails(biomarkerElement, biomarkerName, biomarkerData, panelContainer);
            anyExpanded = true;
        } else if (!detailsContainer.classList.contains('show')) {
            // Show if hidden
            detailsContainer.style.display = 'block';
            requestAnimationFrame(() => detailsContainer.classList.add('visible'));
            biomarkerElement.classList.add('expanded');
            
            adjustBiomarkerDetailsMaxHeight(panelContainer);

            // Ensure the eye icon is present when bulk-expanding
            {
                const biomarkerName = biomarkerElement.getAttribute('data-biomarker');
                const ln = (biomarkerElement.getAttribute('data-loinc') || '').replace(/[^A-Za-z0-9-]/g,'');
                const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}-${ln}`;

                let eye = biomarkerElement.parentElement
                    ? biomarkerElement.parentElement.querySelector(`.biomarker-eye[data-for="${biomarkerKey}"]`)
                    : null;

                if (!eye) {
                    let loincSpan = biomarkerElement.nextElementSibling;
                    while (loincSpan && !(loincSpan.classList && loincSpan.classList.contains('biomarker-loinc'))) {
                        loincSpan = loincSpan.nextElementSibling;
                    }

                    eye = document.createElement('img');
                    eye.src = 'Eye.png';
                    eye.alt = 'Viewing';
                    eye.className = 'biomarker-eye';
                    eye.setAttribute('data-for', biomarkerKey);

                    if (loincSpan) {
                        loincSpan.insertAdjacentElement('afterend', eye);
                    } else {
                        biomarkerElement.insertAdjacentElement('afterend', eye);
                    }
                }
            }

            anyExpanded = true;
        }
    });

    // Only add expansion styling if at least one was opened
    if (anyExpanded) {
        panelContainer.classList.add('panel-expanded');
        adjustBiomarkerDetailsMaxHeight(panelContainer);
    }
}

   // Collapse all biomarkers for a panel
   function collapseAllBiomarkers(panelContainer) {
        const biomarkerElements = panelContainer.querySelectorAll('.biomarker-clickable');
        let anyCollapsed = false;

        biomarkerElements.forEach(biomarkerElement => {
            const biomarkerName = biomarkerElement.getAttribute('data-biomarker');
            const ln = (biomarkerElement.getAttribute('data-loinc') || '').replace(/[^A-Za-z0-9-]/g,'');
            const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}-${ln}`;

            const detailsContainer = document.getElementById(biomarkerKey);

            // Always remove highlight from biomarker
            biomarkerElement.classList.remove('expanded');
            
            // Remove eye icon when bulk-collapsing
            {
                const biomarkerName = biomarkerElement.getAttribute('data-biomarker');
                const ln = (biomarkerElement.getAttribute('data-loinc') || '').replace(/[^A-Za-z0-9-]/g,'');
                const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}-${ln}`;

                const eye = biomarkerElement.parentElement
                    ? biomarkerElement.parentElement.querySelector(`.biomarker-eye[data-for="${biomarkerKey}"]`)
                    : null;
                if (eye) eye.remove();
            }

            // Hide details if visible
            if (detailsContainer && detailsContainer.classList.contains('visible')) {
                // fade out, then set display none on transition end
                detailsContainer.classList.remove('visible');
                detailsContainer.addEventListener('transitionend', function _onFade(e){
                    if (e.propertyName !== 'opacity') return;
                    detailsContainer.removeEventListener('transitionend', _onFade);
                    detailsContainer.style.display = 'none';
                });
                biomarkerElement.classList.remove('expanded');
                anyCollapsed = true;
            }

        });

        // Remove expansion class if anything was collapsed
        if (anyCollapsed) {
            panelContainer.classList.remove('panel-expanded');
            adjustBiomarkerDetailsMaxHeight(panelContainer);
        }

    }



   // Cache management functions
   function getCachedData() {
       try {
           const cachedItem = localStorage.getItem(CACHE_KEY);
           if (!cachedItem) return null;

           const parsedItem = JSON.parse(cachedItem);
           const now = new Date().getTime();
           
           // Check if cache is still valid
           if (now - parsedItem.timestamp > CACHE_DURATION) {
               localStorage.removeItem(CACHE_KEY);
               return null;
           }
           
           // Handle compressed data
           if (parsedItem.compressed && parsedItem.compressedData) {
               console.log('Decompressing cached data...');
               
               // Check if LZ-String is available
               if (typeof LZString === 'undefined') {
                   console.error('LZ-String library not loaded, cannot decompress data');
                   localStorage.removeItem(CACHE_KEY);
                   return null;
               }
               
               try {
                   let decompressedData;
                   
                   if (parsedItem.aggressive) {
                       decompressedData = LZString.decompressFromUTF16(parsedItem.compressedData);
                   } else {
                       decompressedData = LZString.decompress(parsedItem.compressedData);
                   }
                   
                   if (!decompressedData) {
                       throw new Error('Decompression returned null');
                   }
                   
                   const data = JSON.parse(decompressedData);
                   console.log('✅ Data decompressed successfully');
                   return data;
                   
               } catch (decompressError) {
                   console.error('❌ Error decompressing cached data:', decompressError.message);
                   localStorage.removeItem(CACHE_KEY);
                   return null;
               }
           }
           
           // Handle uncompressed data (backward compatibility)
           return parsedItem.data;
       } catch (error) {
           console.error('Error reading cache:', error);
           localStorage.removeItem(CACHE_KEY);
           return null;
       }
   }

   function setCachedData(data) {
       try {
           console.log('Starting cache process...');
           
           // Create cache item
           const cacheItem = {
               data: data,
               timestamp: new Date().getTime(),
               version: '2.0'
           };
           
           // First, try without compression
           let serializedData = JSON.stringify(cacheItem);
           let sizeInMB = new Blob([serializedData]).size / (1024 * 1024);
           
           console.log(`Original data size: ${sizeInMB.toFixed(2)} MB`);
           
           // If data is larger than 4MB, use LZ-String compression
           if (sizeInMB > 4) {
               console.log('Data too large, applying LZ-String compression...');
               
               // Check if LZ-String is available
               if (typeof LZString === 'undefined') {
                   console.error('LZ-String library not loaded, cannot compress large data');
                   return;
               }
               
               const compressedData = LZString.compress(JSON.stringify(data));
               const compressedItem = {
                   compressedData: compressedData,
                   timestamp: new Date().getTime(),
                   version: '2.0',
                   compressed: true
               };
               
               serializedData = JSON.stringify(compressedItem);
               sizeInMB = new Blob([serializedData]).size / (1024 * 1024);
               
               console.log(`Compressed data size: ${sizeInMB.toFixed(2)} MB`);
               
               // If still too large, try more aggressive compression
               if (sizeInMB > 8) {
                   console.log('Still too large, trying aggressive compression...');
                   const aggressiveCompressed = LZString.compressToUTF16(JSON.stringify(data));
                   const aggressiveItem = {
                       compressedData: aggressiveCompressed,
                       timestamp: new Date().getTime(),
                       version: '2.0',
                       compressed: true,
                       aggressive: true
                   };
                   
                   serializedData = JSON.stringify(aggressiveItem);
                   sizeInMB = new Blob([serializedData]).size / (1024 * 1024);
                   
                   console.log(`Aggressively compressed data size: ${sizeInMB.toFixed(2)} MB`);
                   
                   if (sizeInMB > 10) {
                       console.warn('Data still too large even with aggressive compression, skipping cache');
                       return;
                   }
               }
           }
           
           // Try to store the data
           localStorage.setItem(CACHE_KEY, serializedData);
           console.log(`✅ Data cached successfully! Size: ${sizeInMB.toFixed(2)} MB`);
           
       } catch (error) {
           if (error.name === 'QuotaExceededError') {
               console.error('❌ localStorage quota exceeded. Attempting to clear space...');
               
               // Clear existing cache and try again
               try {
                   localStorage.removeItem(CACHE_KEY);
                   
                   // Try with maximum compression
                   if (typeof LZString !== 'undefined') {
                       const maxCompressed = LZString.compressToUTF16(JSON.stringify(data));
                       const maxItem = {
                           compressedData: maxCompressed,
                           timestamp: new Date().getTime(),
                           version: '2.0',
                           compressed: true,
                           aggressive: true
                       };
                       
                       localStorage.setItem(CACHE_KEY, JSON.stringify(maxItem));
                       console.log('✅ Data cached with maximum compression after clearing space');
                   } else {
                       console.error('❌ Cannot compress without LZ-String library');
                   }
                   
               } catch (retryError) {
                   console.error('❌ Failed to cache even after clearing space:', retryError.message);
               }
           } else {
               console.error('❌ Error caching data:', error.message);
           }
       }
   }

   function clearCache() {
       localStorage.removeItem(CACHE_KEY);
       console.log('Cache cleared');
   }

   // Enhanced load content function with caching
   async function loadContent() {
       try {
           // First, try to load from cache
           const cachedData = getCachedData();
           
           if (cachedData) {
               console.log('✅ Loading data from cache...');
               
               // Show loading message for cache load
               paragraphContainer.innerHTML = '<p style="text-align: center; color: #666;">Loading cached data...</p>';
               
               try {
                   // Validate cached data structure
                   if (!cachedData.labcorpData || !cachedData.biomarkerAssayData) {
                       throw new Error('Invalid cached data structure - missing required data');
                   }
                   
                   if (!Array.isArray(cachedData.labcorpData) || !Array.isArray(cachedData.biomarkerAssayData)) {
                       throw new Error('Invalid cached data structure - data is not arrays');
                   }
                   
                   console.log(`📊 Cache contains ${cachedData.labcorpData.length} labcorp rows and ${cachedData.biomarkerAssayData.length} biomarker rows`);
                   
                   // Parse calculation data if available
                   calculationData = cachedData.calculationData || [];
                   console.log(`📊 Cache contains ${calculationData.length} calculation rows`);
                   
                   // Parse pure biomarker data if available
                   pureBiomarkerData = cachedData.pureBiomarkerData || [];
                   console.log(`📊 Cache contains ${pureBiomarkerData.length} pure biomarker rows`);
                   
                   // Parse cached data
                   biomarkerUrlMap = parseBiomarkerAssayData(cachedData.biomarkerAssayData, calculationData);
                   allContentData = parseLabcorpData(cachedData.labcorpData, biomarkerUrlMap);
                   
                   // Convert biomarkerColorMap to a Map for easier access
                   biomarkerColorMap = new Map();
                   const rawColorMap = cachedData.biomarkerColorMap || {};
                   Object.keys(rawColorMap).forEach(rowIndex => {
                       biomarkerColorMap.set(rowIndex, rawColorMap[rowIndex]);
                   });
                   console.log("Biomarker color map loaded from cache:", biomarkerColorMap);
                   
                   renderInitialParagraphs();
                   console.log('✅ Data loaded from cache successfully');
                   return;
                   
               } catch (cacheError) {
                   console.error('❌ Error processing cached data:', cacheError.message);
                   console.log('🧹 Clearing corrupted cache and loading from server...');
                   clearCache();
                   // Continue to load from server
               }
           }

           // If no cache, load from Google Apps Script
           console.log('No cache found. Loading data from Google Apps Script...');
           
           // Show loading message
           paragraphContainer.innerHTML = '<p style="text-align: center; color: #666;">Loading data from server... This may take a moment.</p>';
           
           const response = await fetch(APPS_SCRIPT_URL);
           
           if (!response.ok) {
               throw new Error(`HTTP error! status: ${response.status}`);
           }
           
           const data = await response.json();
           console.log("Raw response from server:", data);
           
           if (!data.success) {
               throw new Error(data.error || 'Unknown error from Apps Script');
           }
           
           console.log('Data loaded successfully from server');
           console.log('Labcorp data rows:', data.data.labcorpData.length);
           console.log('Biomarkers data rows:', data.data.biomarkerAssayData.length);
           
           // Parse calculation data if available
           calculationData = data.data.calculationData || [];
           console.log('Calculation data rows:', calculationData.length);
           
           // Parse pure biomarker data if available
           pureBiomarkerData = data.data.pureBiomarkerData || [];
           console.log('Pure biomarker data rows:', pureBiomarkerData.length);
           
           // Cache the fresh data
           setCachedData(data.data);
           
           // Parse the data
           biomarkerUrlMap = parseBiomarkerAssayData(data.data.biomarkerAssayData, calculationData);
           allContentData = parseLabcorpData(data.data.labcorpData, biomarkerUrlMap);
           // Convert biomarkerColorMap to a Map for easier access
           biomarkerColorMap = new Map();
           const rawColorMap = data.data.biomarkerColorMap || {};
           Object.keys(rawColorMap).forEach(rowIndex => {
               biomarkerColorMap.set(rowIndex, rawColorMap[rowIndex]);
           });
           console.log("Biomarker color map loaded:", biomarkerColorMap);
           
           renderInitialParagraphs();
           
       } catch (error) {
           console.error('Error loading content:', error);
           paragraphContainer.innerHTML = `
               <div style="color: red; text-align: center;">
                   <p>Error loading content from Google Sheets.</p>
                   <p>${error.message}</p>
                   <p>Please check your Apps Script deployment.</p>
                   <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px;">Retry</button>
                   <button onclick="clearCacheAndReload()" style="margin-top: 10px; padding: 5px 10px; margin-left: 10px;">Clear Cache & Retry</button>
               </div>
           `;
       }
   }

   // Function to clear cache and reload (useful for debugging)
   window.clearCacheAndReload = function() {
       clearCache();
       location.reload();
   };

   // Add comprehensive debugging functions
   window.debugCache = function() {
       console.log('=== CACHE DEBUG INFO ===');
       
       const cachedItem = localStorage.getItem(CACHE_KEY);
       if (!cachedItem) {
           console.log('❌ No cache found');
           return;
       }
       
       try {
           const parsedItem = JSON.parse(cachedItem);
           const sizeInMB = new Blob([cachedItem]).size / (1024 * 1024);
           const cacheAge = new Date().getTime() - parsedItem.timestamp;
           const hoursOld = Math.floor(cacheAge / (1000 * 60 * 60));
           const minutesOld = Math.floor((cacheAge % (1000 * 60 * 60)) / (1000 * 60));
           
           console.log(`✅ Cache exists`);
           console.log(`📊 Size: ${sizeInMB.toFixed(2)} MB`);
           console.log(`⏰ Age: ${hoursOld}h ${minutesOld}m`);
           console.log(`📦 Compressed: ${parsedItem.compressed ? 'YES' : 'NO'}`);
           console.log(`🔥 Aggressive: ${parsedItem.aggressive ? 'YES' : 'NO'}`);
           console.log(`📅 Created: ${new Date(parsedItem.timestamp).toLocaleString()}`);
           console.log(`✅ Valid: ${cacheAge < CACHE_DURATION ? 'YES' : 'NO (expired)'}`);
           console.log(`🔧 Version: ${parsedItem.version || '1.0'}`);
           
           // Test decompression
           if (parsedItem.compressed) {
               console.log('🧪 Testing decompression...');
               if (typeof LZString === 'undefined') {
                   console.log('❌ LZ-String not available');
               } else {
                   try {
                       const testData = parsedItem.aggressive ? 
                           LZString.decompressFromUTF16(parsedItem.compressedData) :
                           LZString.decompress(parsedItem.compressedData);
                       console.log('✅ Decompression test passed');
                   } catch (e) {
                       console.log('❌ Decompression test failed:', e.message);
                   }
               }
           }
           
       } catch (error) {
           console.log('❌ Error parsing cache:', error.message);
       }
       
       console.log('=== END DEBUG INFO ===');
   };

   window.testLZString = function() {
       console.log('=== LZ-STRING TEST ===');
       
       if (typeof LZString === 'undefined') {
           console.log('❌ LZ-String library not loaded');
           return;
       }
       
       console.log('✅ LZ-String library loaded');
       
       // Test compression
       const testData = { test: 'Hello World'.repeat(1000) };
       const original = JSON.stringify(testData);
       const compressed = LZString.compress(original);
       const aggressive = LZString.compressToUTF16(original);
       
       console.log(`📊 Original size: ${(original.length / 1024).toFixed(2)} KB`);
       console.log(`📦 Compressed size: ${(compressed.length / 1024).toFixed(2)} KB`);
       console.log(`🔥 Aggressive size: ${(aggressive.length / 1024).toFixed(2)} KB`);
       
       // Test decompression
       const decompressed = LZString.decompress(compressed);
       const decompressedAggressive = LZString.decompressFromUTF16(aggressive);
       
       console.log(`✅ Decompression works: ${decompressed === original}`);
       console.log(`✅ Aggressive decompression works: ${decompressedAggressive === original}`);
       
       console.log('=== END LZ-STRING TEST ===');
   };

   // Add cache status indicator - shows immediately when page loads
   function showCacheStatus() {
       try {
           const cachedItem = localStorage.getItem(CACHE_KEY);
           const statusDiv = document.createElement('div');
           
           if (cachedItem) {
               const parsedItem = JSON.parse(cachedItem);
               const cacheAge = new Date().getTime() - parsedItem.timestamp;
               const hoursOld = Math.floor(cacheAge / (1000 * 60 * 60));
               const minutesOld = Math.floor((cacheAge % (1000 * 60 * 60)) / (1000 * 60));
               const sizeInMB = new Blob([cachedItem]).size / (1024 * 1024);
               
               const isExpired = cacheAge > CACHE_DURATION;
               const compressionType = parsedItem.compressed ? (parsedItem.aggressive ? 'Max' : 'LZ') : 'None';
               
               console.log(`📦 Cache found: ${hoursOld}h ${minutesOld}m old, ${sizeInMB.toFixed(2)}MB, Compression: ${compressionType}`);
               
               // Green background for valid cache, orange for expired
               const bgColor = isExpired ? '#fff3cd' : '#d4edda';
               const borderColor = isExpired ? '#ffeaa7' : '#c3e6cb';
               const textColor = isExpired ? '#856404' : '#155724';
               const icon = isExpired ? '⚠️' : '📦';
               
               statusDiv.style.cssText = `position: fixed; top: 10px; right: 10px; background: ${bgColor}; border: 1px solid ${borderColor}; color: ${textColor}; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; z-index: 10000; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
               statusDiv.innerHTML = `${icon} Cache ${isExpired ? 'expired' : 'active'} (${hoursOld}h ${minutesOld}m)`;
           } else {
               console.log('🌐 No cache found, will load from server');
               
               // Yellow background for no cache
               statusDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; z-index: 10000; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
               statusDiv.innerHTML = '🌐 Loading from server...';
           }
           
           document.body.appendChild(statusDiv);
           
           // Remove after 5 seconds
           setTimeout(() => {
               if (statusDiv && statusDiv.parentNode) {
                   statusDiv.remove();
               }
           }, 5000);
           
       } catch (error) {
           console.error('❌ Error showing cache status:', error);
       }
   }

   // Helper function to verify calculation assay type based on LOINC match
   function verifyCalculationAssayType(biomarkerInfo, actualLoinc) {
       if (!biomarkerInfo || !biomarkerInfo.calculationLoinc || !actualLoinc) {
           return biomarkerInfo;
       }
       
       // Verify both name and LOINC match for calculation
       if (biomarkerInfo.calculationLoinc === actualLoinc) {
           // Confirmed match - keep as Calculation and preserve associated biomarkers
           console.log(`✅ Verified calculation assay type for biomarker (LOINC match: ${actualLoinc})`);
           return { 
               ...biomarkerInfo, 
               assayType: 'Calculation',
               // Preserve associated biomarkers data
               associatedBiomarkers: biomarkerInfo.associatedBiomarkers || []
           };
       } else {
           // LOINC doesn't match - revert to original assay type or Unknown
           console.log(`❌ LOINC mismatch for potential calculation: expected ${biomarkerInfo.calculationLoinc}, got ${actualLoinc}`);
           return { 
               ...biomarkerInfo, 
               assayType: biomarkerInfo.originalAssayType || 'Unknown',
               // Remove associated biomarkers since this is not a verified calculation
               associatedBiomarkers: undefined
           };
       }
   }

   // Function to get biomarker type from pureBiomarkerData
   function getBiomarkerTypeFromPureData(biomarkerName, loincCode) {
       if (!pureBiomarkerData || pureBiomarkerData.length < 2) {
           return 'Unknown';
       }
       
       const headers = pureBiomarkerData[0];       
       const nameColumn = findColumnIndex(headers, ['Biomarker']);
       const loincColumn = findColumnIndex(headers, ['LOINC']);
       const typeColumn = findColumnIndex(headers, ['Biomarker Type']);
       
       if (nameColumn === -1 || loincColumn === -1 || typeColumn === -1) {
           return 'Unknown';
       }
       
       // Search for matching biomarker name and LOINC
       for (let i = 1; i < pureBiomarkerData.length; i++) {
           const row = pureBiomarkerData[i];
           if (row.length === 0) continue;
           
           const rowName = row[nameColumn] ? row[nameColumn].toString().trim() : '';
           const rowLoinc = row[loincColumn] ? row[loincColumn].toString().trim() : '';
           const rowType = row[typeColumn] ? row[typeColumn].toString().trim() : '';
           
           // Match both biomarker name and LOINC code
           if (rowName.toLowerCase() === biomarkerName.toLowerCase() && 
               rowLoinc === loincCode) {
               return rowType || 'Unknown';
           }
       }
       
       return 'Unknown';
   }

   // Function to get associated biomarkers for a calculation from calculationData
   function getAssociatedBiomarkersForCalculation(biomarkerName, loincCode) {
       if (!calculationData || calculationData.length < 2) {
           return [];
       }
       
       const headers = calculationData[0];
       const nameColumn = findColumnIndex(headers, ['Calculations', 'Biomarker', 'Biomarker Name', 'Calculation Name']);
       const loincColumn = findColumnIndex(headers, ['Calculation LOINC', 'LOINC', 'LOINC Code']);
       
       if (nameColumn === -1 || loincColumn === -1) {
           console.log(`Could not find required columns. Name column: ${nameColumn}, LOINC column: ${loincColumn}`);
           return [];
       }
       
       console.log(`Searching for calculation: ${biomarkerName} with LOINC: ${loincCode}`);
       
       // Search for matching calculation
       for (let i = 1; i < calculationData.length; i++) {
           const row = calculationData[i];
           if (row.length === 0) continue;
           
           const rowName = row[nameColumn] ? row[nameColumn].toString().trim() : '';
           const rowLoinc = row[loincColumn] ? row[loincColumn].toString().trim() : '';
           
           // Match both biomarker name and LOINC code (or just name if LOINC doesn't match)
           if (rowName.toLowerCase() === biomarkerName.toLowerCase() && 
               (rowLoinc === loincCode || !loincCode || !rowLoinc)) {
               
               console.log(`Found matching calculation row for ${biomarkerName}`);
               
               // Extract associated biomarkers using the same logic as parseBiomarkerAssayData
               const associatedBiomarkers = [];
               
               // Look for biomarkers in columns C, E, G... (indices 2, 4, 6...)
               // and their LOINCs in columns D, F, H... (indices 3, 5, 7...)
               for (let colIndex = 2; colIndex < row.length; colIndex += 2) {
                   const biomarkerName = row[colIndex] ? row[colIndex].toString().trim() : '';
                   const biomarkerLoinc = row[colIndex + 1] ? row[colIndex + 1].toString().trim() : '';
                   
                   if (biomarkerName && biomarkerLoinc) {
                       associatedBiomarkers.push({
                           name: biomarkerName,
                           loinc: biomarkerLoinc
                       });
                       console.log(`  - Found associated biomarker: ${biomarkerName} (LOINC: ${biomarkerLoinc})`);
                   }
               }
               
               console.log(`Extracted ${associatedBiomarkers.length} associated biomarkers for ${rowName}`);
               return associatedBiomarkers;
           }
       }
       
       console.log(`No matching calculation found for ${biomarkerName}`);
       return [];
   }

   // Helper function to find biomarker name by LOINC code
   function findBiomarkerNameByLoinc(loincCode) {
       if (!pureBiomarkerData || pureBiomarkerData.length < 2) return null;
       
       const headers = pureBiomarkerData[0];
       const nameColumn = findColumnIndex(headers, ['Biomarker']);
       const loincColumn = findColumnIndex(headers, ['LOINC']);
       
       if (nameColumn === -1 || loincColumn === -1) return null;
       
       for (let i = 1; i < pureBiomarkerData.length; i++) {
           const row = pureBiomarkerData[i];
           const rowLoinc = row[loincColumn] ? row[loincColumn].toString().trim() : '';
           
           if (rowLoinc === loincCode) {
               return row[nameColumn] ? row[nameColumn].toString().trim() : null;
           }
       }
       
       return null;
   }

   // Helper function to find LOINC by biomarker name
   function findLoincByBiomarkerName(biomarkerName) {
       if (!pureBiomarkerData || pureBiomarkerData.length < 2) return null;
       
       const headers = pureBiomarkerData[0];
       const nameColumn = findColumnIndex(headers, ['Biomarker']);
       const loincColumn = findColumnIndex(headers, ['LOINC']);
       
       if (nameColumn === -1 || loincColumn === -1) return null;
       
       for (let i = 1; i < pureBiomarkerData.length; i++) {
           const row = pureBiomarkerData[i];
           const rowName = row[nameColumn] ? row[nameColumn].toString().trim() : '';
           
           if (rowName.toLowerCase() === biomarkerName.toLowerCase()) {
               return row[loincColumn] ? row[loincColumn].toString().trim() : null;
           }
       }
       
       return null;
   }

   // Parse biomarkers data to create URL mappings
   function parseBiomarkerAssayData(biomarkerAssayData, calculationData = []) {
       const urlMap = new Map();
       
       if (!biomarkerAssayData || biomarkerAssayData.length < 2) {
           console.warn('No biomarker data found');
           return urlMap;
       }
       
       const headers = biomarkerAssayData[0];
       console.log('Biomarkers headers:', headers);
       
       // Find relevant columns
       const nameColumn = findColumnIndex(headers, ['Biomarker']);
       const urlColumn = findColumnIndex(headers, ['LOINC url']);
       const descriptionColumn = findColumnIndex(headers, ['LOINC name']);
       const assayTypeColumn = findColumnIndex(headers, ['Assay type', 'Assay Type']);
       const kitUrlColumn = findColumnIndex(headers, ['Kit url', 'Kit URL']);
       const vendorColumn = findColumnIndex(headers, ['Vendor', 'Vendor']);
       const catalogColumn = findColumnIndex(headers, ['Catalog Number', 'Catalog Number']);
       
       console.log(`Found columns - Name: ${nameColumn}, URL: ${urlColumn}, Description: ${descriptionColumn}, Assay Type: ${assayTypeColumn}, Kit URL: ${kitUrlColumn}`);
       
       // Process data rows (skip header row)
       for (let i = 1; i < biomarkerAssayData.length; i++) {
           const row = biomarkerAssayData[i];
           
           if (row.length === 0) continue;
           
           const name = nameColumn >= 0 && row[nameColumn] ? row[nameColumn].toString().trim() : '';
           const url = urlColumn >= 0 && row[urlColumn] ? row[urlColumn].toString().trim() : '';
           const description = descriptionColumn >= 0 && row[descriptionColumn] ? row[descriptionColumn].toString().trim() : '';
           const assayType = assayTypeColumn >= 0 && row[assayTypeColumn] ? row[assayTypeColumn].toString().trim() : '';
           const kitUrl = kitUrlColumn >= 0 && row[kitUrlColumn] ? row[kitUrlColumn].toString().trim() : '';
           const vendor = vendorColumn >= 0 && row[vendorColumn] ? row[vendorColumn].toString().trim() : '';
           const catalog = catalogColumn >= 0 && row[catalogColumn] ? row[catalogColumn].toString().trim() : '';

            const loincFromUrl = extractLoincFromUrl(url);
            if (name && loincFromUrl) {
                const assayKey = makeBiomarkerKey(name, loincFromUrl);
                urlMap.set(assayKey, {
                   url: url || '#',
                   description: description || '',
                   assayType: assayType || '',
                   kitUrl: kitUrl || '',
                    vendor: vendor || '',
                    catalog: catalog || '',
                    loinc: loincFromUrl,
                    biomarkerName: name
               });
           }
       }
       
       console.log(`Created ${urlMap.size} biomarker mappings`);
       
       // Process calculation data to override assay types for matching biomarkers
       if (calculationData && calculationData.length > 1) {
           console.log('Processing calculation data...');
           const calcHeaders = calculationData[0];
           
           // Find relevant columns in calculation data
           const calcNameColumn = findColumnIndex(calcHeaders, ['Calculations']);
           const calcLoincColumn = findColumnIndex(calcHeaders, ['Calculation LOINC']);
           
           console.log(`Calculation columns - Name: ${calcNameColumn}, LOINC: ${calcLoincColumn}`);
           
           if (calcNameColumn >= 0 && calcLoincColumn >= 0) {
               // Process calculation rows (skip header)
               for (let i = 1; i < calculationData.length; i++) {
                   const row = calculationData[i];
                   
                   if (row.length === 0) continue;
                   
                   const calcName = row[calcNameColumn] ? row[calcNameColumn].toString().trim() : '';
                   const calcLoinc = row[calcLoincColumn] ? row[calcLoincColumn].toString().trim() : '';
                   
                   if (calcName && calcLoinc) {
                       const key = makeBiomarkerKey(calcName, calcLoinc);
                       
                       // Extract associated biomarkers for this calculation
                       const associatedBiomarkers = [];
                       
                       // Look for biomarkers in columns C, E, G... (indices 2, 4, 6...)
                       // and their LOINCs in columns D, F, H... (indices 3, 5, 7...)
                       for (let colIndex = 2; colIndex < row.length; colIndex += 2) {
                           const biomarkerName = row[colIndex] ? row[colIndex].toString().trim() : '';
                           const biomarkerLoinc = row[colIndex + 1] ? row[colIndex + 1].toString().trim() : '';
                           
                           if (biomarkerName && biomarkerLoinc) {
                               associatedBiomarkers.push({
                                   name: biomarkerName,
                                   loinc: biomarkerLoinc
                               });
                               console.log(`  - Found associated biomarker: ${biomarkerName} (LOINC: ${biomarkerLoinc})`);
                           }
                       }
                       
                       console.log(`Extracted ${associatedBiomarkers.length} associated biomarkers for ${calcName}`);
                       
                       // Check if this biomarker exists in our urlMap
                       if (urlMap.has(key)) {
                           const existingData = urlMap.get(key);
                           // Store original assay type and mark as potential calculation
                           urlMap.set(key, {
                               ...existingData,
                            originalAssayType: existingData.assayType || existingData.originalAssayType,
                            assayType: 'Calculation',
                            calculationLoinc: calcLoinc,
                            associatedBiomarkers: associatedBiomarkers
                           });
                           console.log(`Marked ${calcName} as potential Calculation assay type (LOINC: ${calcLoinc}) with ${associatedBiomarkers.length} associated biomarkers`);
                       } else {
                           // Add new entry for calculation biomarker
                           urlMap.set(key, {
                               url: '#',
                               description: '',
                               assayType: 'Calculation',
                               kitUrl: '',
                               calculationLoinc: calcLoinc,
                                                           associatedBiomarkers: associatedBiomarkers,
                            biomarkerName: calcName,
                            loinc: calcLoinc
                           });
                           console.log(`Added new calculation biomarker: ${calcName} with ${associatedBiomarkers.length} associated biomarkers`);
                       }
                   }
               }
           }
       }
       
       return urlMap;
   }

   // Parse Labcorp data to create content for display
   function parseLabcorpData(labcorpData, urlMap) {
       const contentData = [];
       
       if (!labcorpData || labcorpData.length < 2) {
           console.warn('No Labcorp data found');
           return contentData;
       }
       
       const headers = labcorpData[0];
       console.log('Labcorp headers:', headers);
       
       // Find the core columns
       const urlColumn = findColumnIndex(headers, ['url']);
       const nameColumn = findColumnIndex(headers, ['name']);
       const cptColumn = findColumnIndex(headers, ['cpt']);
       const testNumberColumn = findColumnIndex(headers, ['test number']);
       
       console.log(`Found core columns - URL: ${urlColumn}, Name: ${nameColumn}, CPT: ${cptColumn}, Test Number: ${testNumberColumn}`);
       
       // Find biomarker columns (starting from column E, index 4)
       const biomarkerColumns = [];
       const loincColumns = [];
       
       // Look for Biomarker/LOINC pairs starting from column E
       for (let i = 4; i < headers.length; i++) {
           const header = headers[i].toString().toLowerCase().trim();
           
           if (header.includes('biomarker')) {
               biomarkerColumns.push(i);
               console.log(`Found biomarker column at index ${i}: ${headers[i]}`);
           } else if (header.includes('loinc')) {
               loincColumns.push(i);
               console.log(`Found LOINC column at index ${i}: ${headers[i]}`);
           }
       }
       
       console.log(`Found ${biomarkerColumns.length} biomarker columns and ${loincColumns.length} LOINC columns`);
       
       // Process data rows (skip header row)
       for (let i = 1; i < labcorpData.length; i++) {
           const row = labcorpData[i];

           const backgroundColor = row[row.length - 1]?.toLowerCase() || ''; // The color appended in Apps Script

            let colorClass = 'green';
            let statusIcon = '';
            let tooltipText = '';

            switch (backgroundColor) {
            case '#ffffff': // all white means invalid
                colorClass = 'red';
                // statusIcon = '<img src="RedX.png" alt="X" class="status-icon-img red" />';
                // tooltipText = 'Incompatible Panel';
                break;
            case '#e6fff2':
                colorClass = 'yellow';
                // statusIcon = '<img src="YellowQuestion.png" alt="?" class="status-icon-img yellow" />';
                // tooltipText = 'Semi-Compatible Panel';
                break;
            case '#cdf9e4':
                colorClass = 'yellowgreen';
                statusIcon = '<img src="GreenCheck.png" alt="✔" class="status-icon-img green" />';
                tooltipText = 'Mostly Compatible Panel';
                break;
            case '#b7e1cd':
                colorClass = 'green';
                statusIcon = '<img src="GreenCheck.png" alt="✔" class="status-icon-img green" />';
                tooltipText = 'Fully Compatible Panel';
                break;
            default:
                if (backgroundColor.includes('ffffff')) {
                colorClass = 'red';
                // statusIcon = '<img src="RedX.png" alt="X" class="status-icon-img red" />';
                // tooltipText = 'Incompatible Panel';
                } else if (backgroundColor.includes('e6fff2')) {
                colorClass = 'yellow';
                // statusIcon = '<img src="YellowQuestion.png" alt="?" class="status-icon-img yellow" />';
                // tooltipText = 'Semi-Compatible Panel';
                } else if (backgroundColor.includes('cdf9e4')) {
                colorClass = 'yellowgreen';
                statusIcon = '<img src="GreenCheck.png" alt="✔" class="status-icon-img green" />';
                tooltipText = 'Mostly Compatible Panel';
                } else {
                colorClass = 'green';
                // statusIcon = '<img src="GreenCheck.png" alt="✔" class="status-icon-img green" />';
                // tooltipText = 'Fully Compatible Panel';
                }
            }
           
           if (row.length === 0) continue;
           
           const url = urlColumn >= 0 && row[urlColumn] ? row[urlColumn].toString().trim() : '';
           const panelName = nameColumn >= 0 && row[nameColumn] ? row[nameColumn].toString().trim() : '';
           const cpt = cptColumn >= 0 && row[cptColumn] ? row[cptColumn].toString().trim() : '';
           const testNumber = testNumberColumn >= 0 && row[testNumberColumn] ? row[testNumberColumn].toString().trim() : '';
           
           if (!panelName) continue;
           
           // Extract biomarkers and their LOINC codes
           const biomarkers = [];
           const biomarkerData = [];
           
           // Process biomarker columns
           for (let j = 0; j < biomarkerColumns.length; j++) {
               const biomarkerIndex = biomarkerColumns[j];
               const loincIndex = loincColumns[j]; // Corresponding LOINC column
               
               const biomarkerName = row[biomarkerIndex] ? row[biomarkerIndex].toString().trim() : '';
               const loincCode = loincIndex < row.length && row[loincIndex] ? row[loincIndex].toString().trim() : '';
               
               if (biomarkerName) {
                   biomarkers.push(biomarkerName);
                   biomarkerData.push({
                       name: biomarkerName,
                       loinc: loincCode,
                       rowIndex: i - 1, // Subtract 1 because we skip header row, so data row 1 becomes index 0
                       biomarkerColumnIndex: j * 2 // Biomarker columns are indexed by 2 (0, 2, 4, 6, etc.)
                   });
               }
           }
           
           // Create formatted biomarker display with click handlers
           const formattedBiomarkers = biomarkerData.map(biomarker => {
               // Get biomarker color to determine styling
               const rowColors = biomarkerColorMap.get(biomarker.rowIndex.toString());
               const biomarkerColor = rowColors ? rowColors[biomarker.biomarkerColumnIndex.toString()] : null;
               
               // Determine CSS class based on color
               let biomarkerClass = 'biomarker-clickable';
               if (biomarkerColor && biomarkerColor.toLowerCase() === '#d9d9d9') {
                   biomarkerClass += ' gray-biomarker';
               }
               
               let biomarkerHtml = `<span class="${biomarkerClass}" data-biomarker="${biomarker.name}" data-loinc="${biomarker.loinc}" data-row-index="${biomarker.rowIndex}" data-biomarker-column-index="${biomarker.biomarkerColumnIndex}">${biomarker.name}</span>`;
               
               // Add LOINC code if available
               if (biomarker.loinc) {
                   biomarkerHtml += ` <span class="biomarker-loinc">(LOINC: ${biomarker.loinc})</span>`;
               }
               
               return biomarkerHtml;
           });
           
           // Create content paragraph
           let paragraphContent = `
            <div class="panel-header">
                <span class="panel-label">PANEL</span>
                <h3>${panelName}</h3>
            </div>`;

           
           // Add URL as a hyperlink on the word "URL"
           if (url) {
               paragraphContent += `<p><strong>URL:</strong> <a href="${url}" target="_blank">View Panel Details</a></p>`;
           }
           
           if (cpt) {
               paragraphContent += `<p><strong>CPT Code:</strong> ${cpt}</p>`;
           }
           
           if (testNumber) {
               paragraphContent += `<p><strong>Test Number:</strong> ${testNumber}</p>`;
           }
           
           if (formattedBiomarkers.length > 0) {
            paragraphContent += `<p><strong>Biomarkers/Tests (${formattedBiomarkers.length}):</strong><br>${formattedBiomarkers.join('<br>')}</p>`;

               
               // Add expand/collapse buttons
               paragraphContent += `<div style="margin-top: 10px;">`;
               paragraphContent += `<button class="expand-all-button" onclick="expandAllBiomarkers(this.closest('.panel-container'))">Expand All Biomarkers</button>`;
               paragraphContent += `<button class="collapse-all-button" onclick="collapseAllBiomarkers(this.closest('.panel-container'))">Collapse All Biomarkers</button>`;
               paragraphContent += `</div>`;
           }

           
           contentData.push({
            keyword: panelName,
            paragraph: paragraphContent,
            url,
            cpt,
            testNumber,
            colorClass,
            statusIcon,
            tooltipText,
            biomarkers: biomarkers.map(b => b.toLowerCase()),
            biomarkerData
            });

       }
       
       // Sort panels by number of biomarkers, descending
        contentData.sort((a, b) => {
            const countA = a.biomarkers?.length || 0;
            const countB = b.biomarkers?.length || 0;
            return countB - countA;
        });

        console.log(`Created ${contentData.length} content entries`);
        return contentData;

   }

   // ADD this entire function:
    function initializeFuse() {
        // For panels: search by keyword (panel name)
        const panelOptions = {
            keys: ['keyword'],
            threshold: 0.1,
            includeScore: true
        };
        fusePanels = new Fuse(allContentData, panelOptions);
        console.log("Fuse for panels initialized.");

        // For biomarkers: search by biomarkerName + loinc (composite key)
        const biomarkerNamesArray = Array.from(biomarkerToPanelsMap.values()).map(b => ({
            biomarkerName: b.biomarkerName,
            loincCode: b.loincCode || '',
            originalKey: b.loincCode // <-- Use only the LOINC code as the key
        }));

        const biomarkerOptions = {
            keys: ['biomarkerName', 'loincCode'],
            threshold: 0.1,
            includeScore: true
        };
        fuseBiomarkers = new Fuse(biomarkerNamesArray, biomarkerOptions);
        console.log("Fuse for biomarkers initialized.");

        // For suggestions: uses a combination of panel and biomarker words
        const wordSuggestionOptions = {
            keys: ['word'], // Each item in allSuggestionWords will be mapped to { word: "the_word" }
            threshold: 0.3, // Looser threshold for suggestions/typos
            ignoreLocation: true, // Allows matching anywhere in the word, not just start
            minMatchCharLength: 2 // Minimum length for suggestions
        };
        fuseWordSuggestions = new Fuse(allSuggestionWords.map(word => ({ word: word })), wordSuggestionOptions);
        console.log("Fuse for word suggestions initialized.");
    }


    function getSuggestions(query) {
        let suggestions = new Set(); // Use a Set directly to handle uniqueness and automatically remove duplicates
        const searchMode = document.querySelector('input[name="searchMode"]:checked')?.value || 'all'; //get search mode
        
        // Get individual word suggestions
        const wordLevelSuggestions = fuseWordSuggestions.search(query, { limit: 10 }); // Adjust limit as needed
        wordLevelSuggestions.forEach(result => {
            suggestions.add(result.item.word);
        });

        // Add suggestions based on the selected search mode
            const panelNameSuggestions = fusePanels.search(query, { threshold: 0.4, limit: 10 }); // Adjust limit as needed
            panelNameSuggestions.forEach(result => {
            suggestions.add(result.item.keyword); // 'keyword' is the lowercase panel name
            });

        if (searchMode === 'all') {
            const biomarkerNameSuggestions = fuseBiomarkers.search(query, { threshold: 0.4, limit: 10 });
            biomarkerNameSuggestions.forEach(result => {
                suggestions.add(result.item.biomarkerName);
            });
        }

        let finalSuggestions = Array.from(suggestions);
        return finalSuggestions;
    }

    function hideSuggestions() {
        suggestionsDropdown.style.display = 'none';
        suggestionsDropdown.innerHTML = ''; // Clear content when hidden
    }

    function showSuggestions(suggestions) {
        suggestionsDropdown.innerHTML = ''; // Clear previous suggestions
        if (suggestions.length > 0) {
            suggestions.forEach(suggestion => {
                const suggestionItem = document.createElement('div');
                suggestionItem.classList.add('suggestion-item');
                suggestionItem.textContent = suggestion;
                suggestionItem.addEventListener('click', () => {
                    searchInput.value = suggestion; // Fill input with clicked suggestion
                    searchTriggeredFromDropdown = true; // Set flag
                    filterContent(); // Perform a full search
                    hideSuggestions(); // Hide suggestions
                });
                suggestionsDropdown.appendChild(suggestionItem);
            });
            suggestionsDropdown.style.display = 'block'; // Show the dropdown
        } else {
            hideSuggestions(); // Hide if no suggestions
        }
    }


   // Helper function to find column index
   function findColumnIndex(headers, possibleNames) {
       for (let i = 0; i < headers.length; i++) {
           const header = headers[i].toString().toLowerCase().trim();
           if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
               return i;
           }
       }
       return -1;
   }

   // Helper function to parse biomarkers list
   function parseBiomarkersList(text) {
       if (!text) return [];
       
       const biomarkers = text
           .split(/[,;|\n\r]+/)
           .map(item => item.trim())
           .filter(item => item.length > 0);
       
       return biomarkers;
   }

window.togglePanelList = function(panelListId, headerElement) {
    const panelList = document.getElementById(panelListId);
    const isVisible = panelList.style.display === 'block';

    panelList.style.display = isVisible ? 'none' : 'block';

    const arrow = headerElement.querySelector('.panel-toggle-arrow');
    if (arrow) {
        arrow.textContent = isVisible ? '▼' : '▲';
    }
};



// Global variable to store biomarker-to-panels mapping
let biomarkerToPanelsMap = new Map();

// Build biomarker-to-panels mapping from existing data
function buildBiomarkerToPanelsMap() {
    biomarkerToPanelsMap.clear();

    allContentData.forEach((panelData, panelIndex) => {
        if (panelData.biomarkerData && panelData.biomarkerData.length > 0) {
            panelData.biomarkerData.forEach(biomarker => {
                // Use only the LOINC code as the key
                const biomarkerKey = biomarker.loinc;

                // Check if the LOINC code already exists in the map
                if (!biomarkerToPanelsMap.has(biomarkerKey)) {
                    biomarkerToPanelsMap.set(biomarkerKey, {
                        biomarkerName: biomarker.name,
                        loincCode: biomarker.loinc,
                        panels: []
                    });
                }
                
                // Push the panel data to the corresponding LOINC code entry
                biomarkerToPanelsMap.get(biomarkerKey).panels.push({ panelIndex, panelData });
            });
        }
    });
    
    console.log(`Built biomarker-to-panels mapping for ${biomarkerToPanelsMap.size} unique LOINC codes`);
}

// Find matching biomarkers for a query
function findMatchingBiomarkers(query) {
    const lowerQuery = query.toLowerCase();
    const matchingBiomarkers = [];
    
    for (let [biomarkerKey, biomarkerInfo] of biomarkerToPanelsMap) {
        if (biomarkerKey.includes(lowerQuery) || biomarkerInfo.biomarkerName.toLowerCase().includes(lowerQuery)) {
            matchingBiomarkers.push(biomarkerInfo);
        }
    }
    
    return matchingBiomarkers;
}

// Create biomarker result display
function createBiomarkerResult(biomarkerInfo, index) {
    const biomarkerContainer = document.createElement('div');
    biomarkerContainer.classList.add('biomarker-result-container');
    biomarkerContainer.id = `biomarker-result-${index}`;
    
    // Get additional biomarker details from biomarkerUrlMap
    const assayKey = makeBiomarkerKey(biomarkerInfo.biomarkerName, biomarkerInfo.loincCode);
    let additionalInfo = biomarkerUrlMap.get(assayKey);
        additionalInfo = verifyCalculationAssayType(additionalInfo, biomarkerInfo.loincCode);
    
    let biomarkerContent = `
        <div class="search-result-header biomarker-header">
            <span class="result-type-label biomarker-label"> BIOMARKER</span>
            <h3 class="result-title">${biomarkerInfo.biomarkerName}</h3>
        </div>
        
        <div class="biomarker-details-summary">
    `;
    
    // Add LOINC code if available
    if (biomarkerInfo.loincCode) {
        biomarkerContent += `
            <div class="detail-item-inline">
                <span class="detail-label">LOINC:</span>
                <span class="detail-value">${biomarkerInfo.loincCode}</span>
            </div>
        `;
    }
    
    // Add additional info from biomarkerUrlMap
    if (additionalInfo) {
        if (additionalInfo.description) {
            biomarkerContent += `
                <div class="detail-item-inline">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">${additionalInfo.description}</span>
                </div>
            `;
        }
        
        // Check if biomarker is gray and get biomarker type
        const biomarkerName = biomarkerInfo.biomarkerName;
        const loincCode = biomarkerInfo.loincCode;
        
        // Check if biomarker is gray (#d9d9d9)
        const rowColors = biomarkerColorMap.get(biomarkerInfo.rowIndex?.toString());
        const biomarkerColor = rowColors ? rowColors[biomarkerInfo.biomarkerColumnIndex?.toString()] : null;
        const isGrayBiomarker = biomarkerColor && biomarkerColor.toLowerCase() === '#d9d9d9';
        
        // Get biomarker type from pureBiomarkerData
        let biomarkerType = getBiomarkerTypeFromPureData(biomarkerName, loincCode);
        
        // Override biomarker type to "Description" if biomarker is gray
        if (isGrayBiomarker) {
            biomarkerType = 'Description';
        }
        
        if (biomarkerType === 'Calculation') {
            // Use existing associated biomarkers if available, otherwise get from calculationData
            let associatedBiomarkers = [];
            if (additionalInfo && additionalInfo.associatedBiomarkers && additionalInfo.associatedBiomarkers.length > 0) {
                associatedBiomarkers = additionalInfo.associatedBiomarkers;
            } else {
                associatedBiomarkers = getAssociatedBiomarkersForCalculation(biomarkerName, loincCode);
            }
            
            if (associatedBiomarkers && associatedBiomarkers.length > 0) {
                const associatedCount = associatedBiomarkers.length;
                biomarkerContent += `
                    <div class="detail-item-inline">
                        <span class="detail-label">Associated Biomarkers (${associatedCount}):</span>
                        <div class="detail-value">
                            <ul class="associated-biomarkers-list" style="margin: 5px 0; font-size: 14px;">`;
                
                associatedBiomarkers.forEach(associated => {
                    biomarkerContent += `
                                <li>
                                    <span class="associated-biomarker-name associated-biomarker-clickable" onclick="window.openPanelInNewTab('${associated.name}')">${associated.name}</span> 
                                    <span class="associated-biomarker-loinc">(LOINC: ${associated.loinc})</span>
                                </li>`;
                });
                
                biomarkerContent += `
                            </ul>
                        </div>
                    </div>
                `;
            }
        } else if (additionalInfo && additionalInfo.assayType) {
            // Show regular assay type for non-calculation biomarkers
            biomarkerContent += `
                <div class="detail-item-inline">
                    <span class="detail-label">Assay Type:</span>
                    <span class="detail-value">${additionalInfo.assayType}</span>
                </div>
            `;
        }
    }
    
    biomarkerContent += `
        </div>
        
        <div class="biomarker-expand-section">
            <button class="biomarker-expand-btn" onclick="toggleBiomarkerExpansion(${index})">
                <span id="expand-text-${index}">Show Details & Panels (${biomarkerInfo.panels.length})</span>
                <span id="expand-icon-${index}"></span>
            </button>
        </div>
        
        <div class="biomarker-expanded-content" id="biomarker-expanded-${index}" style="display: none;">
            <div class="biomarker-full-details">
                <h4>Complete Biomarker Information</h4>
    `;
    
    // Add full biomarker details
    biomarkerContent += `
                <div class="detail-item">
                    <span class="detail-label">Biomarker Name:</span>
                    <span class="detail-value">${biomarkerInfo.biomarkerName}</span>
                </div>
    `;
    
    if (biomarkerInfo.loincCode) {
        biomarkerContent += `
                <div class="detail-item">
                    <span class="detail-label">LOINC Code:</span>
                    <span class="detail-value">${biomarkerInfo.loincCode}</span>
                </div>
        `;
    }
    
    if (additionalInfo) {
        if (additionalInfo.description) {
            biomarkerContent += `
                <div class="detail-item">
                    <span class="detail-label">LOINC Name:</span>
                    <span class="detail-value">${additionalInfo.description}</span>
                </div>
            `;
        }
        
        // Get biomarker type from pureBiomarkerData (biomarkerName and loincCode already defined above)
        let biomarkerType = getBiomarkerTypeFromPureData(biomarkerName, loincCode);
        
        // Override biomarker type to "Description" if biomarker is gray
        if (isGrayBiomarker) {
            biomarkerType = 'Description';
        }
        
        if (biomarkerType === 'Calculation') {
            // Use existing associated biomarkers if available, otherwise get from calculationData
            let associatedBiomarkers = [];
            if (additionalInfo && additionalInfo.associatedBiomarkers && additionalInfo.associatedBiomarkers.length > 0) {
                associatedBiomarkers = additionalInfo.associatedBiomarkers;
            } else {
                associatedBiomarkers = getAssociatedBiomarkersForCalculation(biomarkerName, loincCode);
            }
            
            if (associatedBiomarkers && associatedBiomarkers.length > 0) {
                const associatedCount = associatedBiomarkers.length;
                biomarkerContent += `
                    <div class="detail-item">
                        <span class="detail-label">Associated Biomarkers (${associatedCount}):</span>
                        <div class="detail-value">
                            <ul class="associated-biomarkers-list">`;
                
                associatedBiomarkers.forEach(associated => {
                    biomarkerContent += `
                                <li>
                                    <span class="associated-biomarker-name associated-biomarker-clickable" onclick="window.openPanelInNewTab('${associated.name}')">${associated.name}</span> 
                                    <span class="associated-biomarker-loinc">(LOINC: ${associated.loinc})</span>
                                </li>`;
                });
                
                biomarkerContent += `
                            </ul>
                        </div>
                    </div>
                `;
            }
        } else if (additionalInfo && additionalInfo.assayType) {
            // Show regular assay type for non-calculation biomarkers
            biomarkerContent += `
                <div class="detail-item">
                    <span class="detail-label">Assay Type:</span>
                    <span class="detail-value">${additionalInfo.assayType}</span>
                </div>
            `;
        }
        
        if (additionalInfo.kitUrl) {
            biomarkerContent += `
                <div class="detail-item">
                    <span class="detail-label">Kit URL:</span>
                    <span class="detail-value"><a href="${additionalInfo.kitUrl}" target="_blank" class="detail-link">View Kit Details</a></span>
                </div>
            `;
        }
    }
    
    biomarkerContent += `
            </div>
            
            <div class="panels-using-biomarker">
                <h4>Panels Using This Biomarker (${biomarkerInfo.panels.length})</h4>
                <div class="panels-list">
    `;
    
    // Add panels that use this biomarker
    biomarkerInfo.panels.forEach((panelRef, panelIndex) => {
        const panelData = panelRef.panelData;
        biomarkerContent += `
            <div class="panel-in-biomarker-view" data-panel-index="${panelRef.panelIndex}">
                <div class="panel-name-clickable" onclick="togglePanelInBiomarkerView(${panelRef.panelIndex}, this)">
                    <span class="mini-panel-label"> PANEL</span>
                    <span class="panel-name">${panelData.keyword}</span>

                </div>
                <div class="panel-quick-info">
                    ${panelData.cpt ? `CPT: ${panelData.cpt}` : ''}${panelData.cpt && panelData.testNumber ? ' | ' : ''}${panelData.testNumber ? `Test #: ${panelData.testNumber}` : ''}${(panelData.cpt || panelData.testNumber) && panelData.biomarkers ? ' | ' : ''}${panelData.biomarkers ? `${panelData.biomarkers.length} biomarkers` : ''}<span class="biomarker-panel-status">${panelData.statusIcon || ''}<div class="panel-tooltip">${panelData.tooltipText || ''}</div></span>
                </div>
                <div class="panel-expanded-content" id="expanded-panel-${panelRef.panelIndex}-${index}" style="display: none;">
                    <!-- Panel details will be inserted here when expanded -->
                </div>
            </div>
        `;
    });
    
    biomarkerContent += `
                </div>
            </div>
        </div>
    `;
    
    biomarkerContainer.innerHTML = biomarkerContent;
    return biomarkerContainer;
}

// Toggle biomarker expansion
function toggleBiomarkerExpansion(index) {
    const expandedContent = document.getElementById(`biomarker-expanded-${index}`);
    const expandText = document.getElementById(`expand-text-${index}`);
    const expandIcon = document.getElementById(`expand-icon-${index}`);
    
    if (expandedContent.style.display === 'none') {
        expandedContent.style.display = 'block';
        expandText.textContent = expandText.textContent.replace('Show', 'Hide');
        // expandIcon.textContent = '[-]'; // for visual purposes if we want
    } else {
        expandedContent.style.display = 'none';
        expandText.textContent = expandText.textContent.replace('Hide', 'Show');
        // expandIcon.textContent = '[+]'; // for visual purposes if we want
    }
}

// Toggle panel details in biomarker view
function togglePanelInBiomarkerView(panelIndex, clickedElement) {
    const biomarkerIndex = clickedElement.closest('.biomarker-result-container').id.split('-')[2];
    const expandedContent = document.getElementById(`expanded-panel-${panelIndex}-${biomarkerIndex}`);
    const panelData = allContentData[panelIndex];
    
    if (expandedContent.style.display === 'none' || expandedContent.style.display === '') {
        // Expand the panel
        expandedContent.style.display = 'block';
        clickedElement.style.backgroundColor = '#e8f5e8';
        
        // Create panel content if not already created
        if (expandedContent.innerHTML === '') {
            let panelContent = `
                <div class="expanded-panel-details">
                    <div class="panel-info-section">
                        <h5>Panel Information</h5>
            `;
            
            if (panelData.url) {
                panelContent += `
                    <div class="detail-item">
                        <span class="detail-label">URL:</span>
                        <span class="detail-value"><a href="${panelData.url}" target="_blank" class="detail-link">View Panel Details</a></span>
                    </div>
                `;
            }
            
            if (panelData.cpt) {
                panelContent += `
                    <div class="detail-item">
                        <span class="detail-label">CPT Code:</span>
                        <span class="detail-value">${panelData.cpt}</span>
                    </div>
                `;
            }
            
            if (panelData.testNumber) {
                panelContent += `
                    <div class="detail-item">
                        <span class="detail-label">Test Number:</span>
                        <span class="detail-value">${panelData.testNumber}</span>
                    </div>
                `;
            }
            
            panelContent += `
                    </div>
                    
                    <div class="all-biomarkers-section">
                        <h5>All Biomarkers in This Panel (${panelData.biomarkerData ? panelData.biomarkerData.length : 0})</h5>
                        <div class="biomarkers-grid">
            `;
            
            // Add all biomarkers in this panel
            if (panelData.biomarkerData && panelData.biomarkerData.length > 0) {
                panelData.biomarkerData.forEach(biomarker => {
                    panelContent += `
                        <div class="biomarker-item-in-panel">
                            <span class="biomarker-name">${biomarker.name}</span>
                            ${biomarker.loinc ? `<span class="biomarker-loinc">(${biomarker.loinc})</span>` : ''}
                        </div>
                    `;
                });
            }
            
            panelContent += `
                        </div>
                    </div>
                </div>
            `;
            
            expandedContent.innerHTML = panelContent;
        }
    } else {
        // Collapse the panel
        expandedContent.style.display = 'none';
        clickedElement.style.backgroundColor = '';
    }
}

// Add styles for biomarker search results
function addBiomarkerSearchStyles() {
    const biomarkerStyles = `
        <style>
            .biomarker-result-container {
                background: #f0f8ff;
                border: 2px solid #4a90e2;
                border-radius: 10px;
                padding: 20px;
                margin: 15px 0;
                box-shadow: 0 3px 10px rgba(74, 144, 226, 0.2);
            }
            
            .search-result-header {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #e0e0e0;
            }
            
            .result-type-label {
                font-size: 11px;
                font-weight: bold;
                padding: 4px 8px;
                border-radius: 12px;
                margin-right: 15px;
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .biomarker-label {
                background: #4a90e2;
            }
            
            .panel-header .result-type-label {
                background: #28a745;
            }
            
            .result-title {
                margin: 0;
                font-size: 1.4em;
                color: #333;
            }
            
            .biomarker-details-summary {
                margin-bottom: 15px;
            }
            
            .detail-item-inline {
                display: inline-block;
                margin-right: 20px;
                margin-bottom: 8px;
                font-size: 0.9em;
            }
            
            .detail-item-inline .detail-label {
                font-weight: bold;
                color: #555;
                margin-right: 5px;
            }
            
            .biomarker-expand-section {
                margin-top: 15px;
            }
            
            .biomarker-expand-btn {
                background: #4a90e2;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .biomarker-expand-btn:hover {
                background: #357abd;
                transform: translateY(-2px);
            }
            
            .biomarker-expanded-content {
                margin-top: 20px;
                padding: 20px;
                background: white;
                border-radius: 8px;
                border: 1px solid #ddd;
            }
            
            .biomarker-full-details {
                margin-bottom: 25px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 6px;
                border-left: 4px solid #4a90e2;
            }
            
            .biomarker-full-details h4 {
                margin-top: 0;
                color: #4a90e2;
            }
            
            .panels-using-biomarker {
                padding: 15px;
                background: #f0f8f0;
                border-radius: 6px;
                border-left: 4px solid #28a745;
            }
            
            .panels-using-biomarker h4 {
                margin-top: 0;
                color: #28a745;
            }
            
            .panel-in-biomarker-view {
                border: 1px solid #ddd;
                border-radius: 6px;
                margin-bottom: 10px;
                padding: 15px;
                background: white;
                transition: all 0.3s ease;
            }
            
            .panel-in-biomarker-view:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .panel-name-clickable {
                cursor: pointer;
                display: flex;
                align-items: center;
                margin-bottom: 5px;
                padding: 5px;
                border-radius: 4px;
                transition: background-color 0.3s ease;
            }
            
            .panel-name-clickable:hover {
                background-color: #e8f5e8;
            }
            
            .mini-panel-label {
                font-size: 9px;
                font-weight: bold;
                background: #28a745;
                color: white;
                padding: 2px 6px;
                border-radius: 8px;
                margin-right: 10px;
                text-transform: uppercase;
            }
            
            .panel-name {
                font-weight: bold;
                color: #333;
            }
            
            .panel-quick-info {
                font-size: 0.85em;
                color: #666;
                margin-left: 25px;
            }
            
            .expanded-panel-details {
                margin-top: 15px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #dee2e6;
            }
            
            .panel-info-section, .all-biomarkers-section {
                margin-bottom: 20px;
            }
            
            .panel-info-section h5, .all-biomarkers-section h5 {
                margin-top: 0;
                margin-bottom: 10px;
                color: #333;
                font-size: 1.1em;
            }
            
            .biomarkers-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
            }
            
            .biomarker-item-in-panel {
                background: #e9ecef;
                padding: 6px 12px;
                border-radius: 15px;
                font-size: 0.85em;
                border: 1px solid #dee2e6;
            }
            
            .biomarker-loinc {
                color: #666;
                font-size: 0.9em;
                margin-left: 5px;
            }
            
            /* Enhanced panel styling consolidated with main .panel-container definition */
            
            /* .panel-container .panel-content h3 styles consolidated with earlier definition */
            
            .panel-container .panel-content h3:before {
                content: none !important;
                display: none !important;
            }
            
            .content-paragraph:not(.hide) {
                display: block;
            }
            
            .search-results-summary {
                background: #e9ecef;
                padding: 10px 15px;
                border-radius: 6px;
                margin-bottom: 20px;
                font-size: 0.9em;
                color: #666;
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', biomarkerStyles);
}

// Function to filter panels only.
function filterPanelsAndBiomarkers() {
    const query = searchInput.value.trim();
    const lowerQuery = query.toLowerCase();
    const allParagraphs = paragraphContainer.querySelectorAll('.content-paragraph');

    // Remove old search messages and homepage
    document.querySelectorAll('.biomarker-result-container, #search-results-summary, #noResultsMessage, .suggestion-message')
        .forEach(el => el.remove());
    hideHomepage();

    if (lowerQuery === '') {
        allParagraphs.forEach(p => p.classList.add('hide'));
        showHomepage();
        return;
    }

    // Handle special cases for BMP and CMP
    if (lowerQuery === 'bmp') {
        allParagraphs.forEach(p => p.classList.add('hide'));
        const bmpPanel = document.querySelector('[data-keyword="Metabolic Panel (8), Basic"]');
        if (bmpPanel) bmpPanel.classList.remove('hide');
        return;
    }
    if (lowerQuery === 'cmp') {
        allParagraphs.forEach(p => p.classList.add('hide'));
        const cmpPanel = document.querySelector('[data-keyword="Metabolic Panel (14), Comprehensive"]');
        if (cmpPanel) cmpPanel.classList.remove('hide');
        return;
    }

    if (!fusePanels) {
        console.warn("Fuse.js is not initialized yet. Cannot perform search.");
        const noResultsDiv = document.createElement('div');
        noResultsDiv.id = 'noResultsMessage';
        noResultsDiv.innerHTML = `<p style="text-align: center; color: red; font-style: italic;">Search is not ready. Please wait for data to load or refresh.</p>`;
        paragraphContainer.appendChild(noResultsDiv);
        return;
    }

    const searchThreshold = searchTriggeredFromDropdown ? 0.2 : 0.1;
    const searchFusePanels = new Fuse(allContentData, {
        keys: ['keyword', 'cpt', 'testNumber'],
        threshold: searchThreshold,
        includeScore: true,
        ignoreLocation: true,
        findAllMatches: true
    });
    const panelResults = searchFusePanels.search(lowerQuery);

    // Hide all panels first, then show the ones that match.
    allParagraphs.forEach(p => p.classList.add('hide'));

    let found = false;
    panelResults.forEach(result => {
        const panelElement = document.querySelector(`[data-keyword="${result.item.keyword}"]`);
        if (panelElement) {
            panelElement.classList.remove('hide');
            found = true;
        }
    });

    if (!found && !searchTriggeredFromDropdown) {
        const suggestions = getSuggestions(lowerQuery);
        const noResultsDiv = document.createElement('div');
        noResultsDiv.id = 'noResultsMessage';
        noResultsDiv.className = 'suggestion-message';
        if (suggestions.length > 0) {
            let suggestionHtml = `<p>No direct panel results found for "<strong>${query}</strong>".</p>`;
            suggestionHtml += `<p>Did you mean: ${suggestions.map(term => `<a href="#" onclick="searchInput.value = '${term}'; filterContent(); return false;">${term}</a>`).join(', ')}?</p>`;
            noResultsDiv.innerHTML = suggestionHtml;
        } else {
            noResultsDiv.innerHTML = `<p style="text-align: center; color: #666; font-style: italic;">No matching panel results for "${query}"</p>`;
        }
        paragraphContainer.appendChild(noResultsDiv);
    }
    clearSearchHighlights();
    applySearchHighlights(query); // highlight in panel titles and biomarker chips

}

function renderBiomarkerAsPanel(biomarkerInfo, index) {
    const loincCode = biomarkerInfo.loincCode;
    const compKey = makeBiomarkerKey(biomarkerInfo.biomarkerName, loincCode); // Still needed for biomarkerUrlMap
    let additionalInfo = biomarkerUrlMap.get(compKey);
    // Get the list of panels this biomarker is in using the new LOINC-only key
    const panelsInBiomarker = biomarkerToPanelsMap.get(loincCode)?.panels || [];

    const panelWrapper = document.createElement('div');
    panelWrapper.classList.add('panel-wrapper');
    
    const panelContainer = document.createElement('div');
    panelContainer.classList.add('panel-container', 'content-paragraph', 'biomarker-search-result');
    panelContainer.id = `biomarker-panel-${index}`; // Use a unique ID
    panelWrapper.appendChild(panelContainer);

    // Left side: panel-content
    const panelContent = document.createElement('div');
    panelContent.classList.add('panel-content');
    
    // Header for the biomarker panel with the toggle behavior
    let panelContentHtml = `
        <div class="panel-header" onclick="this.closest('.panel-container').classList.toggle('panel-expanded')">
            <span class="panel-label biomarker-label-panel">BIOMARKER</span>
            <h3 class="panel-title">${biomarkerInfo.biomarkerName}</h3>
        </div>
        <p><strong>LOINC Code:</strong> <a href="https://loinc.org/${biomarkerInfo.loincCode}" target="_blank">${biomarkerInfo.loincCode}</a></p>
        <p><strong>Associated Panels:</strong> ${panelsInBiomarker.length}</p>
    `;
    
    // Add expand/collapse buttons for the panels list
    if (panelsInBiomarker.length > 0) {
        panelContentHtml += `<div style="margin-top: 10px;">`;
        panelContentHtml += `<button class="expand-all-button" onclick="expandAllPanels(this.closest('.panel-container'))">Expand All Panels</button>`;
        panelContentHtml += `<button class="collapse-all-button" onclick="collapseAllPanels(this.closest('.panel-container'))">Collapse All Panels</button>`;
        panelContentHtml += `</div>`;
    }

    panelContent.innerHTML = panelContentHtml;
    panelContainer.appendChild(panelContent);

    // Right side: biomarker-details-container (the expandable section)
    const detailsContainer = document.createElement('div');
    detailsContainer.classList.add('biomarker-details-container');
    
    // This is the key change: create the content inside the details container
    // for the associated panels, with toggle functionality for each panel
    if (panelsInBiomarker.length > 0) {
        let detailsHtml = '<h4>Associated Panels</h4><ul class="associated-panels-biomarker-list">';
        panelsInBiomarker.forEach(panelRef => {
            const panelData = panelRef.panelData;
            detailsHtml += `
                <li class="associated-panel-container">
                    <div class="associated-panel-content" onclick="toggleAssociatedPanel(this, '${panelData.keyword}')">
                        <div class="associated-panel-header">
                            <span class="associated-panel-label">PANEL</span>
                            <span class="associated-panel-title">${panelData.keyword}</span>
                            <img src="open-tab.png" class="open-new-tab-icon" title="Open in new tab" onclick="event.stopPropagation(); window.openPanelInNewTab('${encodeURIComponent(panelData.keyword)}')"/>
                        </div>
                    </div>
                </li>
            `;
        });
        detailsHtml += '</ul>';
        detailsContainer.innerHTML = detailsHtml;
    } else {
        detailsContainer.innerHTML = '<p>No associated panels found.</p>';
    }

    panelContainer.appendChild(detailsContainer);
    paragraphContainer.appendChild(panelWrapper);
}

function filterBiomarkersOnly() {
    const query = searchInput.value.trim();
    const lowerQuery = query.toLowerCase();

    // Clear all previous results and messages.
    document.querySelectorAll('.panel-container, #search-results-summary, #noResultsMessage, .suggestion-message, .biomarker-result-container')
        .forEach(el => el.remove());
    hideHomepage();

    if (lowerQuery === '') {
        showHomepage();
        return;
    }

    if (!fuseBiomarkers) {
        console.warn("Fuse.js for biomarkers is not initialized yet. Cannot perform search.");
        const noResultsDiv = document.createElement('div');
        noResultsDiv.id = 'noResultsMessage';
        noResultsDiv.innerHTML = `<p style="text-align: center; color: red; font-style: italic;">Search is not ready. Please wait for data to load or refresh.</p>`;
        paragraphContainer.appendChild(noResultsDiv);
        return;
    }

    const searchThreshold = searchTriggeredFromDropdown ? 0.2 : 0.1;
    const biomarkerResults = fuseBiomarkers.search(lowerQuery, {
        threshold: searchThreshold,
        includeScore: true
    });

    const matchingBiomarkers = biomarkerResults.map(result => result.item);

    if (matchingBiomarkers.length > 0) {
        const resultsSummary = document.createElement('div');
        resultsSummary.id = 'search-results-summary';
        resultsSummary.className = 'search-results-summary';
        paragraphContainer.appendChild(resultsSummary);

        matchingBiomarkers.forEach((biomarkerInfo, index) => {
            // The biomarkerInfo object from Fuse.js already has the loincCode, which is now the key.
            const compKey = biomarkerInfo.loincCode;
            const panels = biomarkerToPanelsMap.get(compKey)?.panels || [];

            let additionalInfo = biomarkerUrlMap.get(compKey);
            additionalInfo = verifyCalculationAssayType(additionalInfo, biomarkerInfo.loincCode);
            
            // Get biomarker type
            let biomarkerType = getBiomarkerTypeFromPureData(biomarkerInfo.biomarkerName, biomarkerInfo.loincCode);
            const isGrayBiomarker = biomarkerColorMap.get(biomarkerInfo.rowIndex?.toString())?.[biomarkerInfo.biomarkerColumnIndex?.toString()]?.toLowerCase() === '#d9d9d9';
            if (isGrayBiomarker) {
                biomarkerType = 'Description';
            }

            // Create the outer wrapper and panel container
            const panelWrapper = document.createElement('div');
            panelWrapper.classList.add('panel-wrapper');
            const panelContainer = document.createElement('div');
            
            // Use the base panel classes for consistent styling
            panelContainer.classList.add('panel-container', 'content-paragraph', 'biomarker-search-result');
            panelContainer.id = `biomarker-panel-${index}`; // Assign a unique ID
            panelWrapper.appendChild(panelContainer);

            // Left side: panel-content
            const panelContent = document.createElement('div');
            panelContent.classList.add('panel-content');
            
            let panelContentHtml = `
                <div class="panel-header" onclick="this.closest('.panel-container').classList.toggle('panel-expanded')">
                    <span class="panel-label biomarker-label-panel">BIOMARKER</span>
                    <h3 class="panel-title">${biomarkerInfo.biomarkerName}</h3>
                </div>
                <p><strong>LOINC Code:</strong> <a href="https://loinc.org/${biomarkerInfo.loincCode}" target="_blank">${biomarkerInfo.loincCode}</a></p>
                <p><strong>LOINC Name:</strong> ${additionalInfo?.description || 'N/A'}</p>
                <p><strong>Biomarker Type:</strong> ${biomarkerType || 'N/A'}</p>
                <p><strong>Assay Type:</strong> ${additionalInfo?.assayType || 'N/A'}</p>
                <p><strong>Assay Vendor:</strong> ${additionalInfo?.vendor || 'N/A'}</p>
                <p><strong>Catalog Number:</strong> ${additionalInfo?.catalog || 'N/A'}</p>
                <p><strong>Kit URL:</strong> ${additionalInfo?.kitUrl ? `<a href="${additionalInfo.kitUrl}" target="_blank">View Kit Details</a>` : 'N/A'}</p>
                <div style="margin-top: 10px;">
                    <button class="expand-all-button" onclick="expandAllPanels(this.closest('.panel-container'))">Expand All Panels</button>
                    <button class="collapse-all-button" onclick="collapseAllPanels(this.closest('.panel-container'))">Collapse All Panels</button>
                </div>
            `;

            panelContent.innerHTML = panelContentHtml;
            panelContainer.appendChild(panelContent);

            // Right side: biomarker-details-container (the expandable section)
            const detailsContainer = document.createElement('div');
            detailsContainer.classList.add('biomarker-details-container');
            let detailsHtml = ''; // Remove the 'Associated Panels' title from here

            if (panels.length > 0) {
                const uniquePanels = new Set();
                detailsHtml += '<ul class="associated-panels-biomarker-list">';
                panels.forEach(panelRef => {
                    const panelData = panelRef.panelData;
                    if (!uniquePanels.has(panelData.keyword)) {
                        uniquePanels.add(panelData.keyword);
                        detailsHtml += `
                            <li class="associated-panel-container">
                                <div class="associated-panel-content" onclick="toggleAssociatedPanel(this, '${panelData.keyword.replace(/'/g, "\\'")}')">
                                    <div class="associated-panel-header">
                                        <span class="associated-panel-label">PANEL</span>
                                        <span class="associated-panel-title">${panelData.keyword}</span>
                                        <img src="open-tab.png"
                                            class="open-new-tab-icon"
                                            title="Open in new tab"
                                            onclick="event.stopPropagation(); window.openPanelInNewTab('${encodeURIComponent(panelData.keyword)}')"/>
                                    </div>
                                    <div class="associated-panel-meta">
                                        ${panelData.cpt ? `CPT: ${panelData.cpt}` : ''}${panelData.cpt && panelData.testNumber ? ' | ' : ''}${panelData.testNumber ? `Test #: ${panelData.testNumber}` : ''}
                                    </div>
                                    <div class="associated-panel-details" style="display:none;"></div>
                                </div>
                            </li>
                        `;

                    }
                });
                detailsHtml += '</ul>';
            } else {
                detailsHtml += '<p>No associated panels found.</p>';
            }

            detailsContainer.innerHTML = detailsHtml;
            panelContainer.appendChild(detailsContainer);

            paragraphContainer.appendChild(panelWrapper);
        });
    } else {
        const noResultsDiv = document.createElement('div');
        noResultsDiv.id = 'noResultsMessage';
        noResultsDiv.innerHTML = `<p style="text-align: center; color: #666; font-style: italic;">No matching biomarker results found for "${query}"</p>`;
        paragraphContainer.appendChild(noResultsDiv);
    }
    clearSearchHighlights();
    applySearchHighlights(query);

}


// Make functions globally available
window.toggleBiomarkerExpansion = toggleBiomarkerExpansion;
window.togglePanelInBiomarkerView = togglePanelInBiomarkerView;

// Initialize biomarker search functionality
function initializeBiomarkerSearch() {
    // Add styles
    addBiomarkerSearchStyles();

    // Build biomarker mapping
    buildBiomarkerToPanelsMap();

    // Register toggle behavior
    const checkboxAll = document.getElementById('searchModeAll');
    const checkboxPanels = document.getElementById('searchModePanels');

    // Use selected radio button to determine mode - this is handled by the main filterContent function now

}


// Call this function after your existing loadContent() completes successfully
// Add this to your existing renderInitialParagraphs function at the end:
// initializeBiomarkerSearch();

    window.filterContent = function () {
    const query = searchInput.value.trim();
    const lowerQuery = query.toLowerCase();
    const searchMode = document.querySelector('input[name="searchMode"]:checked')?.value || 'all';

    // 1. Clear previous search results and messages
    document.querySelectorAll('.panel-container, .biomarker-result-container, #search-results-summary, #noResultsMessage, .suggestion-message')
        .forEach(el => el.remove());
    hideSuggestions();
    hideHomepage();

    // 2. Re-render the initial panel list before filtering.
    // This is the key step to make sure the panels exist for the other search modes.
    if (searchMode === 'panels') {
        renderInitialParagraphs();
    }

    // 3. Handle empty query
    if (lowerQuery === '') {
        showHomepage();
        return;
    }

    // 4. Handle search mode routing
    if (searchMode === 'panels') {
        filterContentWithBiomarkersEnhanced(lowerQuery);
    } else if (searchMode === 'biomarkers') {
        filterBiomarkersOnly();
    }
    
    searchTriggeredFromDropdown = false;
};

// Enhanced function to search both panels and biomarkers using Fuse.js
// Enhanced function to search both panels and biomarkers using Fuse.js
function filterContentWithBiomarkersEnhanced(lowerQuery) {
    document.querySelectorAll('.biomarker-result-container, #search-results-summary, #noResultsMessage, .suggestion-message')
        .forEach(el => el.remove());
    hideHomepage();

    if (lowerQuery === 'bmp') {
        paragraphContainer.querySelectorAll('.content-paragraph').forEach(p => p.classList.add('hide'));
        const bmpPanel = document.querySelector('[data-keyword="Metabolic Panel (8), Basic"]');
        if (bmpPanel) bmpPanel.classList.remove('hide');
        return;
    }
    if (lowerQuery === 'cmp') {
        paragraphContainer.querySelectorAll('.content-paragraph').forEach(p => p.classList.add('hide'));
        const cmpPanel = document.querySelector('[data-keyword="Metabolic Panel (14), Comprehensive"]');
        if (cmpPanel) cmpPanel.classList.remove('hide');
        return;
    }
    
    let foundDirectMatches = [];
    const searchThreshold = searchTriggeredFromDropdown ? 0.2 : 0.1;

    // Search for panels directly
    const searchFusePanels = new Fuse(allContentData, {
        keys: ['keyword', 'cpt', 'testNumber'],
        threshold: searchThreshold,
        includeScore: true,
        ignoreLocation: true,
        findAllMatches: true
    });
    const panelResults = searchFusePanels.search(lowerQuery);

    // Search for matching biomarkers
    const biomarkerNamesArrayForSearch = Array.from(biomarkerToPanelsMap.values()).map(b => {
        const compKey = makeBiomarkerKey(b.biomarkerName, b.loincCode); // composite
        let biomarkerInfo = biomarkerUrlMap.get(compKey);
        biomarkerInfo = verifyCalculationAssayType(biomarkerInfo, b.loincCode);
        return {
            biomarkerName: b.biomarkerName,
            originalKey: compKey, // <-- composite
            loincCode: b.loincCode,
            description: biomarkerInfo?.description || '',
            assayType: biomarkerInfo?.assayType || ''
        };
    });
    const searchFuseBiomarkers = new Fuse(biomarkerNamesArrayForSearch, {
        keys: ['biomarkerName', 'loincCode', 'description', 'assayType'],
        threshold: searchThreshold,
        includeScore: true,
        ignoreLocation: true,
        findAllMatches: true
    });
    const biomarkerResults = searchFuseBiomarkers.search(lowerQuery);
    
    // Collect all panels that contain matching keywords or biomarkers
    const displayedPanelKeywords = new Set();
    panelResults.forEach(result => {
        const keyword = result.item.keyword;
        if (!displayedPanelKeywords.has(keyword)) {
            const panelElement = document.querySelector(`[data-keyword="${keyword}"]`);
            if (panelElement) {
                foundDirectMatches.push({ type: 'panel', element: panelElement, data: result.item });
                displayedPanelKeywords.add(keyword);
            }
        }
    });

    biomarkerResults.forEach(result => {
        const biomarkerInfo = biomarkerToPanelsMap.get(result.item.originalKey);
        if (biomarkerInfo) {
            biomarkerInfo.panels.forEach(panelRef => {
                const keyword = panelRef.panelData.keyword;
                if (!displayedPanelKeywords.has(keyword)) {
                    const panelElement = document.querySelector(`[data-keyword="${keyword}"]`);
                    if (panelElement) {
                        foundDirectMatches.push({ type: 'panel', element: panelElement, data: panelRef.panelData });
                        displayedPanelKeywords.add(keyword);
                    }
                }
            });
        }
    });

    const allParagraphs = paragraphContainer.querySelectorAll('.content-paragraph');
    allParagraphs.forEach(p => p.classList.add('hide'));

    if (foundDirectMatches.length > 0) {
        foundDirectMatches.sort((a, b) => {
            const nameA = a.data.keyword;
            const nameB = b.data.keyword;
            return nameA.localeCompare(nameB);
        });

        foundDirectMatches.forEach(match => {
            if (match.element) match.element.classList.remove('hide');
        });
    } else {
        if (!searchTriggeredFromDropdown) {
            const suggestions = getSuggestions(lowerQuery);
            const noResultsDiv = document.createElement('div');
            noResultsDiv.id = 'noResultsMessage';
            noResultsDiv.className = 'suggestion-message';
            if (suggestions.length > 0) {
                let suggestionHtml = `<p>No direct results found for "<strong>${lowerQuery}</strong>".</p>`;
                suggestionHtml += `<p>Did you mean: ${suggestions.map(term => `<a href="#" onclick="searchInput.value = '${term}'; filterContent(); return false;">${term}</a>`).join(', ')}?</p>`;
                noResultsDiv.innerHTML = suggestionHtml;
            } else {
                noResultsDiv.innerHTML = `<p style="text-align: center; color: #666; font-style: italic;">No matching results found for "${lowerQuery}"</p>`;
            }
            paragraphContainer.appendChild(noResultsDiv);
        }
    }
    clearSearchHighlights();
    applySearchHighlights(lowerQuery);

}


   // Modified renderInitialParagraphs function - only the relevant part
    function renderInitialParagraphs() {
        paragraphContainer.innerHTML = '';
        
        allContentData.forEach((item, index) => {
            // Create panel container
            const panelWrapper = document.createElement('div');
            panelWrapper.classList.add('panel-wrapper');

            const panelContainer = document.createElement('div');
            panelContainer.classList.add('panel-container', 'content-paragraph', 'hide', item.colorClass || 'green');

            panelWrapper.appendChild(panelContainer);

            panelContainer.setAttribute('data-keyword', item.keyword);
            panelContainer.setAttribute('data-category', item.category || '');
            panelContainer.setAttribute('data-biomarkers', item.biomarkers ? item.biomarkers.join(' ') : '');
            panelContainer.id = `panel-${index}`;

            // Create the main panel content
            const panelContent = document.createElement('div');
            panelContent.classList.add('panel-content');
            panelContent.innerHTML = item.paragraph;

            // Create the status icon wrapper
            const statusIconWrapper = document.createElement('div');
            statusIconWrapper.classList.add('panel-status-wrapper');
            statusIconWrapper.innerHTML = `
                ${item.statusIcon}
                <div class="panel-tooltip">${item.tooltipText}</div>
            `;

            // Append the icon wrapper to the panelContent box
            panelContent.appendChild(statusIconWrapper);

            // Append the panel content (which now contains the icon) to the panel container
            panelContainer.appendChild(panelContent);

            // Append the final panel wrapper to the main container
            paragraphContainer.appendChild(panelWrapper);
        });
        
        // Remove this duplicate event listener - it will be handled by the one added later
        
        // Apply conditional styling to all biomarker elements
        const allBiomarkerElements = document.querySelectorAll('.biomarker-clickable');
        allBiomarkerElements.forEach(element => {
            const biomarkerName = element.getAttribute('data-biomarker');
            const loincCode = element.getAttribute('data-loinc');
            const rowIndex = element.getAttribute('data-row-index');
            const biomarkerColumnIndex = element.getAttribute('data-biomarker-column-index');
            
            // Check if biomarker is gray (#d9d9d9)
            const rowColors = biomarkerColorMap.get(rowIndex);
            const biomarkerColor = rowColors ? rowColors[biomarkerColumnIndex] : null;
            const isGrayBiomarker = biomarkerColor && biomarkerColor.toLowerCase() === '#d9d9d9';
            
            if (!isValidBiomarker(biomarkerName, loincCode, parseInt(rowIndex), parseInt(biomarkerColumnIndex))) {
                element.classList.add('invalid-biomarker');
            } else if (isGrayBiomarker) {
                element.classList.add('gray-biomarker');
            }
        });
        
        console.log(`Rendered ${allContentData.length} paragraphs`);

        // initializeBiomarkerSearch(); // we don't need this as of right now
    }

   // Make functions globally available
   window.expandAllBiomarkers = expandAllBiomarkers;
   window.collapseAllBiomarkers = collapseAllBiomarkers;


   // MODIFIED BLOCK START
   addExpandableStyles(); // Keep this as it is
   createHomepageButton(); // Create the homepage button
   
   // Show cache status immediately when page loads
   showCacheStatus();
   
   loadContent().then(() => {
        buildBiomarkerToPanelsMap(); // Build the mapping after content is loaded

        // New: Populate allSuggestionWords for word-level suggestions
        const tempWords = new Set();
        const commonStopWords = new Set(["and", "or", "the", "a", "an", "for", "with", "of", "in", "to", "at", "by", "on", "is", "are", "as", "be", "but", "not", "from", "up", "down", "out", "off"]); // Add more common words if needed

        allContentData.forEach(panel => {
            // Add individual words from panel keywords, splitting by common delimiters
            panel.keyword.split(/[\s\-_/.,()]+/).forEach(rawWord => {
                const word = rawWord.toLowerCase().trim();
                if (word.length >= 3 && !/^\d+$/.test(word) && !commonStopWords.has(word)) { // Min 3 chars, not just numbers, not a stop word
                    tempWords.add(word);
                }
            });
            // Optionally, if you have other text fields like panel descriptions, you could parse them here too
        });
        biomarkerToPanelsMap.forEach(biomarker => {
            // Add individual words from biomarker names, splitting by common delimiters
            biomarker.biomarkerName.split(/[\s\-_/.,()]+/).forEach(rawWord => {
                const word = rawWord.toLowerCase().trim();
                if (word.length >= 3 && !/^\d+$/.test(word) && !commonStopWords.has(word)) { // Min 3 chars, not just numbers, not a stop word
                    tempWords.add(word);
                }
            });
            // Optionally, if you have biomarker descriptions, parse them here
        });
        allSuggestionWords = Array.from(tempWords).sort(); // Convert to array and sort
        console.log(`Populated ${allSuggestionWords.length} unique suggestion words for autocomplete.`);

        initializeFuse(); // Initialize all Fuse instances here after data is ready

        const checkboxPanels = document.getElementById('searchModePanels');
        const checkboxBiomarkers = document.getElementById('searchModeBiomarkers');
        // Trigger filtering when search mode changes
        checkboxPanels.addEventListener('change', filterContent);
        checkboxBiomarkers.addEventListener('change', filterContent);

        // Handle clicks
        searchButton.addEventListener('click', filterContent);


        // Re-enable biomarker click expansion
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('biomarker-clickable')) {
                console.log('Biomarker clicked:', e.target.getAttribute('data-biomarker'));
                const biomarkerName = e.target.getAttribute('data-biomarker');
                const loincCode = e.target.getAttribute('data-loinc');
                const rowIndex = e.target.getAttribute('data-row-index');
                const biomarkerColumnIndex = e.target.getAttribute('data-biomarker-column-index');
                const panelContainer = e.target.closest('.panel-container');

                const biomarkerData = {
                    loinc: loincCode,
                    rowIndex: parseInt(rowIndex),
                    biomarkerColumnIndex: parseInt(biomarkerColumnIndex)
                };

                console.log('Calling toggleBiomarkerDetails with:', biomarkerName, biomarkerData, panelContainer);
                toggleBiomarkerDetails(e.target, biomarkerName, biomarkerData, panelContainer);
            }
        });

        // Handle initial URL search parameter
        const params = new URLSearchParams(window.location.search);
        const searchValue = params.get('search');
        const isExactSearch = params.get('exact') === 'true'; // Check for our new parameter

        if (searchValue) {
            searchInput.value = decodeURIComponent(searchValue);

            if (isExactSearch) {
                // This is an exact search from the "new tab" feature.
                console.log("Performing exact search for:", searchValue);
                
                // Hide all panels
                paragraphContainer.querySelectorAll('.content-paragraph').forEach(p => p.classList.add('hide'));
                
                // Find and show only the one specific panel using its data-keyword attribute
                const panelElement = document.querySelector(`[data-keyword="${searchValue}"]`);
                if (panelElement) {
                    panelElement.classList.remove('hide');
                }
            } else {
                // This is a regular search, so use the normal fuzzy logic
                filterContent();
            }
        } else {
            // No search parameter, show homepage
            showHomepage();
        }

    }); // End of loadContent().then() block

    // Real-time search with proper debouncing (UPDATED LOGIC)
        let currentSuggestionIndex = -1; // Keep this outside if not already there

        searchInput.addEventListener('input', function() {
            const query = searchInput.value.trim();
            const lowerQuery = query.toLowerCase(); // Consistent use of lowerQuery

            // Also clear any biomarker expansions/bold from a previous search
            document.querySelectorAll('.biomarker-clickable.expanded').forEach(el => el.classList.remove('expanded'));
            document.querySelectorAll('.biomarker-detail-expanded.show').forEach(el => el.classList.remove('show'));
            // Remove any eye icons left behind so the view fully resets
            document.querySelectorAll('.biomarker-eye').forEach(img => img.remove());


            const expandedPanels = document.querySelectorAll('.panel-container.panel-expanded');
            expandedPanels.forEach(panel => {
                panel.classList.remove('panel-expanded');
            });


            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            if (lowerQuery.length > 0) { // Check length of lowerQuery
                searchTimeout = setTimeout(() => {
                    // Call getSuggestions to get the fuzzy matches for the dropdown
                    // This uses the thresholds (0.4) defined in initializeFuse for the general suggestion instances
                    const suggestions = getSuggestions(lowerQuery);
                    showSuggestions(suggestions);
                }, 300);
            } else {
                hideSuggestions();
                filterContent(); // Clear results when input is empty
            }
        });


    // Also add immediate search on Enter key press
    searchInput.addEventListener('keydown', function(e) {
        const suggestionItems = suggestionsDropdown.querySelectorAll('.suggestion-item');
        if (suggestionItems.length > 0) { // Only handle arrow keys/enter if suggestions are visible
            if (e.key === 'ArrowDown') {
                e.preventDefault(); // Prevent cursor movement
                if (currentSuggestionIndex < suggestionItems.length - 1) {
                    currentSuggestionIndex++;
                } else {
                    currentSuggestionIndex = 0; // Wrap around
                }
                highlightSuggestion(suggestionItems, currentSuggestionIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault(); // Prevent cursor movement
                if (currentSuggestionIndex > 0) {
                    currentSuggestionIndex--;
                } else {
                    currentSuggestionIndex = suggestionItems.length - 1; // Wrap around
                }
                highlightSuggestion(suggestionItems, currentSuggestionIndex);
            } else if (e.key === 'Enter') {
                if (currentSuggestionIndex > -1) {
                    // If a suggestion is highlighted, use it
                    suggestionItems[currentSuggestionIndex].click();
                } else {
                    // Otherwise, perform regular search (already handled by debounce/keydown event)
                    filterContent(); // Ensure search runs if enter is pressed without selecting a suggestion
                }
                suggestionsDropdown.style.display = 'none'; // Hide dropdown on Enter
                currentSuggestionIndex = -1; // Reset index
            }
        } else if (e.key === 'Enter') { // If no suggestions, just perform regular search on Enter
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            filterContent();
        }
    });

    // ADD the highlightSuggestion function (it was there before, but ensure it's here now)
    function highlightSuggestion(items, index) {
            items.forEach((item, idx) => {
                if (idx === index) {
                    item.style.backgroundColor = '#f0f0f0';
                } else {
                    item.style.backgroundColor = '';
                }
            });
            // Scroll the highlighted item into view if necessary
            if (items[index]) {
                items[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        }

    searchInput.addEventListener('blur', (event) => { // Added 'event' parameter
            // Check if the relatedTarget (where focus is going) is within the suggestions dropdown
            if (event.relatedTarget && suggestionsDropdown.contains(event.relatedTarget)) {
                // If focus is going to a suggestion item, do NOT hide immediately.
                // The click event on the suggestion item will handle the search and hiding.
                return;
            }

            // If focus is going elsewhere (not to a suggestion), then hide the suggestions
            setTimeout(() => {
                hideSuggestions();
                currentSuggestionIndex = -1; // Reset index on blur
            }, 150); // Small delay to allow click event to register if applicable
        });
    });