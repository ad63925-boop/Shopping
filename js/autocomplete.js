// Умный выбор категории при вводе названия
const nameInput = document.getElementById('itemName');
const autoList = document.getElementById('autocompleteList');

// Показываем подсказки при фокусе, если есть ввод
nameInput.addEventListener('focus', () => {
    autoList.innerHTML = '';

    // Получаем все ключи из истории
    const allHistoryKeys = Object.keys(history);

    if (allHistoryKeys.length > 0) {
        allHistoryKeys.forEach(name => {
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
});

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
                    ${lastPrice ? `<span class="suggestion-price">( ${lastPrice} ₽ )</span>` : ''}
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
