// Функция рендера списка с группировкой по категориям
function render() {
    const listContainer = document.getElementById('shoppingList');
    const totalSumEl = document.getElementById('totalSum');
    const headerCard = document.getElementById('headerCard');
    const limit = parseInt(document.getElementById('budgetLimit').value) || 0;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);// Расчёт общего количества товаров (сумма количеств всех позиций)
    const summCheckedEl = document.getElementById('summChecked'); // Получаем элемент для суммы отмеченных

    //Товары
    listContainer.innerHTML = '';
    
  // Проверяем, есть ли товары в списке
  if (items.length === 0) {
    // Если товаров нет, показываем сообщение
    listContainer.innerHTML = `<div class="emptuList">
    <h2 class="empty-list-message">Список пуст!</h2>
    <p class="smile">🤷‍♂️</p>
    <p>Добавьте товар пожалуйста!</p>
    </div>
    `;
    totalSumEl.innerText = 0;
    if (totalQuantityEl) totalQuantityEl.innerText = 0;
    if (summCheckedEl) summCheckedEl.innerText = 0;

    // Обновляем стили лимита (если лимит установлен)
    if (limit > 0) {
      headerCard.className = 'header-card limit-ok';
    } else {
      headerCard.className = 'header-card';
    }
    return; // Завершаем выполнение функции
  }

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
        <div class="item-names">    
            <span class="item-number">${globalIndex++}.</span>
                <span class="name">${item.name}</span>
        <div class="item-qty-wrapper">
            <input type="number"
            class="edit-qty-input"
            min="0"
            step="any"
            value="${item.quantity}"
            onchange="updateItemQuantity('${item.id}', this.value)">
                <span class="unit">шт</span>
            </div>
        </div>        
                <div class="item-details">
            <div class="item-price-wrapper">
                <input type="number" 
            class="edit-price-input" 
            value="${item.price}" 
            onchange="updateItemPrice('${item.id}', this.value)"
            oninput="this.style.width = ((this.value.length + 1) * 8) + 'px'">
                <span class="currency">руб/шт. </span>
            </div>

            <div class="item-total"> ${itemTotal} ₽</div>
            <button class="btnDel" onclick="deleteItem('${item.id}')">🗑️</button>
            <input type="checkbox" ${item.completed ? 'checked' : ''} onclick="toggleComplete('${item.id}')">
            

            <!-- Поле для комментариев -->
            <div class="comment-wrapper">
                <input
                    class="comment-input"
                    id="comment"
                    type="search"
                    max-length="46"
                    autocomplete="on"
                    autocapitalize="sentences"
                    placeholder="Добавьте комментарий к товару..."
                    value="${item.commentTime ? item.commentTime + '_' + item.comment : ''}"
                    onblur="handleCommentSave('${item.id}', this)"
                    onkeydown="handleKeyPress(event, '${item.id}', this)">
                </input>
                <span class="save-status" id="status-${item.id}">✅</span>
            </div>

            </div>
            `;
            listContainer.appendChild(div);
        });
    }

    totalSumEl.innerText = total;

      // Обновляем отображение общего количества в headerCard
  const totalQuantityEl = document.getElementById('totalQuantityCount');
  if (totalQuantityEl) {
    totalQuantityEl.innerText = totalQuantity;
  }

    // Обновляем сумму отмеченных товаров
  if (summCheckedEl) {
    const checkedSum = calculateCheckedSum();
    summCheckedEl.innerText = checkedSum;
  }

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