// Функция рендера списка с группировкой по категориям
function render() {

    const ref = firebase.database().ref(currentList); // убираем старый listener

    ref.off();

    ref.on("value", snapshot => {
    
         items = [];

    snapshot.forEach(child => {
        items.push({
            id: child.key,
            ...child.val()
        });
    });

    const listContainer = document.getElementById('shoppingList');
    const totalSumEl = document.getElementById('totalSum');
    const headerCard = document.getElementById('headerCard');
    const limit = parseInt(document.getElementById('budgetLimit').value) || 0;
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

    //Проверка если список пуст
    totalSumEl.innerText = 0;
        const totalQuantityEl = document.getElementById('totalQuantityCount');
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

        // РАСЧЁТ totalQuantity ПОСЛЕ ПРОВЕРКИ НА ПУСТОЙ СПИСОК
    const totalQuantity = Math.round(items.filter(item => item && typeof item.quantity !== 'undefined' && !item.deleted).reduce((sum, item) => {
        const qty = Number(item.quantity);
        return sum + (isNaN(qty) ? 0 : qty);
    }, 0));

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
        const itemTotal = parseFloat((item.price * item.quantity).toFixed(2));
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
            min="0.01"
            step="0.01"
            value="${item.quantity}"
            onchange="updateItemQuantity('${item.id}', this.value)">
                <span class="unit">шт</span>   
            </div>
        </div>        
            <div class="item-details">
            <div class="item-price-wrapper">
            <input type="number" 
            class="edit-price-input"
            min="0.01"
            step="0.01" 
            value="${item.price}" 
            onchange="updateItemPrice('${item.id}', this.value)">
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
                <div class="save-status" id="status-${item.id}">✅</div>
            </div>
            <!-- Время с уникальным ID -->
                <div class="times" id="times-${item.id}" style="display: block;">⏰${item.time}</div>
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
    summCheckedEl.innerText = checkedSum.toFixed(2);
    console.log('Отмечено');
    deletCheced.style.display = checkedSum > 0 ? 'block' : 'none'; // Показываем кнопку удаления только если есть отмеченные товары
  }

    // Логика цвета лимита
    if (limit > 0) {
        headerCard.className = total > limit ? 'header-card limit-over' : 'header-card limit-ok';
    } else {
        headerCard.className = 'header-card';
    }

// Функция для отображения информации о пользователе в header    
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

 });

}

//Переключене на другой список (например, доп список)
var btnToggleList = document.getElementById('btnToggleList');

btnToggleList.addEventListener('click', toggleList);

function toggleList() {
    const listNames = {
        shoppingList: "📦 Доп список",
        deferredList: "🛒 Основной список"
    };

    // Переключаем список
    currentList = currentList === "shoppingList" ? "deferredList" : "shoppingList";

    // Устанавливаем цвет в зависимости от текущего списка
    btnToggleList.style.backgroundColor =
        currentList === "shoppingList" ? "#3f51b5" : "#2196f3";

    btnToggleList.textContent = listNames[currentList];
    render();
}
