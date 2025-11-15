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
