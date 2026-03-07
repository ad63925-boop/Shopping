const firebaseConfig = {
    databaseURL: "https://shoppinglist-7dd6e-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref("shopping_list");
const settingsDb = firebase.database().ref("settings"); // Для сохранения лимита

let items = [];

// Заменяем старую загрузку из localStorage на Firebase
let history = {}; 
const historyDb = firebase.database().ref("suggestions_history");

// Слушаем историю из облака
historyDb.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
        history = data;
        // Обновляем подсказки, если пользователь прямо сейчас что-то вводит
        if (typeof updateSuggestions === "function") { 
            updateSuggestions(); 
        }
    }
});

// Загрузка лимита из облака
settingsDb.child('limit').on('value', (snapshot) => {
    const limit = snapshot.val() || 0;
    document.getElementById('budgetLimit').value = limit;
    render();
});

db.on("value", (snapshot) => {
    const data = snapshot.val();
    items = data ? Object.values(data) : [];
    render();
    updateSuggestions();
    document.getElementById('syncStatus').innerText = "● Обновлено " + new Date().toLocaleTimeString();
});

function addItem() {
    const nameInput = document.getElementById('itemName');
    const qtyInput = document.getElementById('itemQty'); // Получаем поле количества
    const priceInput = document.getElementById('itemPrice');
    const catInput = document.getElementById('itemCat');
    const itemName = nameInput.value.trim();

    // Проверяем валидность названия
    if (!isValidItemName(itemName)) {
        nameInput.focus();
        return;
    }

    if (!itemName) return;

    const newItem = {
        id: Date.now().toString(),
        name: itemName,
        quantity: parseInt(qtyInput.value) || 1, // Добавляем количество (по умолчанию 1)
        price: parseInt(priceInput.value) || 0,
        category: catInput.value,
        completed: false
    };

    // Сохраняем в историю: категорию и последнюю цену/количество для этого товара
    history[itemName.toLowerCase()] = {
        category: catInput.value,
        lastPrice: newItem.price,
        lastQuantity: newItem.quantity
    };
    historyDb.child(itemName.toLowerCase()).set(history[itemName.toLowerCase()]);


    db.child(newItem.id).set(newItem);
    nameInput.value = ''; 
    priceInput.value = '';
    qtyInput.value = ''; // Очищаем поле количества
}

// Функция для обновления количества в Firebase
function updateItemQuantity(id, newQuantity) {
    const quantity = parseInt(newQuantity) || 1; // По умолчанию 1

    db.child(id).update({
        quantity: quantity
    }).then(() => {
        console.log("Количество успешно обновлено в облаке");
        render(); // Перерисовываем список после обновления
    }).catch((error) => {
        console.error("Ошибка обновления количества:", error);
    });
}

// Функция для обновления цены в Firebase
function updateItemPrice(id, newPrice) {
    const price = parseInt(newPrice) || 0;
    
    // db — это ваша ссылка на firebase.database().ref("shopping_list")
    db.child(id).update({ 
        price: price 
    }).then(() => {
        console.log("Цена успешно обновлена в облаке");
    }).catch((error) => {
        console.error("Ошибка обновления цены:", error);
    });
}

function updateLimit() {
    const limit = document.getElementById('budgetLimit').value;
    settingsDb.update({ limit: parseInt(limit) || 0 });
}


// Умный выбор категории при вводе названия
const nameInput = document.getElementById('itemName');
const autoList = document.getElementById('autocompleteList');

// Слушаем ввод в поле названия
nameInput.addEventListener('input', () => {
    const val = nameInput.value.toLowerCase();
    autoList.innerHTML = '';
    
    if (val.length === 0) {
        autoList.style.display = 'none';
        return;
    }

    const matches = Object.keys(history).filter(name => name.startsWith(val));

    if (matches.length > 0) {
        matches.forEach(name => {
            const { category, lastPrice } = history[name];
            const div = document.createElement('div');
            div.className = 'suggestion-card';
            
            div.innerHTML = `
                <div class="suggestion-info">
                    <span class="suggestion-name">${name.charAt(0).toUpperCase() + name.slice(1)}</span>
                    <span class="suggestion-cat">${category}</span>
                    ${lastPrice ? `<span class="suggestion-price">(${lastPrice} ₽)</span>` : ''}
                </div>
                <span class="suggestion-delete" data-name="${name}">×</span>
            `;

            // Клик по карточке
            div.addEventListener('click', (e) => {
                if (e.target.classList.contains('suggestion-delete')) {
                    deleteFromHistory(e.target.dataset.name);
                    return;
                }
                selectSuggestion(name, category, lastPrice);
            });

            autoList.appendChild(div);
        });
        autoList.style.display = 'block';
    } else {
        autoList.style.display = 'none';
    }
});

// Валидация названия товара (запрет точки)
function isValidItemName(name) {
    if (!name) return true; // Пустое поле — допустимо

    // Проверяем наличие точки
    if (name.includes('.')) {
        showError('Название не может содержать точку (.) — это запрещено Firebase');
        return false;
    }

    return true;
}

//Функция отображения ошибки
function showError(message) {
    // Удаляем предыдущее сообщение, если есть
    const existingError = document.getElementById('inputError');
    if (existingError) {
        existingError.remove();
    }

    const nameInput = document.getElementById('itemName');
    const errorDiv = document.createElement('div');
    errorDiv.id = 'inputError';
    errorDiv.className = 'input-error';
    errorDiv.textContent = message;

    // Вставляем сообщение сразу после поля ввода
    nameInput.parentNode.insertBefore(errorDiv, nameInput.nextSibling);

    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}


// Функция выбора подсказки
function selectSuggestion(name, cat, price, quantity) {
    nameInput.value = name.charAt(0).toUpperCase() + name.slice(1);
    
    // Обновляем категорию
    const hiddenInput = document.getElementById('itemCat');
    const selectedText = document.getElementById('selectedCatText');
    if (hiddenInput) hiddenInput.value = cat;
    if (selectedText) selectedText.innerText = cat;

    // Подставляем цену из истории (если есть)
    if (price !== undefined) {
        document.getElementById('itemPrice').value = price;
    }

    // Подставляем количество из истории (если есть)
    if (quantity !== undefined) {
        document.getElementById('itemQty').value = quantity;
    }

    autoList.style.display = 'none';
}

// Функция удаления из истории (тот самый крестик)
function deleteFromHistory(name) {
    // Удаляем из Firebase
    historyDb.child(name).remove();
    
    // Поле ввода само обновится, так как сработает слушатель historyDb.on("value")
    nameInput.dispatchEvent(new Event('input')); 
}

// Закрытие при клике мимо
document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-suggestions') && e.target !== nameInput) {
        autoList.style.display = 'none';
    }
});

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
                <div class="item-details">
                    <div class="item-qty-wrapper">
                        <input type="number"
                    class="edit-qty-input"
            min="1"
            value="${item.quantity}"
            onchange="updateItemQuantity('${item.id}', this.value)">
                <span class="unit">шт.</span>
            </div>

            <div class="item-price-wrapper">
                <input type="number" 
            class="edit-price-input" 
            value="${item.price}" 
            onchange="updateItemPrice('${item.id}', this.value)"
            oninput="this.style.width = ((this.value.length + 1) * 8) + 'px'">
                <span class="currency">₽ </span>
            </div>

            <div class="item-total">= ${itemTotal} ₽</div>
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

// Функции удаления и переключения (без изменений)
function toggleComplete(id) {
    const item = items.find(i => i.id === id);
    if (item) db.child(id).update({ completed: !item.completed });
}

//Удаление с подтверждением
function deleteItem(id) {
    // Находим товар по ID
    const itemToDelete = items.find(item => item.id === id);
    const itemName = itemToDelete ? itemToDelete.name : 'этот товар';


    Swal.fire({
        title: 'Вы уверены?',
        text: `Вы хотите удалить "${itemName}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Да, удалить!',
        cancelButtonText: 'Отмена',
        reverseButtons: true,
        customClass: {
            confirmButton: 'swal2-btn-confirm',
            cancelButton: 'swal2-btn-cancel'
        },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            db.child(id).remove()
                .then(() => {
                    Swal.fire({
                title: 'Удалено!',
                text: `"${itemName}" успешно удалён из списка.`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        })
        .catch((error) => {
            Swal.fire({
                title: 'Ошибка!',
                text: 'Не удалось удалить товар. Попробуйте ещё раз.',
                icon: 'error'
            });
            console.error('Ошибка при удалении товара:', error);
        });
    }
});
}


const customSelect = document.getElementById('customSelect');
const trigger = customSelect.querySelector('.select-trigger');
const options = customSelect.querySelectorAll('.option');
const hiddenInput = document.getElementById('itemCat');
const selectedText = document.getElementById('selectedCatText');

// Открыть/закрыть список
trigger.addEventListener('click', () => {
    customSelect.classList.toggle('active');
});

// Выбор опции
options.forEach(option => {
    option.addEventListener('click', function() {
        const val = this.getAttribute('data-value');
        
        // Обновляем текст и скрытый инпут
        selectedText.innerText = val;
        hiddenInput.value = val;
        
        // Закрываем список
        customSelect.classList.remove('active');
    });
});

// Закрыть если кликнули вне списка
window.addEventListener('click', (e) => {
    if (!customSelect.contains(e.target)) {
        customSelect.classList.remove('active');
    }
});

//Связь с облаком    
function updateSuggestions() {
    const nameInput = document.getElementById('itemName');
    const autoList = document.getElementById('autocompleteList');
    if (!nameInput || !autoList) return; // Защита от ошибок, если элементы еще не созданы

    const val = nameInput.value.toLowerCase();
    autoList.innerHTML = '';
    
    if (val.length === 0) {
        autoList.style.display = 'none';
        return;
    }

    // Фильтруем ключи из объекта history, который синхронизируется с Firebase
    const matches = Object.keys(history).filter(name => name.startsWith(val));

    if (matches.length > 0) {
        matches.forEach(name => {
            const { category, lastPrice, lastQuantity } = history[name];
            const div = document.createElement('div');
            div.className = 'suggestion-card';
            div.innerHTML = `
                <div class="suggestion-info">
                    <span class="suggestion-name">${name.charAt(0).toUpperCase() + name.slice(1)}</span>
            <span class="suggestion-cat">${category}</span>
            ${lastPrice ? `<span class="suggestion-price">(${lastPrice} ₽)</span>` : ''}
            ${lastQuantity ? `<span class="suggestion-qty">×${lastQuantity} шт.</span>` : ''}
                </div>
                <span class="suggestion-delete" onclick="deleteFromHistory('${name}')">×</span>
            `;
            div.onclick = (e) => {
                if (!e.target.classList.contains('suggestion-delete')) {
                    selectSuggestion(name, category, lastPrice, lastQuantity);
                }
            };
            autoList.appendChild(div);
        });
        autoList.style.display = 'block';
    } else {
        autoList.style.display = 'none';
    }
}

// Добавляем проверку при вводе в поле названия
document.getElementById('itemName').addEventListener('input', function() {
    const name = this.value;

    // Если есть точка — показываем ошибку
    if (name.includes('.')) {
        showError('Точка (.) запрещена в названии — это ограничение Firebase');
    } else {
        // Удаляем сообщение об ошибке, если пользователь исправил
        const errorDiv = document.getElementById('inputError');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
});
