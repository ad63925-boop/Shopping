// Умный выбор категории при вводе названия
const autocompleteNameInput = document.getElementById('itemName');
const autocompleteList = document.getElementById('autocompleteList');

// Показываем подсказки при фокусе, если есть ввод
autocompleteNameInput.addEventListener('focus', () => {
    autocompleteList.innerHTML = '';

    // Получаем все ключи из истории
    const allHistoryKeys = getHistoryNamesByRecency();

    if (allHistoryKeys.length > 0) {
        allHistoryKeys.forEach(name => {
            const { category, lastPrice, lastQuantity, foto } = history[name];
            const div = document.createElement('div');
            div.className = 'suggestion-card';
            div.innerHTML = `
                <div class="suggestion-info">

                    <span class="suggestion-name">${name.charAt(0).toUpperCase() + name.slice(1)}</span>
                    <span class="suggestion-cat">${getCategoryIcon(category)} ${category}</span>
            ${lastPrice ? `<span class="suggestion-price">(${lastPrice} ₽)</span>` : ''}
            ${lastQuantity ? `<span class="suggestion-qty">${lastQuantity}</span>` : ''}
                </div>
                    <span class="suggestion-delete" onclick="deleteFromHistory('${name}')"><i class="fa-solid fa-trash-can"></i></span>
            `;
            div.onclick = (e) => {
                if (!e.target.classList.contains('suggestion-delete')) {
                    selectSuggestion(name, category, lastPrice, lastQuantity, foto);
                }
            };
            autocompleteList.appendChild(div);
        });
        autocompleteList.style.display = 'block';
    } else {
        autocompleteList.style.display = 'none';
    }
});

// Слушаем ввод в поле названия
autocompleteNameInput.addEventListener('input', () => {
    const val = autocompleteNameInput.value.toLowerCase();
    autocompleteList.innerHTML = '';
    
    if (val.length === 0) {
        autocompleteList.style.display = 'none';
        return;
    }

    const matches = getHistoryNamesByRecency().filter(name => name.includes(val));

    if (matches.length > 0) {
        matches.forEach(name => {
            const { category, lastPrice, lastQuantity, foto } = history[name];
            const div = document.createElement('div');
            div.className = 'suggestion-card';
            
            div.innerHTML = `
                <div class="suggestion-info">
                    <span class="suggestion-name">${name.charAt(0).toUpperCase() + name.slice(1)}</span>
                    <span class="suggestion-cat">${getCategoryIcon(category)} ${category}</span>
                    ${lastPrice ? `<span class="suggestion-price">( ${lastPrice} ₽ )</span>` : ''}
                </div>
                <span class="suggestion-delete" onclick="deleteFromHistory('${name}')"><i class="fa-solid fa-trash-can"></i></span>
            `;

            // Клик по карточке
            div.addEventListener('click', (e) => {
                if (e.target.classList.contains('suggestion-delete')) {
                    deleteFromHistory(e.target.dataset.name);
                    return;
                }
                selectSuggestion(name, category, lastPrice, lastQuantity, foto);
            });

            autocompleteList.appendChild(div);
        });
        autocompleteList.style.display = 'block';
    } else {
        autocompleteList.style.display = 'none';
    }

});

// Закрываем подсказки по клику вне поля ввода и списка.
document.addEventListener('click', (event) => {
    if (!autocompleteNameInput.contains(event.target) && !autocompleteList.contains(event.target)) {
        autocompleteList.style.display = 'none';
    }
});

// Запускаем инициализацию при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    initVoiceInput();
});