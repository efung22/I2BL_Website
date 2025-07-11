document.addEventListener('DOMContentLoaded', function() {
   const searchInput = document.getElementById('searchInput');
   const paragraphContainer = document.getElementById('paragraphContainer');
   const searchButton = document.getElementById('searchButton');

   let allContentData = [];
   let biomarkerUrlMap = new Map();

   // Your Google Apps Script deployment URL (replace with your actual URL)
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzK3iC-xXKQubOI5Zr5Es7K2wivt9PTsXFdPoGFO4cKps12Alv8wUs_ILZd5KLjjbPgBQ/exec';

   // Cache configuration
   const CACHE_KEY = 'labcorp_data_cache';
   const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

   // Add expandable biomarker styles
   function addExpandableStyles() {
       const expandableStyles = `
           <style>
               .panel-container {
                   margin-bottom: 20px;
                   border: 1px solid #ddd;
                   border-radius: 8px;
                   overflow: hidden;
               }
               
               .panel-content {
                   padding: 15px;
                   background-color: #fff;
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
                   background-color: #dc3545;
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
                   background-color: #c82333;
               }
               
               .biomarker-details-container {
                   margin-top: 15px;
                   padding-left: 20px;
               }
               
               .biomarker-detail-expanded {
                   margin-bottom: 15px;
                   padding: 12px;
                   border-left: 4px solid #007bff;
                   background-color: #f8f9fa;
                   border-radius: 4px;
                   display: none;
                   animation: slideDown 0.3s ease-out;
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
           </style>
       `;
       
       document.head.insertAdjacentHTML('beforeend', expandableStyles);
   }

   // Toggle individual biomarker details
   function toggleBiomarkerDetails(biomarkerElement, biomarkerName, biomarkerData, panelContainer) {
       const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}`;
       let detailsContainer = document.getElementById(biomarkerKey);
       
       if (detailsContainer) {
           // Toggle visibility
           const isVisible = detailsContainer.classList.contains('show');
           if (isVisible) {
               detailsContainer.classList.remove('show');
               biomarkerElement.classList.remove('expanded');
           } else {
               detailsContainer.classList.add('show');
               biomarkerElement.classList.add('expanded');
           }
       } else {
           // Create new details container
           detailsContainer = createBiomarkerDetailsElement(biomarkerName, biomarkerData, biomarkerKey);
           
           // Find or create the biomarker details container
           let biomarkerDetailsContainer = panelContainer.querySelector('.biomarker-details-container');
           if (!biomarkerDetailsContainer) {
               biomarkerDetailsContainer = document.createElement('div');
               biomarkerDetailsContainer.className = 'biomarker-details-container';
               panelContainer.appendChild(biomarkerDetailsContainer);
           }
           
           biomarkerDetailsContainer.appendChild(detailsContainer);
           
           // Show the details
           setTimeout(() => {
               detailsContainer.classList.add('show');
               biomarkerElement.classList.add('expanded');
           }, 10);
       }
   }

   // Create biomarker details element
   function createBiomarkerDetailsElement(biomarkerName, biomarkerData, elementId) {
       const biomarkerKey = biomarkerName.toLowerCase();
       const biomarkerInfo = biomarkerUrlMap.get(biomarkerKey);
       
       const detailsDiv = document.createElement('div');
       detailsDiv.id = elementId;
       detailsDiv.className = 'biomarker-detail-expanded';
       
       let detailsContent = `<h4>${biomarkerName}</h4>`;
       
       // Biomarker Name
       detailsContent += `<div class="detail-item">`;
       detailsContent += `<span class="detail-label">Biomarker Name:</span>`;
       detailsContent += `<span class="detail-value">${biomarkerName}</span>`;
       detailsContent += `</div>`;
       
       // LOINC Code
       if (biomarkerData && biomarkerData.loinc) {
           detailsContent += `<div class="detail-item">`;
           detailsContent += `<span class="detail-label">LOINC Code:</span>`;
           detailsContent += `<span class="detail-value">${biomarkerData.loinc}</span>`;
           detailsContent += `</div>`;
       }
       
       // LOINC Name
       if (biomarkerInfo && biomarkerInfo.description) {
           detailsContent += `<div class="detail-item">`;
           detailsContent += `<span class="detail-label">LOINC Name:</span>`;
           detailsContent += `<span class="detail-value">${biomarkerInfo.description}</span>`;
           detailsContent += `</div>`;
       }
       
       // LOINC URL
       if (biomarkerInfo && biomarkerInfo.url && biomarkerInfo.url !== '#') {
           detailsContent += `<div class="detail-item">`;
           detailsContent += `<span class="detail-label">LOINC URL:</span>`;
           detailsContent += `<span class="detail-value"><a href="${biomarkerInfo.url}" target="_blank" class="detail-link">View LOINC Details</a></span>`;
           detailsContent += `</div>`;
       }
       
       // Assay Type
       if (biomarkerInfo && biomarkerInfo.assayType) {
           detailsContent += `<div class="detail-item">`;
           detailsContent += `<span class="detail-label">Assay Type:</span>`;
           detailsContent += `<span class="detail-value">${biomarkerInfo.assayType}</span>`;
           detailsContent += `</div>`;
       }
       
       // Kit URL
       if (biomarkerInfo && biomarkerInfo.kitUrl) {
           detailsContent += `<div class="detail-item">`;
           detailsContent += `<span class="detail-label">Kit URL:</span>`;
           detailsContent += `<span class="detail-value"><a href="${biomarkerInfo.kitUrl}" target="_blank" class="detail-link">View Kit Details</a></span>`;
           detailsContent += `</div>`;
       }
       
       detailsDiv.innerHTML = detailsContent;
       return detailsDiv;
   }

   // Expand all biomarkers for a panel
   function expandAllBiomarkers(panelContainer) {
       const biomarkerElements = panelContainer.querySelectorAll('.biomarker-clickable');
       biomarkerElements.forEach(biomarkerElement => {
           const biomarkerName = biomarkerElement.getAttribute('data-biomarker');
           const loincCode = biomarkerElement.getAttribute('data-loinc');
           const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}`;
           
           let detailsContainer = document.getElementById(biomarkerKey);
           if (!detailsContainer) {
               // Create the details if they don't exist
               toggleBiomarkerDetails(biomarkerElement, biomarkerName, { loinc: loincCode }, panelContainer);
           } else if (!detailsContainer.classList.contains('show')) {
               // Show if hidden
               detailsContainer.classList.add('show');
               biomarkerElement.classList.add('expanded');
           }
       });
   }

   // Collapse all biomarkers for a panel
   function collapseAllBiomarkers(panelContainer) {
       const biomarkerElements = panelContainer.querySelectorAll('.biomarker-clickable');
       biomarkerElements.forEach(biomarkerElement => {
           const biomarkerName = biomarkerElement.getAttribute('data-biomarker');
           const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}`;
           
           const detailsContainer = document.getElementById(biomarkerKey);
           if (detailsContainer && detailsContainer.classList.contains('show')) {
               detailsContainer.classList.remove('show');
               biomarkerElement.classList.remove('expanded');
           }
       });
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
           let paragraphContent = `<h3>${panelName}</h3>`;
           
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
               paragraphContent += `<p><strong>Biomarkers/Tests:</strong><br>${formattedBiomarkers.join('<br>')}</p>`;
               
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

   // Helper function to parse biomarkers list
   function parseBiomarkersList(text) {
       if (!text) return [];
       
       const biomarkers = text
           .split(/[,;|\n\r]+/)
           .map(item => item.trim())
           .filter(item => item.length > 0);
       
       return biomarkers;
   }

   // Additional functions for biomarker-centric searching
// Add these functions to your existing code

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
function filterContentWithBiomarkers() {
    const query = searchInput.value.trim().toLowerCase();
    
    // Remove any existing biomarker results
    const existingBiomarkerResults = document.querySelectorAll('.biomarker-result-container');
    existingBiomarkerResults.forEach(result => result.remove());
    
    // Remove existing search summary
    const existingSummary = document.getElementById('search-results-summary');
    if (existingSummary) {
        existingSummary.remove();
    }
    
    // Early return for empty query
    if (query === '') {
        const allParagraphs = paragraphContainer.querySelectorAll('.content-paragraph');
        allParagraphs.forEach(p => p.classList.add('hide'));
        const existingNoResultsMessage = document.getElementById('noResultsMessage');
        if (existingNoResultsMessage) {
            existingNoResultsMessage.remove();
        }
        return;
    }
    
    // Find matching biomarkers
    const matchingBiomarkers = findMatchingBiomarkers(query);
    
    // Find matching panels (use original logic)
    const allParagraphs = paragraphContainer.querySelectorAll('.content-paragraph');
    let matchingPanels = 0;
    
    const toShow = [];
    const toHide = [];
    
    allParagraphs.forEach(p => {
        const keyword = p.getAttribute('data-keyword') || '';
        const category = p.getAttribute('data-category') || '';
        const biomarkers = p.getAttribute('data-biomarkers') || '';
        
        const matchesPanel = keyword.includes(query);
        const matchesCategory = category.includes(query);
        const matchesBiomarkers = biomarkers.includes(query);
        
        if (matchesPanel || matchesCategory || matchesBiomarkers) {
            toShow.push(p);
            matchingPanels++;
        } else {
            toHide.push(p);
        }
    });
    
    // Apply panel visibility changes
    toShow.forEach(p => p.classList.remove('hide'));
    toHide.forEach(p => p.classList.add('hide'));
    
    // Add biomarker results at the top
    if (matchingBiomarkers.length > 0) {
        matchingBiomarkers.forEach((biomarkerInfo, index) => {
            const biomarkerResult = createBiomarkerResult(biomarkerInfo, index);
            paragraphContainer.insertBefore(biomarkerResult, paragraphContainer.firstChild);
        });
    }
    
    // Add search results summary
    const totalResults = matchingBiomarkers.length + matchingPanels;
    if (totalResults > 0) {
        const summaryDiv = document.createElement('div');
        summaryDiv.id = 'search-results-summary';
        summaryDiv.className = 'search-results-summary';
        summaryDiv.innerHTML = `
            <strong>Search Results for "${query}":</strong> 
            ${matchingBiomarkers.length} biomarker(s) and ${matchingPanels} panel(s) found
        `;
        paragraphContainer.insertBefore(summaryDiv, paragraphContainer.firstChild);
    }
    
    // Handle no results message
    const existingNoResultsMessage = document.getElementById('noResultsMessage');
    
    if (totalResults === 0) {
        if (!existingNoResultsMessage) {
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
    } else {
        if (existingNoResultsMessage) {
            existingNoResultsMessage.remove();
        }
    }
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
    
    // Replace the existing filterContent function
    window.filterContent = filterContentWithBiomarkers;
    
    console.log('Biomarker search functionality initialized');
}

// Call this function after your existing loadContent() completes successfully
// Add this to your existing renderInitialParagraphs function at the end:
// initializeBiomarkerSearch();

   // Enhanced search function with better performance
   window.filterContent = function() {
       const query = searchInput.value.trim().toLowerCase();
       const allParagraphs = paragraphContainer.querySelectorAll('.content-paragraph');
       let foundMatch = false;

       // Early return for empty query
       if (query === '') {
           allParagraphs.forEach(p => p.classList.add('hide'));
           const existingNoResultsMessage = document.getElementById('noResultsMessage');
           if (existingNoResultsMessage) {
               existingNoResultsMessage.remove();
           }
           return;
       }

       // Batch DOM operations for better performance
       const toShow = [];
       const toHide = [];

       allParagraphs.forEach(p => {
           const keyword = p.getAttribute('data-keyword') || '';
           const category = p.getAttribute('data-category') || '';
           const biomarkers = p.getAttribute('data-biomarkers') || '';
           
           const matchesPanel = keyword.includes(query);
           const matchesCategory = category.includes(query);
           const matchesBiomarkers = biomarkers.includes(query);
           
           if (matchesPanel || matchesCategory || matchesBiomarkers) {
               toShow.push(p);
               foundMatch = true;
           } else {
               toHide.push(p);
           }
       });

       // Apply changes in batches
       toShow.forEach(p => p.classList.remove('hide'));
       toHide.forEach(p => p.classList.add('hide'));

       // Handle no results message
       const existingNoResultsMessage = document.getElementById('noResultsMessage');

       if (!foundMatch) {
           if (!existingNoResultsMessage) {
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
       } else {
           if (existingNoResultsMessage) {
               existingNoResultsMessage.remove();
           }
       }
   };

   // Render paragraphs
   function renderInitialParagraphs() {
       paragraphContainer.innerHTML = '';
       
       allContentData.forEach((item, index) => {
           // Create panel container
           const panelContainer = document.createElement('div');
           panelContainer.classList.add('panel-container', 'content-paragraph', 'hide');
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
       
       // Add click event listeners to biomarker elements
       document.addEventListener('click', function(e) {
           if (e.target.classList.contains('biomarker-clickable')) {
               const biomarkerName = e.target.getAttribute('data-biomarker');
               const loincCode = e.target.getAttribute('data-loinc');
               const panelContainer = e.target.closest('.panel-container');
               
               toggleBiomarkerDetails(e.target, biomarkerName, { loinc: loincCode }, panelContainer);
           }
       });
       
       console.log(`Rendered ${allContentData.length} paragraphs`);

       initializeBiomarkerSearch();
   }

   // Make functions globally available
   window.expandAllBiomarkers = expandAllBiomarkers;
   window.collapseAllBiomarkers = collapseAllBiomarkers;

   // Initialize
   addExpandableStyles();
   loadContent();
   showCacheStatus(); // Show cache status on load
   
   searchButton.addEventListener('click', filterContent);

   // Real-time search with proper debouncing
   let searchTimeout;
   searchInput.addEventListener('input', function() {
       // Clear any existing timeout
       if (searchTimeout) {
           clearTimeout(searchTimeout);
       }
       
       // Set a new timeout
       searchTimeout = setTimeout(() => {
           filterContent();
       }, 300);
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
});