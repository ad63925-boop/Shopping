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
            ${lastQuantity ? `<span class="suggestion-qty">${lastQuantity}</span>` : ''}
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

// Функция для обновления количества в Firebase
function updateItemQuantity(id, newQuantity) {
    const quantity = parseFloat(newQuantity) || 1; // По умолчанию 1, если ввод некорректный
    
    getDb().child(id).update({
        quantity: quantity
    }).then(() => {
        showNotification("Количество успешно обновлено в облаке!", "success");
        console.log("Количество успешно обновлено в облаке");
        addLog(`Количество обновлено: ${quantity}`);
        render(); // Перерисовываем список после обновления
    }).catch((error) => {
        showNotification(`Ошибка обновления количества: ${error.message}`, "error");
        console.error("Ошибка обновления количества:", error);
    });
}

// Функция для обновления цены в Firebase
function updateItemPrice(id, newPrice) {
    // Преобразуем в число и проверяем на корректность
    const numericInput = parseFloat(newPrice);

    // Если не число или отрицательное — устанавливаем 0
    if (isNaN(numericInput) || numericInput < 0) {
        showNotification("Ошибка: введите корректную положительную цену", "error");
        return;
    }

    // Округление до сотых
    const price = Math.round(numericInput * 100) / 100;

    getDb().child(id).update({
        price: price
    }).then(() => {
        // Показываем округлённую цену в уведомлении
        showNotification(`Цена ${price} ₽ успешно обновлена в облаке!`, "success");
        console.log(`Цена успешно обновлена: ${price}`);
        addLog(`Цена обновлена: ${price}`);
    }).catch((error) => {
        showNotification(`Ошибка обновления цены: ${error.message}`, "error");
        console.error("Ошибка обновления цены:", error);
    });
}

//функция с полными оповещениями для всех изменений в Firebase
function setupDatabaseListeners(userId) {
  const db = getDatabase();

  // Хранилище для отслеживания предыдущих состояний
  let previousState = {
    shoppingList: [],
    comments: [],
    checkedItems: new Set()
  };
}

// Функция для обновления лимита в Firebase
function updateLimit() {
    const limit = document.getElementById('budgetLimit').value;
    settingsDb.update({ limit: parseInt(limit) || 0 });
    addLog("Лимит обновлен: " + limit);
}


// Функция для сохранения weekly limit в Firebase
function saveWeekLimitToFirebase() {
    const weekLimitInput = document.getElementById('weekLimit');
    const weekLimitValue = parseFloat(weekLimitInput.value);

    if (isNaN(weekLimitValue) || weekLimitValue < 0) {
        console.error('Некорректная сумма для weekly limit');
        return Promise.reject('Invalid value');
    }

    return settingsDb.update({ weekLimit: weekLimitValue })
        .then(() => console.log('Weekly limit сохранён:', weekLimitValue))
        .catch((error) => {
            console.error('Ошибка Firebase:', error);
            throw error;
        });
}

// Функция загрузки данных из Firebase при старте
function loadWeekLimitFromFirebase() {
    settingsDb.get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const savedWeekLimit = data.weekLimit;
                if (savedWeekLimit !== undefined && !isNaN(savedWeekLimit)) {
                    document.getElementById('weekLimit').value = savedWeekLimit;
                    updateDailyLimitDisplay(savedWeekLimit);
                }
            } else {
                document.getElementById('weekLimit').value = 0;
                updateDailyLimitDisplay(0);
            }
        })
        .catch((error) => {
            console.error('Ошибка при загрузке из Firebase:', error);
            document.getElementById('weekLimit').value = 0;
            updateDailyLimitDisplay(0);
        });
}

// Функция обновления отображения дневного лимита
function updateDailyLimitDisplay(weekLimitValue) {
    const limitOfWeekOutput = document.getElementById('limitOfWeek');
    if (isNaN(weekLimitValue) || weekLimitValue < 0) {
        limitOfWeekOutput.textContent = '0 ₽';
        return;
    }
    const remainingDays = getRemainingDays();
    //console.log('Оставшиеся дни до конца недели:', remainingDays);
    if (remainingDays === 0) {
        limitOfWeekOutput.textContent = weekLimitValue + ' ₽';
        return;
    }
    const dailyLimit = Math.floor(weekLimitValue / remainingDays);
    limitOfWeekOutput.textContent = dailyLimit + ' ₽/д';
}

// Получаем элементы DOM
var weekLimitInput = document.getElementById('weekLimit');
var limitOfWeekOutput = document.getElementById('limitOfWeek');

// Функция для расчёта оставшихся дней до конца недели (воскресенье)
// Функция для расчёта оставшихся дней до конца недели (воскресенье), включая текущий день
function getRemainingDays() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 — воскресенье, 1 — понедельник, ..., 6 — суббота

    // Если сегодня воскресенье, остаётся 1 день (само воскресенье)
    // В остальные дни: 7 - номер дня недели
    return dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
}


// Обработчик ввода в поле weekLimit
weekLimitInput.addEventListener('input', function() {
    const weekLimitValue = parseFloat(weekLimitInput.value);
    saveWeekLimitToFirebase().catch(() => {});
    updateDailyLimitDisplay(weekLimitValue);
});

// Загружаем данные из Firebase при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadWeekLimitFromFirebase();
});
