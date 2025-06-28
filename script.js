document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const paragraphContainer = document.getElementById('paragraphContainer');
    const searchButton = document.getElementById('searchButton');

    let allContentData = []; // This array will hold our parsed content (keyword -> paragraph)

    // Function to load content from the "paneldata.txt" file 
    async function loadContent() {
        try {
            const response = await fetch('paneldata.txt'); 
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`); //if response not found, then declare error 
            }
            const panel_data = await response.text(); 

            allContentData = parseTextContent(panel_data); //array that holds all keywords and paragraphs 

            renderInitialParagraphs();
        } catch (error) {
            console.error('Error loading content:', error);
            paragraphContainer.innerHTML = '<p style="color: red; text-align: center;">Error loading content. Please check if text file exists and is correctly formatted.</p>'; //must add html/css info here as well for the message 
        }
    }

    function parseTextContent(rawText) {
        const parsedData = [];
        const lines = rawText.split('\n').filter(line => line.trim() !== ''); //split by line and trim 

        lines.forEach(line => {
            const firstColonIndex = line.indexOf(':');
            const keyword = line.substring(0, firstColonIndex).trim(); // Text before the first colon (aka panel name)
            const paragraph = line.substring(firstColonIndex + 1).trim(); // Text after the first colon (aka biomarkers and loinc ids)
            if (keyword && paragraph) { // Check if both keyword and paragraph exist
                parsedData.push({ //appending the data to the array
                    keyword: keyword.toLowerCase(), 
                    paragraph: paragraph // it recognizes the panels 
                }); //each element has a keyword and paragraph attribute
            }
            else{
                console.warn('Skipping line due to missing keyword or paragraph:', line);
            }
        });
        return parsedData;
    }


    // Function to create and add all paragraphs to the page
    function renderInitialParagraphs() {
        paragraphContainer.innerHTML = ''; 
        allContentData.forEach(item => {
            const p = document.createElement('p');
            // Add classes for styling and initial hiding
            p.classList.add('content-paragraph', 'hide'); //dynamically adding class here upon creating paragraph 
            // Store the keyword on the paragraph itself for easy lookup
            p.setAttribute('data-keyword', item.keyword.toLowerCase());
            // Set the actual paragraph text
            p.textContent = item.paragraph;
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

    // --- Event Listeners and Initial Load ---

    // Load content when the page first loads
    loadContent();

    // Attach click listener to the search button (though onkeyup provides live search)
    searchButton.addEventListener('click', filterContent);
});