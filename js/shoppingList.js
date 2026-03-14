// Функция рендера списка с группировкой по категориям
function render() {
    const listContainer = document.getElementById('shoppingList');
    const totalSumEl = document.getElementById('totalSum');
    const headerCard = document.getElementById('headerCard');
    const limit = parseInt(document.getElementById('budgetLimit').value) || 0;
    
    listContainer.innerHTML = '';
    let total = 0;
    let globalIndex = 1; // Глобальный счётчик для сквозной нумерации

    // Группировка по категориям
    const groups = items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    for (const cat in groups) {
        // Добавляем заголовок категории
        const catDiv = document.createElement('div');
        catDiv.className = 'category-header';
        catDiv.innerText = cat;
        listContainer.appendChild(catDiv);

        groups[cat].forEach(item => {
            const itemTotal = item.price * item.quantity; // Расчёт общей стоимости товара
            total += itemTotal;

            const div = document.createElement('div');
            div.className = `item ${item.completed ? 'completed' : ''}`;
            div.innerHTML = `
<span class="item-number">${globalIndex++}.</span>
                <span class="name">${item.name}</span>
                                    <div class="item-qty-wrapper">
                        <input type="number"
                    class="edit-qty-input"
            min="1"
            value="${item.quantity}"
            onchange="updateItemQuantity('${item.id}', this.value)">
                <span class="unit"></span>
            </div>

                <div class="item-details">
            <div class="item-price-wrapper">
                <input type="number" 
            class="edit-price-input" 
            value="${item.price}" 
            onchange="updateItemPrice('${item.id}', this.value)"
            oninput="this.style.width = ((this.value.length + 1) * 8) + 'px'">
                <span class="currency">₽/шт. </span>
            </div>

            <div class="item-total"> ${itemTotal} ₽</div>
            <button class="btnDel" onclick="deleteItem('${item.id}')">✕</button>
            <input type="checkbox" ${item.completed ? 'checked' : ''} onclick="toggleComplete('${item.id}')">
        </div>
            `;
            listContainer.appendChild(div);
        });
    }

    totalSumEl.innerText = total;

    // Логика цвета лимита
    if (limit > 0) {
        headerCard.className = total > limit ? 'header-card limit-over' : 'header-card limit-ok';
    } else {
        headerCard.className = 'header-card';
    }
}