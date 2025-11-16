function createContextMenu() {
    browser.contextMenus.removeAll(() => {
        browser.contextMenus.create({
            id: "track-card",
            title: "Track this card",
            contexts: ["all"],
            documentUrlPatterns: ["*://*.tcgplayer.com/*"],
        });
    });
}

browser.runtime.onInstalled.addListener(createContextMenu);
browser.runtime.onStartup.addListener(createContextMenu);

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "track-card") {
        browser.tabs.sendMessage(tab.id, { action: "trackCard" });
    }
});

// Handle API requests from popup (to avoid CORS issues)
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fetchProductInfo") {
        const searchRequest = message.searchRequest;
        
        fetch(
            'https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=false&mpfev=3217',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchRequest)
            }
        )
        .then(response => response.json())
        .then(data => {
            sendResponse({ 
                success: true, 
                results: data.results[0]?.results || [] 
            });
        })
        .catch(error => {
            console.error('Background fetch error:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                results: [] 
            });
        });
        
        // Return true to indicate we will send a response asynchronously
        return true;
    }
});