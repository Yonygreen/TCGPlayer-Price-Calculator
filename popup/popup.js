let cachedCards = [];
let discountPercent = 0;
let discountInput = null;
let priceType = "market"; // "market" or "lowest"
let priceTypeToggle = null;
let importPreference = "lowest"; // "lowest" or "bling"
let importPreferenceSelect = null;
const DISCOUNT_STORAGE_KEY = "discountPercent";
const PRICE_TYPE_STORAGE_KEY = "priceType";
const IMPORT_PREFERENCE_KEY = "importPreference";

async function loadCards() {
    try {
        const result = await browser.storage.local.get("trackedCards");
        const cards = result.trackedCards || [];
        cachedCards = cards;
        const cardList = document.getElementById("cardList");
        if (!cardList) {
            console.error('cardList element not found');
            return;
        }
        cardList.textContent = "";

        cards.forEach((card, index) => {
        const cardContainer = document.createElement("div");
        cardContainer.className = "card mb-3 p-2";
        if (isBigPopup()) {
            cardContainer.classList.add("fixed-card-width");
        }

        const row = document.createElement("div");
        row.className = "row g-2 align-items-center";

        const imageCol = document.createElement("div");
        imageCol.className = "col-3";

        const link = document.createElement("a");
        link.href = card.url;
        link.target = "_blank";
        link.rel = "noopener";

        const image = document.createElement("img");
        image.src = card.image;
        image.alt = card.name;
        image.className = "img-fluid rounded-start";

        link.appendChild(image);
        imageCol.appendChild(link);

        const textCol = document.createElement("div");
        textCol.className = "col-9";

        const nameHeading = document.createElement("h6");
        nameHeading.className = "mb-1";
        nameHeading.textContent = card.name;

        const setParagraph = document.createElement("p");
        setParagraph.className = "mb-1 text-muted";
        setParagraph.textContent = `Set: ${card.setName} (${card.setId})`;

        const priceParagraph = document.createElement("p");
        priceParagraph.className = "mb-1 text-muted";
        const displayPrice = priceType === "lowest" && card.lowestPrice 
            ? card.lowestPrice 
            : (card.marketPrice || card.price);
        priceParagraph.textContent = `Price: $${displayPrice.toFixed(2)}`;

        const quantityLabel = document.createElement("label");
        quantityLabel.className = "form-label mb-0";
        quantityLabel.style.fontSize = "0.9rem";
        quantityLabel.textContent = "Quantity:";

        const inputWrapper = document.createElement("div");
        inputWrapper.className = "d-flex align-items-center";
        // Make wrapper wrap in bigpopup if needed
        if (isBigPopup()) {
            inputWrapper.style.flexWrap = "wrap";
            inputWrapper.style.gap = "0.25rem";
        }

        const quantityInput = document.createElement("input");
        quantityInput.type = "number";
        quantityInput.min = "1";
        quantityInput.value = card.quantity;
        quantityInput.dataset.index = index;
        quantityInput.className = "form-control form-control-sm me-2";
        quantityInput.style.width = "80px";

        const removeButton = document.createElement("button");
        removeButton.className = "btn btn-danger btn-sm";
        removeButton.textContent = "Remove";

        // Add "Switch Version" button if card has a card number
        // For cards without cardNumber, try to look it up from productId
        const switchVersionButton = document.createElement("button");
        switchVersionButton.className = "btn btn-secondary btn-sm me-2";
        // Use shorter text in bigpopup mode to save space
        switchVersionButton.textContent = isBigPopup() ? "Switch" : "Switch Version";
        switchVersionButton.dataset.index = index;
        switchVersionButton.style.display = 'none'; // Hide initially
        // Make button more compact in bigpopup
        if (isBigPopup()) {
            switchVersionButton.style.fontSize = "0.75rem";
            switchVersionButton.style.padding = "0.25rem 0.5rem";
        }
        
        // Try to find card number
        if (card.cardNumber) {
            switchVersionButton.style.display = 'inline-block';
            switchVersionButton.addEventListener("click", () => showVersionModal(card, index));
        } else if (card.productId) {
            // Try to look up card number from product ID
            loadCardMapping().then(async (mapping) => {
                if (mapping) {
                    for (const [cardNumber, productIds] of Object.entries(mapping)) {
                        if (productIds.includes(card.productId)) {
                            card.cardNumber = cardNumber;
                            switchVersionButton.style.display = 'inline-block';
                            switchVersionButton.addEventListener("click", () => showVersionModal(card, index));
                            // Update stored card with card number
                            const result = await browser.storage.local.get("trackedCards");
                            const trackedCards = result.trackedCards || [];
                            if (trackedCards[index]) {
                                trackedCards[index].cardNumber = cardNumber;
                                await browser.storage.local.set({ trackedCards: trackedCards });
                            }
                            break;
                        }
                    }
                }
            });
        }
        
        // Add buttons in correct order: switch button (if visible), quantity input, remove button
        inputWrapper.appendChild(switchVersionButton);
        inputWrapper.appendChild(quantityInput);
        inputWrapper.appendChild(removeButton);

        textCol.appendChild(nameHeading);
        textCol.appendChild(setParagraph);
        textCol.appendChild(priceParagraph);
        textCol.appendChild(quantityLabel);
        textCol.appendChild(inputWrapper);

        row.appendChild(imageCol);
        row.appendChild(textCol);

        cardContainer.appendChild(row);
        cardList.appendChild(cardContainer);
        });

        // Only add Reset All button for popup (not bigpopup)
    if (!isBigPopup()) {
        const buttonDiv = document.createElement("div");
        buttonDiv.className = "text-center";

        const resetButton = document.createElement("button");
        resetButton.className = "btn btn-danger w-40";
        resetButton.id = "clear-button";
        resetButton.textContent = "Reset All";
        resetButton.onclick = async () => {
            await browser.storage.local.set({ trackedCards: [] });
            loadCards();
        };

        buttonDiv.appendChild(resetButton);
        cardList.appendChild(buttonDiv);
    } else {
        // In bigpopup, attach the event to the button outside cardList
        const clearBtn = document.getElementById("clear-button");
        if (clearBtn) {
            clearBtn.onclick = async () => {
                await browser.storage.local.set({ trackedCards: [] });
                loadCards();
            };
        }
    }

    cardList.addEventListener("change", async (event) => {
        if (event.target.tagName === "INPUT") {
            const index = parseInt(event.target.dataset.index, 10);
            const quantity = parseInt(event.target.value, 10);
            if (quantity <= 0) {
                cards[index].quantity = 1;
                event.target.value = 1;
            } else {
                cards[index].quantity = quantity;
            }
            await browser.storage.local.set({ trackedCards: cards });
            updateTotal(cards);
        }
    });

    const removeButtons = cardList.querySelectorAll(".btn-danger.btn-sm");
    removeButtons.forEach((button, index) => {
        button.addEventListener("click", async () => {
            cards.splice(index, 1);
            await browser.storage.local.set({ trackedCards: cards });
            loadCards();
        });
    });
    
    updateTotal(cards);
    } catch (error) {
        console.error('Error loading cards:', error);
    }
}

function updateTotal(cards = cachedCards) {
    const totalPriceDiv = document.getElementById("totalPrice");
    if (!totalPriceDiv) {
        return;
    }

    const sum = cards.reduce((acc, card) => {
        const cardPrice = priceType === "lowest" && card.lowestPrice
            ? card.lowestPrice
            : (card.marketPrice || card.price);
        return acc + cardPrice * card.quantity;
    }, 0);

    const discountAmount = sum * (discountPercent / 100);
    const discountedTotal = sum - discountAmount;

    if (discountPercent > 0 && sum > 0) {
        totalPriceDiv.textContent = `Total: $${discountedTotal.toFixed(
            2
        )} (${discountPercent.toFixed(2)}% off, saved $${discountAmount.toFixed(
            2
        )})`;
    } else {
        totalPriceDiv.textContent = `Total: $${sum.toFixed(2)}`;
    }

    const summaryDiv = document.getElementById("discountSummary");
    if (summaryDiv) {
        if (sum > 0 && discountPercent > 0) {
            summaryDiv.textContent = `Original total: $${sum.toFixed(
                2
            )} • Savings: $${discountAmount.toFixed(2)}`;
        } else {
            summaryDiv.textContent = "";
        }
    }
}

function isBigPopup() {
    return window.location.pathname.endsWith("bigpopup.html");
}

async function initDiscountControls() {
    const container = document.getElementById("discountControls");
    if (!container) {
        return;
    }

    const stored = await browser.storage.local.get([DISCOUNT_STORAGE_KEY, PRICE_TYPE_STORAGE_KEY]);
    const storedValue = stored[DISCOUNT_STORAGE_KEY];
    discountPercent = sanitizeDiscountValue(
        typeof storedValue === "number" ? storedValue : 0
    );
    
    priceType = stored[PRICE_TYPE_STORAGE_KEY] || "market";

    container.textContent = "";

    const controlsRow = document.createElement("div");
    controlsRow.className = isBigPopup()
        ? "d-flex justify-content-center flex-wrap"
        : "d-flex justify-content-end flex-wrap";
    controlsRow.style.gap = "0.5rem";
    controlsRow.style.alignItems = "center";

    const inputGroup = document.createElement("div");
    inputGroup.className = "input-group input-group-sm";

    const prepend = document.createElement("span");
    prepend.className = "input-group-text";
    prepend.textContent = "Discount %";

    discountInput = document.createElement("input");
    discountInput.type = "number";
    discountInput.id = "discountPercentageInput";
    discountInput.min = "0";
    discountInput.max = "100";
    discountInput.step = "0.01";
    discountInput.value =
        discountPercent % 1 === 0
            ? discountPercent.toFixed(0)
            : discountPercent.toFixed(2);
    discountInput.className = "form-control";
    discountInput.style.minWidth = "120px";
    discountInput.addEventListener("input", handleDiscountInput);

    inputGroup.appendChild(prepend);
    inputGroup.appendChild(discountInput);

    controlsRow.appendChild(inputGroup);

    // Price type toggle
    const priceTypeWrapper = document.createElement("div");
    priceTypeWrapper.className = "d-flex align-items-center gap-2";
    
    const priceTypeLabel = document.createElement("label");
    priceTypeLabel.className = "form-label mb-0";
    priceTypeLabel.style.fontSize = "0.875rem";
    priceTypeLabel.textContent = "Price:";
    priceTypeLabel.setAttribute("for", "priceTypeToggle");
    
    const toggleWrapper = document.createElement("div");
    toggleWrapper.className = "form-check form-switch";
    
    priceTypeToggle = document.createElement("input");
    priceTypeToggle.type = "checkbox";
    priceTypeToggle.className = "form-check-input";
    priceTypeToggle.id = "priceTypeToggle";
    priceTypeToggle.checked = priceType === "lowest";
    priceTypeToggle.addEventListener("change", handlePriceTypeToggle);
    
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "form-check-label";
    toggleLabel.setAttribute("for", "priceTypeToggle");
    toggleLabel.style.fontSize = "0.875rem";
    toggleLabel.textContent = priceType === "lowest" ? "Lowest" : "Market";
    
    toggleWrapper.appendChild(priceTypeToggle);
    toggleWrapper.appendChild(toggleLabel);
    
    priceTypeWrapper.appendChild(priceTypeLabel);
    priceTypeWrapper.appendChild(toggleWrapper);
    
    controlsRow.appendChild(priceTypeWrapper);

    container.appendChild(controlsRow);

    const summary = document.createElement("div");
    summary.id = "discountSummary";
    summary.className = isBigPopup()
        ? "small text-muted mt-2 text-center w-100"
        : "small text-muted mt-2";
    container.appendChild(summary);
}

function sanitizeDiscountValue(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return 0;
    }
    return Math.min(Math.max(value, 0), 100);
}

function handleDiscountInput(event) {
    const raw = parseFloat(event.target.value);

    if (Number.isNaN(raw)) {
        discountPercent = 0;
        browser.storage.local.set({ [DISCOUNT_STORAGE_KEY]: discountPercent });
        updateTotal();
        return;
    }

    const clamped = sanitizeDiscountValue(raw);
    if (clamped !== raw) {
        event.target.value =
            clamped % 1 === 0 ? clamped.toFixed(0) : clamped.toFixed(2);
    }

    discountPercent = clamped;
    browser.storage.local.set({ [DISCOUNT_STORAGE_KEY]: discountPercent });
    updateTotal();
}

function handlePriceTypeToggle(event) {
    priceType = event.target.checked ? "lowest" : "market";
    browser.storage.local.set({ [PRICE_TYPE_STORAGE_KEY]: priceType });
    
    // Update label text
    const label = event.target.nextElementSibling;
    if (label) {
        label.textContent = priceType === "lowest" ? "Lowest" : "Market";
    }
    
    // Reload cards to update prices
    loadCards();
}

// Deck import functions
function parseDeckList(deckListText) {
    if (!deckListText || typeof deckListText !== 'string') {
        return [];
    }
    
    // Normalize whitespace - replace all types of whitespace with single space
    // This handles tabs, multiple spaces, newlines, etc.
    const normalized = deckListText
        .replace(/[\r\n\t]+/g, ' ')  // Replace newlines/tabs with space
        .replace(/\s+/g, ' ')         // Collapse multiple spaces to single space
        .trim();
    
    // Use regex to find all matches in the entire string
    // This works whether entries are on separate lines or all on one line
    // Matches: "4xOP13-016", "1xOP13-002", "4 x OP13-016", etc.
    const regex = /(\d+)\s*x\s*([A-Z0-9]+-\d+)/gi;
    const matches = [...normalized.matchAll(regex)];
    
    const deckEntries = [];
    
    for (const match of matches) {
        const quantity = parseInt(match[1], 10);
        const cardNumber = match[2].toUpperCase();
        if (quantity > 0 && cardNumber) {
            deckEntries.push({ quantity, cardNumber });
        }
    }
    
    // Better logging for Firefox console
    console.log('Parsed deck entries:', deckEntries);
    console.log('Total entries:', deckEntries.length);
    if (deckEntries.length > 0) {
        console.table(deckEntries);
        console.log('First entry:', JSON.parse(JSON.stringify(deckEntries[0])));
    }
    return deckEntries;
}

async function loadCardMapping() {
    try {
        const response = await fetch(browser.runtime.getURL('card_number_to_product_ids.json'));
        return await response.json();
    } catch (error) {
        console.error('Failed to load card mapping:', error);
        return null;
    }
}

async function fetchProductInfo(productIds) {
    if (productIds.length === 0) return [];
    
    const searchRequest = {
        algorithm: "sales_synonym_v2",
        from: 0,
        size: productIds.length,
        filters: {
            term: {
                productLineName: ["one-piece-card-game"],
                productTypeName: ["Cards"],
                productId: productIds
            },
            range: {},
            match: {}
        },
        listingSearch: {
            context: { cart: {} },
            filters: {
                term: {
                    sellerStatus: "Live",
                    channelId: 0
                },
                range: {
                    quantity: { gte: 1 }
                },
                exclude: {
                    channelExclusion: 0
                }
            }
        },
        context: {
            cart: {},
            shippingCountry: "US",
            userProfile: {}
        },
        settings: {
            useFuzzySearch: true,
            didYouMean: {}
        },
        sort: {
            field: "market-price",
            order: "desc"
        }
    };
    
    try {
        // Route through background script to avoid CORS issues
        const response = await browser.runtime.sendMessage({
            action: "fetchProductInfo",
            searchRequest: searchRequest
        });
        
        if (response.success) {
            console.log(`Fetched ${response.results.length} products for ${productIds.length} product IDs`);
            if (response.results.length > 0) {
                console.log('Sample product:', JSON.parse(JSON.stringify(response.results[0])));
            }
            return response.results;
        } else {
            console.error('Failed to fetch product info:', response.error);
            return [];
        }
    } catch (error) {
        console.error('Failed to fetch product info:', error);
        return [];
    }
}

function findBestProduct(products, preference = "lowest") {
    if (products.length === 0) return null;
    
    // Filter out products without market price
    const productsWithPrice = products.filter(product => 
        product.marketPrice != null && 
        product.marketPrice !== undefined && 
        !isNaN(product.marketPrice) &&
        product.marketPrice > 0
    );
    
    if (productsWithPrice.length === 0) return null;
    
    // Sort products by market price
    const sorted = productsWithPrice.sort((a, b) => {
        const priceA = a.marketPrice;
        const priceB = b.marketPrice;
        return priceA - priceB;
    });
    
    // Return cheapest (first) or most expensive (last) based on preference
    return preference === "bling" ? sorted[sorted.length - 1] : sorted[0];
}

function convertProductToCardData(product, quantity, cardNumber = null) {
    return {
        name: product.productName,
        price: product.marketPrice || 0,
        marketPrice: product.marketPrice || 0,
        lowestPrice: product.lowestPrice || product.lowestPriceWithShipping || product.marketPrice || 0,
        setName: product.setName,
        setId: product.setId?.toString() || '',
        image: `https://tcgplayer-cdn.tcgplayer.com/product/${product.productId}_200w.jpg`,
        quantity: quantity,
        url: `https://www.tcgplayer.com/product/${product.productId}`,
        productId: product.productId,
        cardNumber: cardNumber || product.customAttributes?.number || null
    };
}

async function showVersionModal(currentCard, cardIndex) {
    if (!currentCard.cardNumber) {
        alert('Card number not available for this card');
        return;
    }

    // Load card mapping
    const cardMapping = await loadCardMapping();
    if (!cardMapping) {
        alert('Failed to load card mapping');
        return;
    }

    const productIds = cardMapping[currentCard.cardNumber];
    if (!productIds || productIds.length === 0) {
        alert('No other versions found for this card');
        return;
    }

    // Fetch all product info
    const products = await fetchProductInfo(productIds);
    if (products.length === 0) {
        alert('Failed to fetch product information');
        return;
    }

    // Filter products with valid market prices
    const validProducts = products.filter(p => 
        p.marketPrice != null && 
        p.marketPrice !== undefined && 
        !isNaN(p.marketPrice) &&
        p.marketPrice > 0
    );

    if (validProducts.length === 0) {
        alert('No products with valid prices found');
        return;
    }

    // Sort by market price
    const sortedProducts = validProducts.sort((a, b) => a.marketPrice - b.marketPrice);

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'versionModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'versionModalLabel');
    modal.setAttribute('aria-hidden', 'true');

    const modalDialog = document.createElement('div');
    modalDialog.className = 'modal-dialog modal-lg modal-dialog-scrollable';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    const modalTitle = document.createElement('h5');
    modalTitle.className = 'modal-title';
    modalTitle.id = 'versionModalLabel';
    modalTitle.textContent = `Switch Version: ${currentCard.cardNumber}`;
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('data-bs-dismiss', 'modal');
    closeButton.setAttribute('aria-label', 'Close');
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // Modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    const variantsGrid = document.createElement('div');
    variantsGrid.className = 'row g-3';
    variantsGrid.style.maxHeight = '60vh';
    variantsGrid.style.overflowY = 'auto';

    sortedProducts.forEach((product) => {
        const isCurrent = product.productId === currentCard.productId;
        
        const variantCol = document.createElement('div');
        variantCol.className = 'col-md-6 col-lg-4';
        
        const variantCard = document.createElement('div');
        variantCard.className = `card h-100 ${isCurrent ? 'border-primary border-2' : 'cursor-pointer'}`;
        variantCard.style.cursor = isCurrent ? 'default' : 'pointer';
        if (!isCurrent) {
            variantCard.addEventListener('click', async () => {
                await switchCardVersion(cardIndex, product, currentCard.quantity);
                // Close modal
                try {
                    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                        const bsModal = bootstrap.Modal.getInstance(modal);
                        if (bsModal) {
                            bsModal.hide();
                        } else {
                            modal.remove();
                            const backdrop = document.getElementById('versionModalBackdrop');
                            if (backdrop) backdrop.remove();
                        }
                    } else {
                        modal.remove();
                        const backdrop = document.getElementById('versionModalBackdrop');
                        if (backdrop) backdrop.remove();
                    }
                } catch (error) {
                    modal.remove();
                    const backdrop = document.getElementById('versionModalBackdrop');
                    if (backdrop) backdrop.remove();
                }
            });
            variantCard.addEventListener('mouseenter', () => {
                variantCard.classList.add('shadow-sm');
            });
            variantCard.addEventListener('mouseleave', () => {
                variantCard.classList.remove('shadow-sm');
            });
        }

        const variantImage = document.createElement('img');
        variantImage.src = `https://tcgplayer-cdn.tcgplayer.com/product/${product.productId}_200w.jpg`;
        variantImage.className = 'card-img-top';
        variantImage.style.height = '200px';
        variantImage.style.objectFit = 'contain';
        variantImage.style.padding = '10px';

        const variantBody = document.createElement('div');
        variantBody.className = 'card-body d-flex flex-column';

        const variantName = document.createElement('h6');
        variantName.className = 'card-title';
        variantName.textContent = product.productName;

        const variantSet = document.createElement('p');
        variantSet.className = 'card-text text-muted small mb-1';
        variantSet.textContent = product.setName;

        const variantPrice = document.createElement('p');
        variantPrice.className = 'card-text mb-2';
        variantPrice.innerHTML = `
            <strong>Market:</strong> $${(product.marketPrice || 0).toFixed(2)}<br>
            <strong>Lowest:</strong> $${(product.lowestPrice || product.lowestPriceWithShipping || product.marketPrice || 0).toFixed(2)}
        `;

        if (isCurrent) {
            const currentBadge = document.createElement('span');
            currentBadge.className = 'badge bg-primary';
            currentBadge.textContent = 'Current';
            variantBody.appendChild(currentBadge);
        } else {
            const selectButton = document.createElement('button');
            selectButton.className = 'btn btn-primary btn-sm mt-auto';
            selectButton.textContent = 'Select';
            selectButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                await switchCardVersion(cardIndex, product, currentCard.quantity);
                try {
                    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                        const bsModal = bootstrap.Modal.getInstance(modal);
                        if (bsModal) {
                            bsModal.hide();
                        } else {
                            modal.remove();
                            const backdrop = document.getElementById('versionModalBackdrop');
                            if (backdrop) backdrop.remove();
                        }
                    } else {
                        modal.remove();
                        const backdrop = document.getElementById('versionModalBackdrop');
                        if (backdrop) backdrop.remove();
                    }
                } catch (error) {
                    modal.remove();
                    const backdrop = document.getElementById('versionModalBackdrop');
                    if (backdrop) backdrop.remove();
                }
            });
            variantBody.appendChild(selectButton);
        }

        variantBody.insertBefore(variantName, variantBody.firstChild);
        variantBody.appendChild(variantSet);
        variantBody.appendChild(variantPrice);

        variantCard.appendChild(variantImage);
        variantCard.appendChild(variantBody);
        variantCol.appendChild(variantCard);
        variantsGrid.appendChild(variantCol);
    });

    modalBody.appendChild(variantsGrid);

    // Modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    const closeFooterButton = document.createElement('button');
    closeFooterButton.type = 'button';
    closeFooterButton.className = 'btn btn-secondary';
    closeFooterButton.setAttribute('data-bs-dismiss', 'modal');
    closeFooterButton.textContent = 'Close';
    modalFooter.appendChild(closeFooterButton);

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalDialog.appendChild(modalContent);
    modal.appendChild(modalDialog);

    document.body.appendChild(modal);

    // Initialize Bootstrap modal and show it
    try {
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

            // Clean up when modal is hidden
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
            });
        } else {
            // Fallback: show modal without Bootstrap animation
            modal.style.display = 'block';
            modal.classList.add('show');
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.id = 'versionModalBackdrop';
            document.body.appendChild(backdrop);
            
            // Close button handlers
            const closeButtons = modal.querySelectorAll('[data-bs-dismiss="modal"], .btn-close');
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                    const backdrop = document.getElementById('versionModalBackdrop');
                    if (backdrop) backdrop.remove();
                    modal.remove();
                });
            });
        }
    } catch (error) {
        console.error('Error showing version modal:', error);
        alert('Error displaying version options. Please try again.');
        modal.remove();
    }
}

async function switchCardVersion(cardIndex, newProduct, quantity) {
    const result = await browser.storage.local.get("trackedCards");
    const trackedCards = result.trackedCards || [];
    
    if (cardIndex >= 0 && cardIndex < trackedCards.length) {
        const currentCard = trackedCards[cardIndex];
        const cardData = convertProductToCardData(newProduct, quantity, currentCard.cardNumber);
        
        // Replace the card at this index
        trackedCards[cardIndex] = cardData;
        
        await browser.storage.local.set({ trackedCards: trackedCards });
        loadCards();
    }
}

async function importDeckList() {
    const importButton = document.getElementById('import-deck-button');
    if (!importButton) return;
    
    // Disable button and show loading state
    importButton.disabled = true;
    const originalText = importButton.textContent;
    importButton.textContent = 'Importing...';
    
    try {
        // Get deck list from clipboard
        let deckListText;
        try {
            deckListText = await navigator.clipboard.readText();
        } catch (clipboardError) {
            // Fallback: prompt user to paste
            deckListText = prompt('Please paste your deck list (format: 4xOP13-016):');
            if (!deckListText) {
                return;
            }
        }
        
        // Parse deck list
        const deckEntries = parseDeckList(deckListText);
        if (deckEntries.length === 0) {
            alert('No valid deck entries found. Please check the format (e.g., "4xOP13-016")');
            return;
        }
        
        // Load card mapping
        const cardMapping = await loadCardMapping();
        if (!cardMapping) {
            alert('Failed to load card mapping. Please ensure card_number_to_product_ids.json exists.');
            return;
        }
        
        // Get existing tracked cards
        const result = await browser.storage.local.get("trackedCards");
        const trackedCards = result.trackedCards || [];
        
        // Collect all product IDs to fetch in batches
        const cardEntriesWithProductIds = [];
        for (const entry of deckEntries) {
            const { quantity, cardNumber } = entry;
            const productIds = cardMapping[cardNumber];
            if (!productIds || productIds.length === 0) {
                continue;
            }
            cardEntriesWithProductIds.push({ quantity, cardNumber, productIds });
        }
        
        // Collect all unique product IDs
        const allProductIds = [...new Set(cardEntriesWithProductIds.flatMap(entry => entry.productIds))];
        
        // Fetch all products in batches (API might have limits)
        const BATCH_SIZE = 50;
        const allProductsMap = new Map(); // productId -> product
        
        for (let i = 0; i < allProductIds.length; i += BATCH_SIZE) {
            const batch = allProductIds.slice(i, i + BATCH_SIZE);
            const products = await fetchProductInfo(batch);
            products.forEach(product => {
                allProductsMap.set(product.productId, product);
            });
        }
        
        // Process each card entry
        let importedCount = 0;
        let notFoundCount = 0;
        
        for (const entry of cardEntriesWithProductIds) {
            const { quantity, cardNumber, productIds } = entry;
            
            // Get products for this card
            const products = productIds
                .map(id => allProductsMap.get(id))
                .filter(p => p !== undefined);
            
            if (products.length === 0) {
                console.warn(`No products found for card: ${cardNumber}`);
                notFoundCount++;
                continue;
            }
            
            // Find best product based on preference
            const bestProduct = findBestProduct(products, importPreference);
            if (!bestProduct) {
                console.warn(`No valid product found for card: ${cardNumber}`);
                notFoundCount++;
                continue;
            }
            
            // Convert to card data
            const cardData = convertProductToCardData(bestProduct, quantity, cardNumber);
            
            // Check for duplicates (same product ID)
            const existingIndex = trackedCards.findIndex(
                c => c.productId === cardData.productId
            );
            
            if (existingIndex >= 0) {
                // Update quantity if already exists
                trackedCards[existingIndex].quantity += quantity;
            } else {
                // Add new card
                trackedCards.push(cardData);
            }
            
            importedCount++;
        }
        
        // Count cards not found in mapping
        notFoundCount += deckEntries.length - cardEntriesWithProductIds.length;
        
        // Save updated tracked cards
        await browser.storage.local.set({ trackedCards: trackedCards });
        
        // Show result
        let message = `Imported ${importedCount} card${importedCount !== 1 ? 's' : ''}`;
        if (notFoundCount > 0) {
            message += `\n${notFoundCount} card${notFoundCount !== 1 ? 's' : ''} not found`;
        }
        alert(message);
        
        // Reload cards to show imported ones
        loadCards();
        
    } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import deck list. Please check the console for details.');
    } finally {
        // Restore button
        importButton.disabled = false;
        importButton.textContent = originalText;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Only add the button if it doesn't already exist and we're not in bigpopup.html
    if (
        !document.getElementById("open-tab-button") &&
        !window.location.pathname.endsWith("bigpopup.html")
    ) {
        const cardList = document.getElementById("cardList");
        const openTabDiv = document.createElement("div");
        openTabDiv.className = "text-center";

        const openTabButton = document.createElement("button");
        openTabButton.className = "btn btn-primary w-40 mb-2";
        openTabButton.id = "open-tab-button";
        openTabButton.textContent = "Open in Tab";
        openTabButton.onclick = () => {
            browser.tabs.create({
                url: browser.runtime.getURL("popup/bigpopup.html"),
            });
        };

        openTabDiv.appendChild(openTabButton);
        cardList.parentNode.insertBefore(openTabDiv, cardList);
    }

    if (isBigPopup()) {
        document.body.classList.add("bigpopup-mode");
        // You can add more logic here to customize the tab view
    }

    // Load preferences and init controls
    browser.storage.local.get([PRICE_TYPE_STORAGE_KEY, IMPORT_PREFERENCE_KEY]).then(result => {
        priceType = result[PRICE_TYPE_STORAGE_KEY] || "market";
        importPreference = result[IMPORT_PREFERENCE_KEY] || "lowest";
        
        // Initialize import preference selector
        importPreferenceSelect = document.getElementById('import-preference');
        if (importPreferenceSelect) {
            importPreferenceSelect.value = importPreference;
            importPreferenceSelect.addEventListener('change', (e) => {
                importPreference = e.target.value;
                browser.storage.local.set({ [IMPORT_PREFERENCE_KEY]: importPreference });
            });
        }
        
        return initDiscountControls();
    }).then(() => {
        loadCards();
    });
    
    // Add import button event listener
    const importButton = document.getElementById('import-deck-button');
    if (importButton) {
        importButton.addEventListener('click', importDeckList);
    }
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") {
        return;
    }

    if (changes.trackedCards) {
        loadCards();
    }

    if (
        changes[DISCOUNT_STORAGE_KEY] &&
        typeof changes[DISCOUNT_STORAGE_KEY].newValue === "number"
    ) {
        discountPercent = sanitizeDiscountValue(
            changes[DISCOUNT_STORAGE_KEY].newValue
        );
        if (discountInput) {
            discountInput.value =
                discountPercent % 1 === 0
                    ? discountPercent.toFixed(0)
                    : discountPercent.toFixed(2);
        }
        updateTotal();
    }

    if (changes[PRICE_TYPE_STORAGE_KEY]) {
        priceType = changes[PRICE_TYPE_STORAGE_KEY].newValue || "market";
        if (priceTypeToggle) {
            priceTypeToggle.checked = priceType === "lowest";
            const label = priceTypeToggle.nextElementSibling;
            if (label) {
                label.textContent = priceType === "lowest" ? "Lowest" : "Market";
            }
        }
        loadCards();
    }

    if (changes[IMPORT_PREFERENCE_KEY]) {
        importPreference = changes[IMPORT_PREFERENCE_KEY].newValue || "lowest";
        if (importPreferenceSelect) {
            importPreferenceSelect.value = importPreference;
        }
    }
});
