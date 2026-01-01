// Search functionality for Hacking Vault
(function() {
  'use strict';

  let searchIndex = null;
  let fuse = null;

  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const searchOverlay = document.getElementById('search-overlay');

  if (!searchInput || !searchResults || !searchOverlay) {
    return; // Search elements not found
  }

  // Load search index
  async function loadSearchIndex() {
    if (searchIndex) return;

    try {
      const response = await fetch('/index.json');
      searchIndex = await response.json();

      // Initialize Fuse.js with search options
      const fuseOptions = {
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'tags', weight: 0.3 },
          { name: 'categories', weight: 0.2 },
          { name: 'contents', weight: 0.1 }
        ],
        includeScore: true,
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2
      };

      fuse = new Fuse(searchIndex, fuseOptions);
    } catch (error) {
      console.error('Failed to load search index:', error);
    }
  }

  // Show search overlay
  function showSearch() {
    searchOverlay.classList.add('active');
    searchInput.focus();
    loadSearchIndex();
    document.body.style.overflow = 'hidden';
  }

  // Hide search overlay
  function hideSearch() {
    searchOverlay.classList.remove('active');
    searchInput.value = '';
    searchResults.innerHTML = '';
    document.body.style.overflow = '';
  }

  // Perform search
  function performSearch(query) {
    if (!fuse || query.length < 2) {
      searchResults.innerHTML = '';
      return;
    }

    const results = fuse.search(query);

    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
      return;
    }

    // Display results (limit to 10)
    const resultsHTML = results.slice(0, 10).map(result => {
      const item = result.item;
      const snippet = getSnippet(item.contents, query);
      const tags = item.tags ? item.tags.slice(0, 3).map(tag =>
        `<span class="search-tag">${tag}</span>`
      ).join('') : '';

      return `
        <a href="${item.permalink}" class="search-result-item">
          <div class="search-result-header">
            <span class="search-result-title">${highlightMatch(item.title, query)}</span>
            <span class="search-result-section">${item.section}</span>
          </div>
          <div class="search-result-snippet">${snippet}</div>
          ${tags ? `<div class="search-result-tags">${tags}</div>` : ''}
        </a>
      `;
    }).join('');

    searchResults.innerHTML = resultsHTML;
  }

  // Get snippet of content around search term
  function getSnippet(content, query) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) {
      return content.substring(0, 150) + '...';
    }

    const start = Math.max(0, index - 75);
    const end = Math.min(content.length, index + query.length + 75);
    let snippet = content.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return highlightMatch(snippet, query);
  }

  // Highlight matching text
  function highlightMatch(text, query) {
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Escape regex special characters
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Event listeners
  searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });

  // Close search on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
      hideSearch();
    }

    // Open search with / key
    if (e.key === '/' && !searchOverlay.classList.contains('active') &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      showSearch();
    }
  });

  // Close on overlay click
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
      hideSearch();
    }
  });

  // Expose showSearch globally for button clicks
  window.showSearch = showSearch;
  window.hideSearch = hideSearch;

})();
