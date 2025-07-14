document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const initialMessage = document.getElementById('initialMessage');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');

    let panelData = [];

    // Fetch data from the new JSON file
    async function loadData() {
        showLoading(true);
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            panelData = await response.json();
        } catch (error) {
            console.error('Failed to load panel data:', error);
            resultsContainer.innerHTML = `<p style="color: red; text-align: center;">Error: Could not load data.</p>`;
        } finally {
            showLoading(false);
        }
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingIndicator.style.display = 'block';
            initialMessage.style.display = 'none';
        } else {
            loadingIndicator.style.display = 'none';
        }
    }

    function renderResults(results) {
        // Clear previous results
        resultsContainer.innerHTML = '';

        // Hide or show info messages
        initialMessage.style.display = 'none';
        noResultsMessage.style.display = results.length === 0 ? 'block' : 'none';

        // Create and append result cards
        results.forEach(panel => {
            const card = document.createElement('div');
            card.className = 'result-card';

            const title = document.createElement('h2');
            title.className = 'panel-title';
            title.textContent = panel.panelName;

            const list = document.createElement('ul');
            list.className = 'biomarkers-list';

            panel.biomarkers.forEach(marker => {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = marker.url;
                link.textContent = marker.name;
                // For opening in a new tab. Commment this line if not needed.
                link.target = '_blank'; 
                listItem.appendChild(link);
                list.appendChild(listItem);
            });

            card.appendChild(title);
            card.appendChild(list);
            resultsContainer.appendChild(card);
        });
    }

    function filterData(query) {
        if (!query) {
            resultsContainer.innerHTML = '';
            initialMessage.style.display = 'block';
            noResultsMessage.style.display = 'none';
            return;
        }

        const lowerCaseQuery = query.toLowerCase();

        const filteredResults = panelData.filter(panel => {
            const nameMatch = panel.panelName.toLowerCase().includes(lowerCaseQuery);
            const aliasMatch = panel.aliases.some(alias => alias.toLowerCase().includes(lowerCaseQuery));
            return nameMatch || aliasMatch;
        });

        renderResults(filteredResults);
    }

    // Event Listener for live search
    searchInput.addEventListener('input', (e) => {
        filterData(e.target.value);
    });

    // Initial data load
    loadData();
});
