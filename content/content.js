let lastRightClickedCard = null;

// Save the card the user right-clicked
document.addEventListener("contextmenu", (event) => {
    const card = event.target.closest("div.product-card__content");
    if (card) {
        lastRightClickedCard = card;
    } else {
        lastRightClickedCard = null;
    }
});

// When the context menu is clicked
browser.runtime.onMessage.addListener(async (message) => {
    if (message.action === "trackCard" && lastRightClickedCard) {
        const nameEl = lastRightClickedCard.querySelector(
            ".product-card__title.truncate"
        );
        const priceEl = lastRightClickedCard.querySelector(
            ".product-card__market-price--value"
        );
        const imageEl = lastRightClickedCard.querySelector(
            ".v-lazy-image-loaded"
        );
        const cardSetEl = lastRightClickedCard.querySelector(
            ".product-card__set-name__variant"
        );
        const cardSetIdEl = lastRightClickedCard.querySelector(
            ".product-card__rarity__variant"
        );
        const cardSetIdElSpans = cardSetIdEl?.querySelectorAll("span") || [];

        if (
            nameEl &&
            priceEl &&
            imageEl &&
            cardSetEl &&
            cardSetIdElSpans.length >= 2
        ) {
            const cardData = {
                name: nameEl.textContent.trim(),
                price: parseFloat(priceEl.textContent.replace("$", "").trim()),
                setName: cardSetEl.textContent.trim(),
                setId: cardSetIdElSpans[1].textContent.trim(),
                image: imageEl.src,
                quantity: 1,
            };

            const result = await browser.storage.local.get("trackedCards");
            const tracked = result.trackedCards || [];

            const isDuplicate = tracked.some(
                (c) =>
                    c.name === cardData.name &&
                    c.setId === cardData.setId &&
                    c.setName === cardData.setName
            );

            if (!isDuplicate) {
                tracked.push(cardData);
                await browser.storage.local.set({ trackedCards: tracked });
            }
        }
    }
});
