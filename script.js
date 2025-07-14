// script.js

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const paragraphContainer = document.getElementById('paragraphContainer');
    const searchButton = document.getElementById('searchButton');
    const loadingSpinner = document.getElementById('loadingSpinner');

    let allContentData = [];
    let biomarkerUrlMap = new Map();
    let biomarkerToPanelsMap = new Map();
    let searchTimeout;
    let dataLoaded = false; // Flag to track if initial data has been loaded

    const CACHE_NAME_SW = 'labcorp_data_cache';
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzK3iC-xXKQubOI5Zr5Es7K2wivt9PTsXFdPoGFO4cKps12Alv8wUs_ILZd5KLjjbPgBQ/exec';

    function showSpinner() {
        if (loadingSpinner) {
            loadingSpinner.style.display = 'flex';
            paragraphContainer.style.display = 'none'; // Hide content container while loading
        }
    }

    function hideSpinner() {
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
            paragraphContainer.style.display = 'block'; // Show content container
        }
    }

    window.clearServiceWorkerCacheAndReload = async function() {
        if ('caches' in window) {
            try {
                await caches.delete(CACHE_NAME_SW);
                console.log('[SW] Cache cleared manually via frontend.');
            } catch (error) {
                console.error('[SW] Error clearing cache:', error);
            }
        } else {
            console.warn('Caches API not supported, cannot manually clear SW cache.');
        }
        location.reload();
    };

    function addExpandableStyles() {
        const expandableStyles = `
            <style>
                .panel-container {
                    background-color: #d7f5dc;
                    border: 2px solid #28a745;
                    border-radius: 8px;
                    padding: 16px 20px;
                    margin-bottom: 20px;
                    width: 620px;
                }
                .panel-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
                .panel-title { color: #28a745; font-size: 20px; font-weight: bold; margin: 0; }
                .panel-label { background-color: #28a745; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-right: 8px; }
                .panel-content { background-color: #fff; padding: 12px 16px; border-radius: 4px; }
                .expand-all-button { background-color: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-top: 10px; transition: background-color 0.3s; }
                .expand-all-button:hover { background-color: #218838; }
                .collapse-all-button { background-color: #2874e8ff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-top: 10px; margin-left: 10px; transition: background-color 0.3s; }
                .collapse-all-button:hover { background-color: #0f3884ff; }
                .biomarker-details-container { margin-top: 15px; padding-left: 20px; }
                .biomarker-detail-expanded { margin-bottom: 15px; padding: 12px; border-left: 4px solid #007bff; background-color: #f0f8ff; border-radius: 4px; display: none; animation: slideDown 0.3s ease-out; }
                .biomarker-detail-expanded.invalid-biomarker { border-left: 4px solid #dc3545; background-color: #ffeaea; }
                .biomarker-detail-expanded.show { display: block; }
                @keyframes slideDown {
                    from { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
                    to { opacity: 1; max-height: 500px; padding-top: 12px; padding-bottom: 12px; }
                }
                .biomarker-detail-expanded h4 { margin: 0 0 10px 0; color: #333; font-size: 16px; }
                .detail-item { margin: 5px 0; display: flex; align-items: flex-start; }
                .detail-label { font-weight: bold; color: #555; min-width: 120px; margin-right: 10px; }
                .detail-value { flex: 1; }
                .detail-link { color: #007bff; text-decoration: none; }
                .detail-link:hover { text-decoration: underline; }
                .biomarker-clickable { color: #007bff; cursor: pointer; text-decoration: underline; transition: color 0.2s; }
                .biomarker-clickable:hover { color: #0056b3; }
                .biomarker-clickable.expanded { color: #28a745; font-weight: bold; }
                .biomarker-clickable.invalid-biomarker { color: #dc3545; }
                .biomarker-clickable.invalid-biomarker:hover { color: #c82333; }
                .biomarker-clickable.invalid-biomarker.expanded { color: #dc3545; font-weight: bold; }
                .panel-toggle-header { cursor: pointer; display: flex; align-items: center; font-size: 16px; font-weight: bold; color: #28a745; user-select: none; gap: 6px; margin-bottom: 8px; }
                .panel-toggle-header:hover .panel-toggle-text { text-decoration: underline; }
                .panel-toggle-arrow { font-size: 14px; }
                .panel-container { max-width: 620px; margin: 0 auto 20px auto; transition: max-width 0.3s ease; }
                .panel-container.panel-expanded { max-width: 1200px; }
                .panel-wrapper { display: flex; justify-content: center; transition: all 0.3s ease; }
                .biomarker-details-container { max-width: 100%; transition: all 0.3s ease; }
                .associated-panel-container { margin-bottom: 10px; list-style: none; }
                .associated-panel-content { border: 1px solid #ccc; border-radius: 8px; padding: 12px; background-color: #fff; }
                .associated-panel-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
                .associated-panel-label { background-color: #28a745; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
                .associated-panel-title { font-weight: bold; font-size: 17px; color: #333; }
                .associated-panel-meta { font-size: 14px; color: #555; margin: 0; }
                .panel-content h3 { margin: 0; font-size: 20px; font-weight: bold; }
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
                .content-paragraph.hide {
                    display: none;
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
        document.head.insertAdjacentHTML('beforeend', expandableStyles);
    }

    // --- DELETED: addBiomarkerSearchStyles() function ---

    function isValidBiomarker(biomarkerName, loincCode) {
        if (biomarkerName.toLowerCase().includes('comment')) {
            return false;
        }
        if (!loincCode || loincCode.trim() === '') {
            return false;
        }
        const biomarkerKey = biomarkerName.toLowerCase();
        if (!biomarkerUrlMap.has(biomarkerKey)) {
            return false;
        }
        return true;
    }

    function renderInitialParagraphs() {
        const allBiomarkerElements = document.querySelectorAll('.biomarker-clickable');
        allBiomarkerElements.forEach(element => {
            const biomarkerName = element.getAttribute('data-biomarker');
            const loincCode = element.getAttribute('data-loinc');
            
            if (!isValidBiomarker(biomarkerName, loincCode)) {
                element.classList.add('invalid-biomarker');
            } else {
                element.classList.remove('invalid-biomarker');
            }
        });
        console.log(`Initial paragraphs prepared/styled. Total panels in data: ${allContentData.length}`);
    }

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

    function expandAllBiomarkers(panelContainer) {
        const biomarkerElements = panelContainer.querySelectorAll('.biomarker-clickable');
        let anyExpanded = false;

        biomarkerElements.forEach(biomarkerElement => {
            const biomarkerName = biomarkerElement.getAttribute('data-biomarker');
            const loincCode = biomarkerElement.getAttribute('data-loinc');
            const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}`;
            
            let detailsContainer = document.getElementById(biomarkerKey);

            if (!detailsContainer) {
                toggleBiomarkerDetails(biomarkerElement, biomarkerName, { loinc: loincCode }, panelContainer);
                anyExpanded = true;
            } else if (!detailsContainer.classList.contains('show')) {
                detailsContainer.classList.add('show');
                biomarkerElement.classList.add('expanded');
                anyExpanded = true;
            }
        });

        if (anyExpanded) {
            panelContainer.classList.add('panel-expanded');
        }
    }

    function collapseAllBiomarkers(panelContainer) {
        const biomarkerElements = panelContainer.querySelectorAll('.biomarker-clickable');
        let anyCollapsed = false;

        biomarkerElements.forEach(biomarkerElement => {
            const biomarkerName = biomarkerElement.getAttribute('data-biomarker');
            const biomarkerKey = `${panelContainer.id}-${biomarkerName.replace(/\s+/g, '-')}`;
            
            const detailsContainer = document.getElementById(biomarkerKey);
            if (detailsContainer && detailsContainer.classList.contains('show')) {
                detailsContainer.classList.remove('show');
                biomarkerElement.classList.remove('expanded');
                anyCollapsed = true;
            }
        });

        if (anyCollapsed) {
            panelContainer.classList.remove('panel-expanded');
        }
    }

    async function loadContentAndProcessData() {
        showSpinner();
        try {
            console.log('Loading data...');
            
            const response = await fetch(APPS_SCRIPT_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Unknown error from Apps Script');
            }
            
            console.log('Data loaded successfully (via SW or network)');
            console.log('Labcorp data rows:', data.data.labcorpData.length);
            console.log('Biomarkers data rows:', data.data.biomarkersData.length);
            
            biomarkerUrlMap = parseBiomarkersData(data.data.biomarkersData);
            allContentData = parseLabcorpData(data.data.labcorpData, biomarkerUrlMap);
            buildBiomarkerToPanelsMap();
            
            dataLoaded = true;

        } catch (error) {
            console.error('Error loading content:', error);
            paragraphContainer.innerHTML = `
                <div style="color: red; text-align: center;">
                    <p>Error loading content from Google Sheets.</p>
                    <p>${error.message}</p>
                    <p>Please check your Apps Script deployment or network connection.</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px;">Retry</button>
                    <button onclick="window.clearServiceWorkerCacheAndReload()" style="margin-top: 10px; padding: 5px 10px; margin-left: 10px;">Clear SW Cache & Retry</button>
                </div>
            `;
            dataLoaded = false;
        } finally {
            hideSpinner();
        }
    }    

    function parseBiomarkersData(biomarkersData) {
        const urlMap = new Map();
        
        if (!biomarkersData || biomarkersData.length < 2) {
            console.warn('No biomarker data found');
            return urlMap;
        }
        
        const headers = biomarkersData[0];
        console.log('Biomarkers headers:', headers);
        
        const nameColumn = findColumnIndex(headers, ['Biomarker']);
        const urlColumn = findColumnIndex(headers, ['LOINC url']);
        const descriptionColumn = findColumnIndex(headers, ['LOINC name']);
        const assayTypeColumn = findColumnIndex(headers, ['Assay type', 'Assay Type']);
        const kitUrlColumn = findColumnIndex(headers, ['Kit url', 'Kit URL']);
        
        console.log(`Found columns - Name: ${nameColumn}, URL: ${urlColumn}, Description: ${descriptionColumn}, Assay Type: ${assayTypeColumn}, Kit URL: ${kitUrlColumn}`);
        
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

    function parseLabcorpData(labcorpData, urlMap) {
        const contentData = [];
        
        if (!labcorpData || labcorpData.length < 2) {
            console.warn('No Labcorp data found');
            return contentData;
        }
        
        const headers = labcorpData[0];
        console.log('Labcorp headers:', headers);
        
        const urlColumn = findColumnIndex(headers, ['url']);
        const nameColumn = findColumnIndex(headers, ['name']);
        const cptColumn = findColumnIndex(headers, ['cpt']);
        const testNumberColumn = findColumnIndex(headers, ['test number']);
        
        console.log(`Found core columns - URL: ${urlColumn}, Name: ${nameColumn}, CPT: ${cptColumn}, Test Number: ${testNumberColumn}`);
        
        const biomarkerColumns = [];
        const loincColumns = [];
        
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
        
        for (let i = 1; i < labcorpData.length; i++) {
            const row = labcorpData[i];
            
            if (row.length === 0) continue;
            
            const url = urlColumn >= 0 && row[urlColumn] ? row[urlColumn].toString().trim() : '';
            const panelName = nameColumn >= 0 && row[nameColumn] ? row[nameColumn].toString().trim() : '';
            const cpt = cptColumn >= 0 && row[cptColumn] ? row[cptColumn].toString().trim() : '';
            const testNumber = testNumberColumn >= 0 && row[testNumberColumn] ? row[testNumberColumn].toString().trim() : '';
            
            if (!panelName) continue;
            
            const biomarkers = [];
            const biomarkerData = [];
            
            for (let j = 0; j < biomarkerColumns.length; j++) {
                const biomarkerIndex = biomarkerColumns[j];
                const loincIndex = loincColumns[j];
                
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
            
            const formattedBiomarkers = biomarkerData.map(biomarker => {
                let biomarkerHtml = `<span class="biomarker-clickable" data-biomarker="${biomarker.name}" data-loinc="${biomarker.loinc}">${biomarker.name}</span>`;
                
                if (biomarker.loinc) {
                    biomarkerHtml += ` <span class="loinc-code" style="color: #666;">(LOINC: ${biomarker.loinc})</span>`;
                }
                return biomarkerHtml;
            });
            
            let paragraphContent = `
             <div class="panel-header">
                 <span class="panel-label">PANEL</span>
                 <h3>${panelName}</h3>
             </div>`;

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
                biomarkerData: biomarkerData
            });
        }
        
        contentData.sort((a, b) => {
            const countA = a.biomarkers?.length || 0;
            const countB = b.biomarkers?.length || 0;
            return countB - countA;
        });

        console.log(`Created ${contentData.length} content entries`);
        return contentData;
    }

    function findColumnIndex(headers, possibleNames) {
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toString().toLowerCase().trim();
            if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
                return i;
            }
        }
        return -1;
    }

    // --- DELETED: parseBiomarkersList() function ---

    window.togglePanelList = function(panelListId, headerElement) {
        const panelList = document.getElementById(panelListId);
        const isVisible = panelList.style.display === 'block';

        panelList.style.display = isVisible ? 'none' : 'block';

        const arrow = headerElement.querySelector('.panel-toggle-arrow');
        if (arrow) {
            arrow.textContent = isVisible ? '▼' : '▲';
        }
    };

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

    // --- DELETED: createBiomarkerResult() function ---
    // --- DELETED: toggleBiomarkerExpansion() function ---
    // --- DELETED: togglePanelInBiomarkerView() function ---

    // --- THE ONLY FILTERING FUNCTION REMAINING (Corrected and simplified) ---
    function filterPanelsOnly() {
        const query = searchInput.value.trim().toLowerCase();

        // Clear everything first, including initial prompt and previous search results
        paragraphContainer.innerHTML = '';
        document.querySelectorAll('#search-results-summary, #noResultsMessage, #initialPrompt')
            .forEach(el => el.remove());

        // Handle empty query: show the initial prompt
        if (query === '') {
            paragraphContainer.innerHTML = `
                <p id="initialPrompt" style="text-align: center; color: #666; font-style: italic; margin-top: 30px;">
                    Click 'Search' or start typing to load data and find panels/biomarkers.
                </p>
            `;
            return; // Exit, no search to perform
        }

        const filteredPanels = allContentData.filter(item => {
            const keyword = item.keyword || '';
            const category = item.category || '';
            const biomarkers = (item.biomarkers || []).join(' '); // Include biomarkers for search within panels

            return keyword.includes(query) || category.includes(query) || biomarkers.includes(query);
        });

        if (filteredPanels.length > 0) {
            // Append a summary for results
            const summaryDiv = document.createElement('div');
            summaryDiv.id = 'search-results-summary';
            summaryDiv.className = 'search-results-summary';
            summaryDiv.innerHTML = `
                <strong>Search Results for "${query}":</strong>
                ${filteredPanels.length} panel(s) found
            `;
            paragraphContainer.appendChild(summaryDiv); // Append before panels

            filteredPanels.forEach((data, index) => {
                const panelWrapper = document.createElement('div');
                panelWrapper.classList.add('panel-wrapper');

                const panelContainer = document.createElement('div');
                panelContainer.classList.add('panel-container', 'content-paragraph');
                panelContainer.setAttribute('data-keyword', data.keyword);
                panelContainer.setAttribute('data-category', data.category || '');
                panelContainer.setAttribute('data-biomarkers', data.biomarkers ? data.biomarkers.join(' ') : '');
                panelContainer.id = `panel-${index}`;

                const panelContent = document.createElement('div');
                panelContent.classList.add('panel-content');
                panelContent.innerHTML = data.paragraph; // This contains the actual panel HTML structure

                panelContainer.appendChild(panelContent);
                panelWrapper.appendChild(panelContainer);
                paragraphContainer.appendChild(panelWrapper);

                // Apply biomarker styling for items within this panel after it's in DOM
                const panelBiomarkerElements = panelContainer.querySelectorAll('.biomarker-clickable');
                panelBiomarkerElements.forEach(element => {
                    const biomarkerName = element.getAttribute('data-biomarker');
                    const loincCode = element.getAttribute('data-loinc');
                    if (!isValidBiomarker(biomarkerName, loincCode)) {
                        element.classList.add('invalid-biomarker');
                    } else {
                        element.classList.remove('invalid-biomarker');
                    }
                });
            });
        } else {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.id = 'noResultsMessage';
            noResultsDiv.innerHTML = `
                <p style="text-align: center; color: #666; font-style: italic;">
                    No matching panel results found for "${query}"<br>
                    <small>Try searching for panel names or biomarker names</small>
                </p>`;
            paragraphContainer.appendChild(noResultsDiv);
        }
    }

    // --- Unified filterContent function (simplified as no more radio buttons) ---
    function filterContent() {
        filterPanelsOnly(); // Always call filterPanelsOnly now
    }

    // Make functions globally available for inline HTML onclicks
    window.expandAllBiomarkers = expandAllBiomarkers;
    window.collapseAllBiomarkers = collapseAllBiomarkers;
    window.togglePanelList = togglePanelList;
    window.filterContent = filterContent; // Make it globally accessible


    // --- Core Initialization Logic ---
    addExpandableStyles();

    // 2. Register Service Worker (only once)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        });
    } else {
        console.warn('Service Workers are not supported in this browser.');
    }

    // 3. Attach Event Listeners for search functionality (now triggers data load)
    searchButton.addEventListener('click', async () => {
        if (!dataLoaded) {
            await loadContentAndProcessData();
        }
        filterContent();
    });

    searchInput.addEventListener('input', function() {
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            if (!dataLoaded) {
                await loadContentAndProcessData();
            }
            filterContent();
        }, 300);
    });

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchButton.click();
        }
    });

    // Removed radio button listeners as they are removed from HTML.

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('biomarker-clickable')) {
            const biomarkerName = e.target.getAttribute('data-biomarker');
            const loincCode = e.target.getAttribute('data-loinc');
            const panelContainer = e.target.closest('.panel-container');
            
            toggleBiomarkerDetails(e.target, biomarkerName, { loinc: loincCode }, panelContainer);
        }
    });

    // Initial state: hide the spinner and show a prompt before any search
    hideSpinner();
    paragraphContainer.innerHTML = `
        <p id="initialPrompt" style="text-align: center; color: #666; font-style: italic; margin-top: 30px;">
            Click 'Search' or start typing to load data and find panels/biomarkers.
        </p>
    `;
});