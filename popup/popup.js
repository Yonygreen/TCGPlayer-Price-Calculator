let cachedCards = [];
let discountPercent = 0;
let discountInput = null;
const DISCOUNT_STORAGE_KEY = "discountPercent";

async function loadCards() {
    const result = await browser.storage.local.get("trackedCards");
    const cards = result.trackedCards || [];
    cachedCards = cards;
    const cardList = document.getElementById("cardList");
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
        priceParagraph.textContent = `Price: $${card.price.toFixed(2)}`;

        const quantityLabel = document.createElement("label");
        quantityLabel.className = "form-label mb-0";
        quantityLabel.style.fontSize = "0.9rem";
        quantityLabel.textContent = "Quantity:";

        const inputWrapper = document.createElement("div");
        inputWrapper.className = "d-flex align-items-center";

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

    updateTotal(cards);

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
}

function updateTotal(cards = cachedCards) {
    const totalPriceDiv = document.getElementById("totalPrice");
    if (!totalPriceDiv) {
        return;
    }

    const sum = cards.reduce(
        (acc, card) => acc + card.price * card.quantity,
        0
    );

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

    const stored = await browser.storage.local.get(DISCOUNT_STORAGE_KEY);
    const storedValue = stored[DISCOUNT_STORAGE_KEY];
    discountPercent = sanitizeDiscountValue(
        typeof storedValue === "number" ? storedValue : 0
    );

    container.textContent = "";

    const controlsRow = document.createElement("div");
    controlsRow.className = isBigPopup()
        ? "d-flex justify-content-center flex-wrap"
        : "d-flex justify-content-end flex-wrap";
    controlsRow.style.gap = "0.5rem";

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

    initDiscountControls().then(loadCards);
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
});
