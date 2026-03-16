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

            <!-- Поле для комментариев -->
            <div class="comment-wrapper">
                <input
                    class="comment-input"
                    id="comment"
                    type="text"
                    max-length="46"
                    autocomplete="on"
                    autocapitalize="sentences"
                    placeholder="Добавьте комментарий к товару..."
                    value="${item.comment || ''}"
                    onblur="handleCommentSave('${item.id}', this)"
                    onkeydown="handleKeyPress(event, '${item.id}', this)">
                </input>
                <span class="save-status" id="status-${item.id}">✅</span>
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

function updateHeaderStyle() {
    const headerCard = document.getElementById('headerCard');
    if (!headerCard) return;

    const rect = headerCard.getBoundingClientRect();


    // Проверяем, что верхний край элемента находится на уровне верхней границы viewport
    if (rect.top <= 0) {
        headerCard.style.borderRadius = '0';
    } else {
        // Возвращаем стандартное значение, если элемент не у верха
        headerCard.style.borderRadius = ''; // или конкретное значение, например '8px'
    }
}

// Вызываем при загрузке страницы
document.addEventListener('DOMContentLoaded', updateHeaderStyle);

// Вызываем при скролле
window.addEventListener('scroll', updateHeaderStyle);

}