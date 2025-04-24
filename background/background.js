browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
        id: "track-card",
        title: "Track this card",
        contexts: ["all"],
        documentUrlPatterns: ["*://*.tcgplayer.com/*"],
    });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "track-card") {
        browser.tabs.sendMessage(tab.id, { action: "trackCard" });
    }
});
