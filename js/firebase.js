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

// Функция для обновления количества в Firebase
function updateItemQuantity(id, newQuantity) {
    const quantity = parseFloat(newQuantity) || 1; // По умолчанию 1, если ввод некорректный
    
    db.child(id).update({
        quantity: quantity
    }).then(() => {
        showNotification("Количество успешно обновлено в облаке!", "success");
        console.log("Количество успешно обновлено в облаке");
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

    db.child(id).update({
        price: price
    }).then(() => {
        // Показываем округлённую цену в уведомлении
        showNotification(`Цена ${price.toFixed(2)} ₽ успешно обновлена в облаке!`, "success");
        console.log(`Цена успешно обновлена: ${price}`);
    }).catch((error) => {
        showNotification(`Ошибка обновления цены: ${error.message}`, "error");
        console.error("Ошибка обновления цены:", error);
    });
}



// Функция для обновления лимита в Firebase
function updateLimit() {
    const limit = document.getElementById('budgetLimit').value;
    settingsDb.update({ limit: parseInt(limit) || 0 });
}