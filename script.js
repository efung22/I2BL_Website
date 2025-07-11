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
       
       console.log(`Found columns - Name: ${nameColumn}, URL: ${urlColumn}, Description: ${descriptionColumn}`);
       
       // Process data rows (skip header row)
       for (let i = 1; i < biomarkersData.length; i++) {
           const row = biomarkersData[i];
           
           if (row.length === 0) continue;
           
           const name = nameColumn >= 0 && row[nameColumn] ? row[nameColumn].toString().trim() : '';
           const url = urlColumn >= 0 && row[urlColumn] ? row[urlColumn].toString().trim() : '';
           const description = descriptionColumn >= 0 && row[descriptionColumn] ? row[descriptionColumn].toString().trim() : '';
           
           if (name) {
               urlMap.set(name.toLowerCase(), {
                   url: url || '#',
                   description: description || ''
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
           
           // Create formatted biomarker display with LOINC codes
           const formattedBiomarkers = biomarkerData.map(biomarker => {
               const biomarkerKey = biomarker.name.toLowerCase();
               const biomarkerInfo = urlMap.get(biomarkerKey);
               
               let biomarkerHtml = '';
               if (biomarkerInfo && biomarkerInfo.url !== '#') {
                   const title = biomarkerInfo.description ? ` title="${biomarkerInfo.description}"` : '';
                   biomarkerHtml = `<a href="${biomarkerInfo.url}" class="biomarker-link" target="_blank"${title}>${biomarker.name}</a>`;
               } else {
                   biomarkerHtml = `<span class="biomarker-text">${biomarker.name}</span>`;
               }
               
               // Add LOINC code if available
               if (biomarker.loinc) {
                   biomarkerHtml += ` <span class="loinc-code">(LOINC: ${biomarker.loinc})</span>`;
               }
               
               return biomarkerHtml;
           });
           
           // Create content paragraph
           let paragraphContent = `<h3>${panelName}</h3>`;
           
           // Add URL if available
           if (url) {
               paragraphContent += `<p><strong>URL:</strong> <a href="${url}" target="_blank">${url}</a></p>`;
           }
           
           if (cpt) {
               paragraphContent += `<p><strong>CPT Code:</strong> ${cpt}</p>`;
           }
           
           if (testNumber) {
               paragraphContent += `<p><strong>Test Number:</strong> ${testNumber}</p>`;
           }
           
           if (formattedBiomarkers.length > 0) {
               paragraphContent += `<p><strong>Biomarkers/Tests:</strong><br>${formattedBiomarkers.join('<br>')}</p>`;
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
       
       allContentData.forEach(item => {
           const p = document.createElement('p');
           p.classList.add('content-paragraph', 'hide');
           p.setAttribute('data-keyword', item.keyword);
           p.setAttribute('data-category', item.category || '');
           p.setAttribute('data-biomarkers', item.biomarkers ? item.biomarkers.join(' ') : '');
           p.innerHTML = item.paragraph;
           paragraphContainer.appendChild(p);
       });
       
       console.log(`Rendered ${allContentData.length} paragraphs`);
   }

   // Initialize
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