document.addEventListener('DOMContentLoaded', function() {
   const searchInput = document.getElementById('searchInput');
   const paragraphContainer = document.getElementById('paragraphContainer');
   const searchButton = document.getElementById('searchButton');
   const suggestionsDropdown = document.getElementById('suggestionsDropdown');

   let allContentData = [];
   let biomarkerUrlMap = new Map();
   
   let fusePanels;
   let fuseBiomarkers; 

   // Your Google Apps Script deployment URL (replace with your actual URL)
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzK3iC-xXKQubOI5Zr5Es7K2wivt9PTsXFdPoGFO4cKps12Alv8wUs_ILZd5KLjjbPgBQ/exec';

   // Cache configuration
   const CACHE_KEY = 'labcorp_data_cache';
   const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds


    // Modified addExpandableStyles function - ADD these new styles to your existing styles
    function addExpandableStyles() {
        const expandableStyles = `
            <style>

                .panel-container {
                    background-color: #d7f5dc;
                    border: 2px solid #35b152ff;
                    border-radius: 8px;
                    padding: 16 px 20px;
                    margin-bottom: 20px;
                    width: 620px;
                }

                .panel-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 4px;
                }

                .panel-title {
                    color: #28a745;
                    font-size: 20px;
                    font-weight: bold;
                    margin: 0;
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
                }
                
                .biomarker-detail-expanded {
                    margin-bottom: 15px;
                    padding: 12px;
                    border-left: 4px solid #007bff;
                    background-color: #f0f8ff;
                    border-radius: 4px;
                    display: none;
                    animation: slideDown 0.3s ease-out;
                }
                
                .biomarker-detail-expanded.invalid-biomarker {
                    border-left: 4px solid #dc3545;
                    background-color: #ffeaea;
                }
                
                .biomarker-detail-expanded.show {
                    display: block;
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
                
                .detail-link {
                    color: #007bff;
                    text-decoration: none;
                }
                
                .detail-link:hover {
                    text-decoration: underline;
                }
                
                .biomarker-clickable {
                    color: #007bff;
                    cursor: pointer;
                    text-decoration: underline;
                    transition: color 0.2s;
                }
                
                .biomarker-clickable:hover {
                    color: #0056b3;
                }
                
                .biomarker-clickable.expanded {
                    color: #28a745;
                    font-weight: bold;
                }
                
                /* NEW STYLES FOR INVALID BIOMARKERS */
                .biomarker-clickable.invalid-biomarker {
                    color: #dc3545;
                }
                
                .biomarker-clickable.invalid-biomarker:hover {
                    color: #c82333;
                }
                
                .biomarker-clickable.invalid-biomarker.expanded {
                    color: #dc3545;
                    font-weight: bold;
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


                .panel-container {
                width: 620px;
                margin: 0 auto 20px auto;
                transition: max-width 0.3s ease;
                }

                .panel-container.panel-expanded {
                    width: 1200px; 
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
                    border: 1px solid #ccc;
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

                .panel-content h3 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: bold;
                }

}
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', expandableStyles);
    }

    // Helper function to check if biomarker is valid
    function isValidBiomarker(biomarkerName, loincCode) {
        // Check if biomarker contains "Comment"
        if (biomarkerName.toLowerCase().includes('comment')) {
            return false;
        }
        
        // Check if biomarker has LOINC code
        if (!loincCode || loincCode.trim() === '') {
            return false;
        }
        
        // Check if biomarker exists in biomarkerUrlMap (from "Filtered Biomarkers w/ Assays" sheet)
        const biomarkerKey = biomarkerName.toLowerCase();
        if (!biomarkerUrlMap.has(biomarkerKey)) {
            return false;
        }
        
        return true;
    }


   // Toggle individual biomarker details
   // Modified toggleBiomarkerDetails function to maintain display order
    function toggleBiomarkerDetails(biomarkerElement, biomarkerName, biomarkerData, panelContainer) {
        const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}`;
        let detailsContainer = document.getElementById(biomarkerKey);

        if (detailsContainer) {
            const isVisible = detailsContainer.classList.contains('show');
            if (isVisible) {
                detailsContainer.classList.remove('show');
                biomarkerElement.classList.remove('expanded');

                const anyExpanded = panelContainer.querySelector('.biomarker-detail-expanded.show');
                if (!anyExpanded) {
                    panelContainer.classList.remove('panel-expanded');
                }
            } else {
                detailsContainer.classList.add('show');
                biomarkerElement.classList.add('expanded');
                panelContainer.classList.add('panel-expanded');
            }
        } else {
            detailsContainer = createBiomarkerDetailsElement(biomarkerName, biomarkerData, biomarkerKey);

            let biomarkerDetailsContainer = panelContainer.querySelector('.biomarker-details-container');
            if (!biomarkerDetailsContainer) {
                biomarkerDetailsContainer = document.createElement('div');
                biomarkerDetailsContainer.className = 'biomarker-details-container';
                panelContainer.appendChild(biomarkerDetailsContainer);
            }

            // Insert in original order based on clickable element order
            const allClickables = Array.from(panelContainer.querySelectorAll('.biomarker-clickable'));
            const thisIndex = allClickables.findIndex(el => el === biomarkerElement);

            const existingDetails = Array.from(biomarkerDetailsContainer.querySelectorAll('.biomarker-detail-expanded'));

            let inserted = false;
            for (let i = 0; i < existingDetails.length; i++) {
                const detailId = existingDetails[i].id;
                const matchIndex = allClickables.findIndex(el => `${panelContainer.id}-${el.getAttribute('data-biomarker').replace(/\s+/g, '-')}` === detailId);
                if (matchIndex > thisIndex) {
                    biomarkerDetailsContainer.insertBefore(detailsContainer, existingDetails[i]);
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                biomarkerDetailsContainer.appendChild(detailsContainer);
            }

            setTimeout(() => {
                detailsContainer.classList.add('show');
                biomarkerElement.classList.add('expanded');
                panelContainer.classList.add('panel-expanded');
            }, 10);
        }
    }




   // Modified createBiomarkerDetailsElement function
    function createBiomarkerDetailsElement(biomarkerName, biomarkerData, elementId) {
        const biomarkerKey = biomarkerName.toLowerCase();
        const biomarkerInfo = biomarkerUrlMap.get(biomarkerKey);
        
        const detailsDiv = document.createElement('div');
        detailsDiv.id = elementId;
        detailsDiv.className = 'biomarker-detail-expanded';

        const isValid = isValidBiomarker(biomarkerName, biomarkerData?.loinc);
        if (!isValid) {
            detailsDiv.classList.add('invalid-biomarker');
        }

        let detailsContent = `<h4>${biomarkerName}</h4>`;

        if (!isValid) {
            detailsContent += `
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value" style="color: #dc3545; font-weight: bold;">Invalid Biomarker</span>
                </div>`;
        }

        detailsContent += `
            <div class="detail-item">
                <span class="detail-label">Biomarker Name:</span>
                <span class="detail-value">${biomarkerName}</span>
            </div>`;

        if (biomarkerData && biomarkerData.loinc) {
            detailsContent += `
                <div class="detail-item">
                    <span class="detail-label">LOINC Code:</span>
                    <span class="detail-value">${biomarkerData.loinc}</span>
                </div>`;
        }

        if (biomarkerInfo && biomarkerInfo.description) {
            detailsContent += `
                <div class="detail-item">
                    <span class="detail-label">LOINC Name:</span>
                    <span class="detail-value">${biomarkerInfo.description}</span>
                </div>`;
        }

        if (biomarkerInfo && biomarkerInfo.url && biomarkerInfo.url !== '#') {
            detailsContent += `
                <div class="detail-item">
                    <span class="detail-label">LOINC URL:</span>
                    <span class="detail-value"><a href="${biomarkerInfo.url}" target="_blank" class="detail-link">View LOINC Details</a></span>
                </div>`;
        }

        if (biomarkerInfo && biomarkerInfo.assayType) {
            detailsContent += `
                <div class="detail-item">
                    <span class="detail-label">Assay Type:</span>
                    <span class="detail-value">${biomarkerInfo.assayType}</span>
                </div>`;
        }

        if (biomarkerInfo && biomarkerInfo.kitUrl) {
            detailsContent += `
                <div class="detail-item">
                    <span class="detail-label">Kit URL:</span>
                    <span class="detail-value"><a href="${biomarkerInfo.kitUrl}" target="_blank" class="detail-link">View Kit Details</a></span>
                </div>`;
        }

        //  New section: List of panels using this biomarker
        const panelsUsing = allContentData
            .map((panel, idx) => ({ ...panel, index: idx }))
            .filter(panel => (panel.biomarkers || []).some(b => b.toLowerCase() === biomarkerName.toLowerCase()));

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

            panelsUsing.forEach(({ keyword, cpt, testNumber, biomarkers }) => {
                detailsContent += `
                    <li class="associated-panel-container">
                        <div class="associated-panel-content">
                            <div class="associated-panel-header">
                                <span class="associated-panel-label">PANEL</span>
                                <span class="associated-panel-title">${keyword}</span>
                            </div>
                            <p class="associated-panel-meta">
                                ${cpt ? `CPT: ${cpt}` : 'CPT: Not Found'} | 
                                ${testNumber ? `Test #: ${testNumber}` : 'Test #: Not Found'} | 
                                ${biomarkers?.length || 0} biomarkers
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


   // Expand all biomarkers for a panel
   function expandAllBiomarkers(panelContainer) {
    const biomarkerElements = panelContainer.querySelectorAll('.biomarker-clickable');
    let anyExpanded = false;

    biomarkerElements.forEach(biomarkerElement => {
        const biomarkerName = biomarkerElement.getAttribute('data-biomarker');
        const loincCode = biomarkerElement.getAttribute('data-loinc');
        const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}`;
        
        let detailsContainer = document.getElementById(biomarkerKey);

        if (!detailsContainer) {
            // Create the details if they don't exist
            toggleBiomarkerDetails(biomarkerElement, biomarkerName, { loinc: loincCode }, panelContainer);
            anyExpanded = true;
        } else if (!detailsContainer.classList.contains('show')) {
            // Show if hidden
            detailsContainer.classList.add('show');
            biomarkerElement.classList.add('expanded');
            anyExpanded = true;
        }
    });

    // Only add expansion styling if at least one was opened
    if (anyExpanded) {
        panelContainer.classList.add('panel-expanded');
    }
}

   // Collapse all biomarkers for a panel
   function collapseAllBiomarkers(panelContainer) {
        const biomarkerElements = panelContainer.querySelectorAll('.biomarker-clickable');
        let anyCollapsed = false;

        biomarkerElements.forEach(biomarkerElement => {
            const biomarkerName = biomarkerElement.getAttribute('data-biomarker');
            const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}`;

            const detailsContainer = document.getElementById(biomarkerKey);

            // Always remove highlight from biomarker
            biomarkerElement.classList.remove('expanded');

            // Hide details if visible
            if (detailsContainer && detailsContainer.classList.contains('show')) {
                detailsContainer.classList.remove('show');
                anyCollapsed = true;
            }
        });

        // Remove expansion class if anything was collapsed
        if (anyCollapsed) {
            panelContainer.classList.remove('panel-expanded');
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
           
           return parsedItem.data;
       } catch (error) {
           console.error('Error reading cache:', error);
           localStorage.removeItem(CACHE_KEY);
           return null;
       }
   }

   function setCachedData(data) {
       try {
           const cacheItem = {
               data: data,
               timestamp: new Date().getTime()
           };
           localStorage.setItem(CACHE_KEY, JSON.stringify(cacheItem));
           console.log('Data cached successfully');
       } catch (error) {
           console.error('Error caching data:', error);
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
               console.log('Loading data from cache...');
               
               // Show loading message for cache load
               paragraphContainer.innerHTML = '<p style="text-align: center; color: #666;">Loading cached data...</p>';
               
               // Parse cached data
               biomarkerUrlMap = parseBiomarkersData(cachedData.biomarkersData);
               allContentData = parseLabcorpData(cachedData.labcorpData, biomarkerUrlMap);
               
               renderInitialParagraphs();
               console.log('Data loaded from cache successfully');
               return;
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
           
           if (!data.success) {
               throw new Error(data.error || 'Unknown error from Apps Script');
           }
           
           console.log('Data loaded successfully from server');
           console.log('Labcorp data rows:', data.data.labcorpData.length);
           console.log('Biomarkers data rows:', data.data.biomarkersData.length);
           
           // Cache the fresh data
           setCachedData(data.data);
           
           // Parse the data
           biomarkerUrlMap = parseBiomarkersData(data.data.biomarkersData);
           allContentData = parseLabcorpData(data.data.labcorpData, biomarkerUrlMap);
           
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

   // Add cache status indicator
   function showCacheStatus() {
       const cachedData = getCachedData();
       if (cachedData) {
           const cacheItem = JSON.parse(localStorage.getItem(CACHE_KEY));
           const cacheAge = new Date().getTime() - cacheItem.timestamp;
           const hoursOld = Math.floor(cacheAge / (1000 * 60 * 60));
           const minutesOld = Math.floor((cacheAge % (1000 * 60 * 60)) / (1000 * 60));
           
           console.log(`Cache status: Data is ${hoursOld}h ${minutesOld}m old`);
           
           // Optional: Add visual indicator
           const statusDiv = document.createElement('div');
           statusDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #e8f5e8; padding: 5px 10px; border-radius: 5px; font-size: 12px; color: #666; z-index: 1000;';
           statusDiv.innerHTML = `Using cached data (${hoursOld}h ${minutesOld}m old)`;
           document.body.appendChild(statusDiv);
           
           // Remove after 3 seconds
           setTimeout(() => statusDiv.remove(), 3000);
       }
   }

   // Parse biomarkers data to create URL mappings
   function parseBiomarkersData(biomarkersData) {
       const urlMap = new Map();
       
       if (!biomarkersData || biomarkersData.length < 2) {
           console.warn('No biomarker data found');
           return urlMap;
       }
       
       const headers = biomarkersData[0];
       console.log('Biomarkers headers:', headers);
       
       // Find relevant columns
       const nameColumn = findColumnIndex(headers, ['Biomarker']);
       const urlColumn = findColumnIndex(headers, ['LOINC url']);
       const descriptionColumn = findColumnIndex(headers, ['LOINC name']);
       const assayTypeColumn = findColumnIndex(headers, ['Assay type', 'Assay Type']);
       const kitUrlColumn = findColumnIndex(headers, ['Kit url', 'Kit URL']);
       
       console.log(`Found columns - Name: ${nameColumn}, URL: ${urlColumn}, Description: ${descriptionColumn}, Assay Type: ${assayTypeColumn}, Kit URL: ${kitUrlColumn}`);
       
       // Process data rows (skip header row)
       for (let i = 1; i < biomarkersData.length; i++) {
           const row = biomarkersData[i];
           
           if (row.length === 0) continue;
           
           const name = nameColumn >= 0 && row[nameColumn] ? row[nameColumn].toString().trim() : '';
           const url = urlColumn >= 0 && row[urlColumn] ? row[urlColumn].toString().trim() : '';
           const description = descriptionColumn >= 0 && row[descriptionColumn] ? row[descriptionColumn].toString().trim() : '';
           const assayType = assayTypeColumn >= 0 && row[assayTypeColumn] ? row[assayTypeColumn].toString().trim() : '';
           const kitUrl = kitUrlColumn >= 0 && row[kitUrlColumn] ? row[kitUrlColumn].toString().trim() : '';
           
           if (name) {
               urlMap.set(name.toLowerCase(), {
                   url: url || '#',
                   description: description || '',
                   assayType: assayType || '',
                   kitUrl: kitUrl || ''
               });
           }
       }
       
       console.log(`Created ${urlMap.size} biomarker mappings`);
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
                       loinc: loincCode
                   });
               }
           }
           
           // Create formatted biomarker display with click handlers
           const formattedBiomarkers = biomarkerData.map(biomarker => {
               let biomarkerHtml = `<span class="biomarker-clickable" data-biomarker="${biomarker.name}" data-loinc="${biomarker.loinc}">${biomarker.name}</span>`;
               
               // Add LOINC code if available
               if (biomarker.loinc) {
                   biomarkerHtml += ` <span class="loinc-code" style="color: #666;">(LOINC: ${biomarker.loinc})</span>`;
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
               keyword: panelName.toLowerCase(),
               paragraph: paragraphContent,
               url: url,
               cpt: cpt,
               testNumber: testNumber,
               biomarkers: biomarkers.map(b => b.toLowerCase()),
               biomarkerData: biomarkerData // Store full biomarker data for future use
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

   // MODIFIED FUNCTION START
function initializeFuse() {
    // For panels: search by keyword (panel name)
    const panelOptions = {
        keys: ['keyword'],
        threshold: 0.3, 
        includeScore: true // Include score to evaluate closeness later if needed, though primarily for 'did you mean'
    };
    fusePanels = new Fuse(allContentData, panelOptions);
    console.log("Fuse for panels initialized.");

    // For biomarkers: search by biomarkerName
    const biomarkerNamesArray = Array.from(biomarkerToPanelsMap.values()).map(b => ({
        biomarkerName: b.biomarkerName,
        originalKey: b.biomarkerName.toLowerCase()
    }));
    const biomarkerOptions = {
        keys: ['biomarkerName'],
        // MODIFIED LINE START - Make this slightly stricter for direct searching
        threshold: 0.3, // A lower threshold (e.g., 0.3 or 0.2) means stricter matches
        // MODIFIED LINE END
        includeScore: true
    };
    fuseBiomarkers = new Fuse(biomarkerNamesArray, biomarkerOptions);
    console.log("Fuse for biomarkers initialized.");
}
    function getSuggestions(query) {
        let suggestions = [];
        const panelSuggestions = fusePanels.search(query, { limit: 10 }); // Get top 1 panel suggestion
        const biomarkerSuggestions = fuseBiomarkers.search(query, { limit: 10 }); // Get top 1 biomarker suggestion

        if (panelSuggestions.length > 0) {
            panelSuggestions.forEach(result => {
            suggestions.push(result.item.keyword); // 'keyword' is the lowercase panel name
        });
        }
        
        if (biomarkerSuggestions.length > 0) {
            biomarkerSuggestions.forEach(result => {
            suggestions.push(result.item.biomarkerName); // 'biomarkerName' is the original biomarker name
        });
        }

        // Return unique suggestions, prioritizing panels then biomarkers
        return [...new Set(suggestions)];
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
                const biomarkerKey = biomarker.name.toLowerCase();
                
                if (!biomarkerToPanelsMap.has(biomarkerKey)) {
                    biomarkerToPanelsMap.set(biomarkerKey, {
                        biomarkerName: biomarker.name,
                        loincCode: biomarker.loinc,
                        panels: []
                    });
                }
                
                biomarkerToPanelsMap.get(biomarkerKey).panels.push({
                    panelIndex: panelIndex,
                    panelData: panelData
                });
            });
        }
    });
    
    console.log(`Built biomarker-to-panels mapping for ${biomarkerToPanelsMap.size} biomarkers`);
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
    const biomarkerKey = biomarkerInfo.biomarkerName.toLowerCase();
    const additionalInfo = biomarkerUrlMap.get(biomarkerKey);
    
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
        
        if (additionalInfo.assayType) {
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
        
        if (additionalInfo.assayType) {
            biomarkerContent += `
                <div class="detail-item">
                    <span class="detail-label">Assay Type:</span>
                    <span class="detail-value">${additionalInfo.assayType}</span>
                </div>
            `;
        }
        
        if (additionalInfo.url && additionalInfo.url !== '#') {
            biomarkerContent += `
                <div class="detail-item">
                    <span class="detail-label">LOINC URL:</span>
                    <span class="detail-value"><a href="${additionalInfo.url}" target="_blank" class="detail-link">View LOINC Details</a></span>
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
                    <span class="panel-name">${panelData.keyword.charAt(0).toUpperCase() + panelData.keyword.slice(1)}</span>
                </div>
                <div class="panel-quick-info">
                    ${panelData.cpt ? `CPT: ${panelData.cpt}` : ''}${panelData.cpt && panelData.testNumber ? ' | ' : ''}${panelData.testNumber ? `Test #: ${panelData.testNumber}` : ''}${(panelData.cpt || panelData.testNumber) && panelData.biomarkers ? ' | ' : ''}${panelData.biomarkers ? `${panelData.biomarkers.length} biomarkers` : ''}
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
            
            /* Enhanced panel styling to match biomarker styling */
            .panel-container {
                border: 2px solid #28a745;
                background: #f0f8f0;
                box-shadow: 0 3px 10px rgba(40, 167, 69, 0.2);
            }
            
            .panel-container .panel-content h3 {
                color: #28a745;
                margin-top: 0;
                display: flex;
                align-items: center;
            }
            
            .panel-container .panel-content h3:before {
                content: "PANEL";
                font-size: 11px;
                font-weight: bold;
                background: #28a745;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                margin-right: 15px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
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




// Enhanced filter function that shows both panels and biomarkers

// Make functions globally available
window.toggleBiomarkerExpansion = toggleBiomarkerExpansion;
window.togglePanelInBiomarkerView = togglePanelInBiomarkerView;




// Call this function after your existing loadContent() completes successfully
// Add this to your existing renderInitialParagraphs function at the end:
// initializeBiomarkerSearch();

    // MODIFIED FUNCTION START (The entire function content is replaced)
window.filterContent = function() {
    const query = searchInput.value.trim();
    const lowerQuery = query.toLowerCase();

    // Clear previous results and messages (including the summary and suggestions)
    document.querySelectorAll('.biomarker-result-container, #search-results-summary, #noResultsMessage, .suggestion-message')
        .forEach(el => el.remove());
    hideSuggestions(); // Hide suggestions when a full search is initiated

    if (lowerQuery === '') {
        paragraphContainer.querySelectorAll('.content-paragraph').forEach(p => p.classList.add('hide'));
        return;
    }

    const searchMode = document.querySelector('input[name="searchMode"]:checked')?.value || 'all';

    let foundDirectMatches = []; // To store results that are "good enough" to be direct matches

    // --- PHASE 1: Perform strict Fuse.js search for direct results ---
    // Use a stricter threshold for finding actual results to display
    const strictPanelResults = fusePanels.search(lowerQuery, { threshold: 0.2 }); // Very strict
    const strictBiomarkerResults = fuseBiomarkers.search(lowerQuery, { threshold: 0.2 }); // Very strict

    // Collect direct panel matches
    strictPanelResults.forEach(result => {
        // Find the actual DOM element for this panel
        const panelElement = document.querySelector(`[data-keyword="${result.item.keyword}"]`);
        if (panelElement) {
            foundDirectMatches.push({ type: 'panel', element: panelElement, data: result.item });
        }
    });

    // Collect direct biomarker matches
    if (searchMode === 'all') {
        strictBiomarkerResults.forEach(result => {
            foundDirectMatches.push({ type: 'biomarker', data: biomarkerToPanelsMap.get(result.item.originalKey) });
        });
    }

    let matchingPanelsCount = 0;
    const allParagraphs = paragraphContainer.querySelectorAll('.content-paragraph');

    // Hide all panels initially
    allParagraphs.forEach(p => p.classList.add('hide'));

    // --- PHASE 2: Display direct matches if found ---
    if (foundDirectMatches.length > 0) {
        // Display matching panels
        foundDirectMatches.filter(m => m.type === 'panel').forEach(match => {
            match.element.classList.remove('hide');
            matchingPanelsCount++;
        });

        // Display matching biomarkers (already converted to biomarkerResult HTML)
        foundDirectMatches.filter(m => m.type === 'biomarker').forEach((match, index) => {
            const biomarkerResult = createBiomarkerResult(match.data, index);
            const firstPanel = paragraphContainer.querySelector('.panel-wrapper');
            if (firstPanel) {
                paragraphContainer.insertBefore(biomarkerResult, firstPanel.parentElement);
            } else {
                paragraphContainer.insertBefore(biomarkerResult, paragraphContainer.firstChild);
            }
        });

        const totalResults = foundDirectMatches.length; // Count of both panels and biomarkers
        if (totalResults > 0) {
            // Summary message will not be displayed as per previous instruction
        }
    } else {
        // --- PHASE 3: No strict direct matches, offer suggestions ---
        // Use a looser threshold for suggestions
        const suggestions = getSuggestions(lowerQuery); // getSuggestions uses threshold 0.4 now

        if (suggestions.length > 0) {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.id = 'noResultsMessage'; // Reusing for consistent styling
            suggestionDiv.className = 'suggestion-message';

            let suggestionHtml = `<p>No direct results found for "<strong>${query}</strong>".</p>`;
            if (suggestions.length === 1) {
                const suggestedTerm = suggestions[0];
                suggestionHtml += `<p>Did you mean: <a href="#" onclick="searchInput.value = '${suggestedTerm}'; filterContent(); return false;">${suggestedTerm}</a>?</p>`;
            } else {
                suggestionHtml += `<p>Did you mean one of these: `;
                // Sort suggestions by relevance (Fuse.js score, or alphabetical if scores are not used consistently)
                // For direct suggestions, we can just display them
                suggestionHtml += suggestions.map(term => `<a href="#" onclick="searchInput.value = '${term}'; filterContent(); return false;">${term}</a>`).join(', ');
                suggestionHtml += `?</p>`;
            }
            suggestionDiv.innerHTML = suggestionHtml;
            paragraphContainer.appendChild(suggestionDiv);
        } else {
            // Absolutely no matches and no suggestions
            const noResultsDiv = document.createElement('div');
            noResultsDiv.id = 'noResultsMessage';
            noResultsDiv.innerHTML = `
                <p style="text-align: center; color: #666; font-style: italic;">
                    No matching results found for "${query}"<br>
                    <small>Try searching for panel names, categories, or biomarker names</small>
                </p>
            `;
            paragraphContainer.appendChild(noResultsDiv);
        }
    }
};
// MODIFIED FUNCTION END


   // Modified renderInitialParagraphs function - only the relevant part
    function renderInitialParagraphs() {
        paragraphContainer.innerHTML = '';
        
        allContentData.forEach((item, index) => {
            // Create panel container
            const panelWrapper = document.createElement('div');
            panelWrapper.classList.add('panel-wrapper');

            const panelContainer = document.createElement('div');
            panelContainer.classList.add('panel-container', 'content-paragraph', 'hide');

            panelWrapper.appendChild(panelContainer);
            paragraphContainer.appendChild(panelWrapper);

            panelContainer.setAttribute('data-keyword', item.keyword);
            panelContainer.setAttribute('data-category', item.category || '');
            panelContainer.setAttribute('data-biomarkers', item.biomarkers ? item.biomarkers.join(' ') : '');
            panelContainer.id = `panel-${index}`;
            
            // Create panel content
            const panelContent = document.createElement('div');
            panelContent.classList.add('panel-content');
            panelContent.innerHTML = item.paragraph;
            
            panelContainer.appendChild(panelContent);
            paragraphContainer.appendChild(panelContainer);
        });
        
        // Add click event listeners to biomarker elements AND apply conditional styling
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('biomarker-clickable')) {
                const biomarkerName = e.target.getAttribute('data-biomarker');
                const loincCode = e.target.getAttribute('data-loinc');
                const panelContainer = e.target.closest('.panel-container');
                
                toggleBiomarkerDetails(e.target, biomarkerName, { loinc: loincCode }, panelContainer);
            }
        });
        
        // Apply conditional styling to all biomarker elements
        const allBiomarkerElements = document.querySelectorAll('.biomarker-clickable');
        allBiomarkerElements.forEach(element => {
            const biomarkerName = element.getAttribute('data-biomarker');
            const loincCode = element.getAttribute('data-loinc');
            
            if (!isValidBiomarker(biomarkerName, loincCode)) {
                element.classList.add('invalid-biomarker');
            }
        });
        
        console.log(`Rendered ${allContentData.length} paragraphs`);

        //initializeBiomarkerSearch(); // we don't need this as of right now
    }

   // Make functions globally available
   window.expandAllBiomarkers = expandAllBiomarkers;
   window.collapseAllBiomarkers = collapseAllBiomarkers;

   

   addExpandableStyles();
   loadContent().then(() => {
    showCacheStatus();
    buildBiomarkerToPanelsMap(); // Build the mapping after content is loaded
    initializeFuse();
        const checkboxAll = document.getElementById('searchModeAll');
        const checkboxPanels = document.getElementById('searchModePanels');

        // Trigger filtering when search mode changes
        checkboxAll.addEventListener('change', filterContent);
        checkboxPanels.addEventListener('change', filterContent);

        // Handle clicks
        searchButton.addEventListener('click', filterContent);

        // Handle enter key
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                if (searchTimeout) clearTimeout(searchTimeout);
                filterContent();
            }
        });

        // Re-enable biomarker click expansion
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('biomarker-clickable')) {
                const biomarkerName = e.target.getAttribute('data-biomarker');
                const loincCode = e.target.getAttribute('data-loinc');
                const panelContainer = e.target.closest('.panel-container');
                
                toggleBiomarkerDetails(e.target, biomarkerName, { loinc: loincCode }, panelContainer);
            }
        });
    });

   
   searchButton.addEventListener('click', filterContent);

   // Real-time search with proper debouncing
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        const query = searchInput.value.trim();
        const lowerQuery = query.toLowerCase(); // Consistent use of lowerQuery

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
       if (e.key === 'Enter') {
           if (searchTimeout) {
               clearTimeout(searchTimeout);
           }
           filterContent();
       }
   });

   searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            hideSuggestions();
        }, 150); // Small delay
    });


});
