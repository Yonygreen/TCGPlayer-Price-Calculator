async function loadCards() {
    const result = await browser.storage.local.get("trackedCards");
    const cards = result.trackedCards || [];
    const cardList = document.getElementById("cardList");
    const totalPriceDiv = document.getElementById("totalPrice");
    cardList.innerHTML = "";

    cards.forEach((card, index) => {
        const div = document.createElement("div");
        div.className = "card mb-3 p-2";

        div.innerHTML = `
            <div class="row g-2 align-items-center">
                <div class="col-3">
                    <img src="${card.image}" alt="${
            card.name
        }" class="img-fluid rounded-start" />
                </div>
                <div class="col-9">
                    <h6 class="mb-1">${card.name}</h6>
                    <p class="mb-1 text-muted">Set: ${card.setName} (${
            card.setId
        })</p>
                    <p class="mb-1 text-muted">Price: $${card.price.toFixed(
                        2
                    )}</p>
                    <label class="form-label mb-0" style="font-size: 0.9rem;">Quantity:</label>
                    <div class="d-flex align-items-center">
                        <input 
                            type="number" 
                            min="1" 
                            value="${card.quantity}" 
                            data-index="${index}" 
                            class="form-control form-control-sm me-2" 
                            style="width: 80px;" 
                        >
                        <button class="btn btn-danger btn-sm">Remove</button>
                    </div>
                </div>
            </div>
        `;

        cardList.appendChild(div);
    });

    const buttonDiv = document.createElement("div");
    buttonDiv.innerHTML = `
        <button class="btn btn-danger w-100" id="clear-button">Reset All</button>
    `;
    buttonDiv.querySelector("#clear-button").onclick = async () => {
        await browser.storage.local.set({ trackedCards: [] });
        loadCards();
    };
    cardList.appendChild(buttonDiv);

    updateTotal(cards); // 🟡 Call this to show total after loading

    cardList.addEventListener("change", async (event) => {
        if (event.target.tagName === "INPUT") {
            const index = parseInt(event.target.dataset.index, 10);
            cards[index].quantity = parseInt(event.target.value, 10);
            await browser.storage.local.set({ trackedCards: cards });
            updateTotal(cards); // 🟡 Update total on quantity change
        }
    });

    const removeButtons = cardList.querySelectorAll(".btn-danger.btn-sm");
    removeButtons.forEach((button, index) => {
        button.addEventListener("click", async () => {
            cards.splice(index, 1);
            await browser.storage.local.set({ trackedCards: cards });
            loadCards(); // This will call updateTotal again
        });
    });
}

function updateTotal(cards) {
    const totalPriceDiv = document.getElementById("totalPrice");
    const sum = cards.reduce(
        (acc, card) => acc + card.price * card.quantity,
        0
    );
    totalPriceDiv.textContent = `Total: $${sum.toFixed(2)}`;
}

loadCards();
