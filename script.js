document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const paragraphContainer = document.getElementById('paragraphContainer');
    const searchButton = document.getElementById('searchButton');

    let allContentData = []; // This array will hold our parsed content (keyword -> paragraph)
    let biomarkerUrlMap = new Map(); //initialize map

    // Function to load content from the "paneldata.txt" and "biomarkerurl.txt" file 
    async function loadContent() {
        try {
            const contentResponse = await fetch('paneldata.txt');
            const urlsResponse = await fetch('biomarkerurl.txt'); //fetching the biomarker map file
            
            if (!contentResponse.ok) {
                if (contentResponse.status === 404) {
                    console.warn('Main data file (content.txt) not found on server. Please upload one.');
                    paragraphContainer.innerHTML = '<p style="text-align: center;">No main data file found on server. Please upload a content.txt file to get started.</p>';
                } 
                else {
                    throw new Error(`HTTP error! status: ${contentResponse.status} for content.txt`);
                }
                return;
            }

            let rawBiomarkerUrls = '';

            if (!urlsResponse.ok) {
                console.warn(`Biomarker URLs file (biomarker_urls.txt) not found or error: ${urlsResponse.status}. Biomarkers will not be clickable.`);
            // No need to throw an error here, just set an empty map
                biomarkerUrlMap = new Map(); 
            } else {
                rawBiomarkerUrls = await urlsResponse.text();
                biomarkerUrlMap = parseBiomarkerMap(rawBiomarkerUrls); // <--- Correctly assign the Map
            }

            const panel_data = await contentResponse.text(); 
            allContentData = parseTextContent(panel_data, biomarkerUrlMap); //parse the biomarker map file

            renderInitialParagraphs();
        } catch (error) {
            console.error('Error loading content:', error);
            paragraphContainer.innerHTML = '<p style="color: red; text-align: center;">Error loading content. Please check if text file exists and is correctly formatted.</p>'; //must add html/css info here as well for the message 
        }
    }

    function parseBiomarkerMap(rawText) { //map panel names to urls 
        const mapData = new Map();
        const lines = rawText.split('\n').filter(line => line.trim() !== ''); //split by new line and trim

        lines.forEach(line => {
            const firstIndex = line.indexOf(':'); //find the first index of :
            if (firstIndex>0 && firstIndex<line.length - 1) {
                const biomarker_name = line.substring(0, firstIndex).trim(); // Get the panel name before the colon
                const url = line.substring(firstIndex + 1).trim(); // Get the URL after the colon
                if (biomarker_name && url) { // Check if both panel name and URL exist
                    mapData.set(biomarker_name.toLowerCase(), url); // Store in the map with panel name as key
                }
            } else {
                console.warn('Skipping line due to missing panel name or URL:', line);
            }
        });

        return mapData; 

    }

    function parseTextContent(rawText, mapData) {
        const parsedData = [];
        const entries = rawText.split('---').filter(entry => entry.trim() !== ''); //split by --- and trim 

        entries.forEach(entry => {
            entry = entry.trim(); 
            if(!entry)
                return;

            const lines = entry.split('\n').filter(line => line.trim() !== ''); //split by new line and trim
            
            if (lines.length === 0) {
                console.warn('Skipping empty entry:', entry);
                return;
            }
            const panel_name = lines[0].trim(); // First line is the keyword
        
            let formattedbiomarkerlines = [];
            if(lines.length > 1){
                const biomarkerlines = lines.slice(1);
                biomarkerlines.forEach(line => {
                    const trimmedLine = line.trim();
                    if(!trimmedLine){
                        return;
                    }
                    let biomarkerText = trimmedLine;
                    let biomarkerurl = '#';
                    if(mapData.has(biomarkerText.toLowerCase())){
                        biomarkerurl = mapData.get(biomarkerText.toLowerCase()); // get associated url from biomarker name 
                    }
                    else{
                        console.warn('No URL found for biomarker:', trimmedLine);
                    }

                    formattedbiomarkerlines.push(`<a href="${biomarkerurl}" class="biomarker-link">${biomarkerText}</a>`); //formatting the biomarker text with url
                });
            }

            const fullbiomarkerurls = formattedbiomarkerlines.join('<br>');  
        
            if(panel_name){
                const panel_keyword = panel_name.toLowerCase();
                parsedData.push({ //appending the data to the array
                    keyword: panel_keyword, 
                    paragraph: `<h3>${panel_name}</h3>` + 
                                    `<strong>Biomarker(s):</strong>` + '<br>' +
                                    fullbiomarkerurls,
                });
            } else{
                console.warn('Skipping entry block due to missing panel name (first line is empty):', trimmedEntryBlock);
            }
        });

        return parsedData;
    }


    // Function to create and add all paragraphs to the page
    function renderInitialParagraphs() {
        paragraphContainer.innerHTML = ''; 
        allContentData.forEach(item => {
            const p = document.createElement('p');
            p.classList.add('content-paragraph', 'hide'); //dynamically adding class here upon creating paragraph 
            p.setAttribute('data-keyword', item.keyword.toLowerCase());
            // Set the actual paragraph text
            p.innerHTML = item.paragraph;
            // Add the paragraph to our container on the page
            paragraphContainer.appendChild(p);
        });
    }

    window.filterContent = function() {
        const query = searchInput.value.trim().toLowerCase(); // Get input, remove spaces, make lowercase

        // Get all paragraph elements we previously added
        const allParagraphs = paragraphContainer.querySelectorAll('.content-paragraph');

        let foundMatch = false; // Flag to track if any paragraph matches the query

        allParagraphs.forEach(p => {
            const keyword = p.getAttribute('data-keyword'); // Get the keyword for this paragraph
            
            // Check if the paragraph's keyword includes the search query AND the query isn't empty
            if (keyword && keyword.includes(query) && query !== '') {
                p.classList.remove('hide'); // Show the paragraph
                foundMatch = true; // Set flag to true as a match was found
            } else {
                p.classList.add('hide'); // Hide the paragraph
            }

        });

        // Handle the "No results found" message
        const existingNoResultsMessage = document.getElementById('noResultsMessage');

        if (!foundMatch && query !== '') { // If no match was found AND the search query is not empty
            if (!existingNoResultsMessage) { // Only create if it doesn't already exist
                const noResultsDiv = document.createElement('div');
                noResultsDiv.id = 'noResultsMessage';
                noResultsDiv.textContent = 'No matching results found.';
                paragraphContainer.appendChild(noResultsDiv);
            }
        } else { // If a match was found, or the query is empty, remove any existing "no results" message
            if (existingNoResultsMessage) {
                existingNoResultsMessage.remove();
            }
        }

        // If the search input is cleared, hide all paragraphs and remove the "no results" message
        if (query === '') {
            allParagraphs.forEach(p => p.classList.add('hide'));
            if (existingNoResultsMessage) {
                existingNoResultsMessage.remove();
            }
        }
    };

    // Load content when the page first loads
    loadContent();

    searchButton.addEventListener('click', filterContent);
});
