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
        const cardUrlEl = lastRightClickedCard.querySelector("a[href]");
        const cardSetIdElSpans = cardSetIdEl?.querySelectorAll("span") || [];
        const marketPriceEl = lastRightClickedCard.querySelector(
            ".product-card__market-price--value"
        );
        const lowestPriceEl = lastRightClickedCard.querySelector(
            ".inventory__price-with-shipping"
        );

        if (
            nameEl &&
            priceEl &&
            imageEl &&
            cardSetEl &&
            cardUrlEl &&
            cardSetIdElSpans.length >= 2
        ) {
            // Extract product ID from URL if available
            const urlMatch = cardUrlEl.href.match(/\/product\/(\d+)/);
            const productId = urlMatch ? parseInt(urlMatch[1], 10) : null;

            // Extract card number from rarity variant element
            // Card number is typically in the first span (e.g., "OP13-002")
            let cardNumber = null;
            if (cardSetIdEl && cardSetIdElSpans.length > 0) {
                // Try to get card number from first span
                const firstSpanText = cardSetIdElSpans[0]?.textContent?.trim();
                // Card number format is like "OP13-002" (letters, numbers, dash, numbers)
                const cardNumberMatch = firstSpanText?.match(/^([A-Z0-9]+-\d+)/);
                if (cardNumberMatch) {
                    cardNumber = cardNumberMatch[1];
                } else {
                    // Try the full text content of the element
                    const fullText = cardSetIdEl.textContent?.trim();
                    const fullMatch = fullText?.match(/([A-Z0-9]+-\d+)/);
                    if (fullMatch) {
                        cardNumber = fullMatch[1];
                    }
                }
            }

            const cardData = {
                name: nameEl.textContent.trim(),
                price: parseFloat(priceEl.textContent.replace("$", "").trim()),
                marketPrice: parseFloat(marketPriceEl.textContent.replace("$", "").trim()),
                lowestPrice: parseFloat(lowestPriceEl.textContent.replace("$", "").trim()),
                setName: cardSetEl.textContent.trim(),
                setId: cardSetIdElSpans[1].textContent.trim(),
                image: imageEl.src,
                quantity: 1,
                url: cardUrlEl.href, // Use the full URL from the <a> element
                productId: productId,
                cardNumber: cardNumber
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
