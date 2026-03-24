const firebaseConfig = {
    databaseURL: "https://shoppinglist-7dd6e-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref("shopping_list");
const settingsDb = firebase.database().ref("settings"); // Для сохранения лимита

let items = [];

// Загруза истории из Firebase для автоподсказок
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

//Выпадающий список категорий

const customSelect = document.getElementById('customSelect');
const trigger = customSelect.querySelector('.select-trigger');
const options = customSelect.querySelectorAll('.option');
const hiddenInput = document.getElementById('itemCat');
const selectedText = document.getElementById('selectedCatText');


// Открыть/закрыть список
trigger.addEventListener('click', () => {
    customSelect.classList.toggle('active');
});

// Слушаем клики по кастомному селекту   
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

// Функция для добавления товара
function addItem() {
    const nameInput = document.getElementById('itemName');
    const qtyInput = document.getElementById('itemQty'); // Получаем поле количества
    const priceInput = document.getElementById('itemPrice');
    const catInput = document.getElementById('itemCat');
    const itemName = nameInput.value.trim();

        // Проверка на пустое название
    if (itemName === '') {
        nameInput.focus();
        Swal.fire('Ошибка', 'Название товара не может быть пустым.', 'error');
        return;
    }

        if (itemName === '.') {
        nameInput.focus();
        Swal.fire('Ошибка', 'Точка (.) запрещена!', 'error');
        return;
    }

    // Проверяем валидность названия  проверка №1
    if (!isValidItemName(itemName)) {
        nameInput.focus();
        return;
    }
    //проверка №2
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

//Комментарии к товарам
async function updateItemComment(itemId, comment) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    let currentTime = null;

    // Если комментарий не пустой, получаем текущее время
    if (comment && comment.trim() !== '') {
        currentTime = new Date().toTimeString().slice(0, 8);
    }

    // Обновляем локальный объект
    item.comment = comment && comment.trim() !== '' ? comment : '';
    item.commentTime = currentTime; // Будет null, если комментарий пустой

    try {
        // Используем уже инициализированную базу данных
        // db указывает на 'shopping_list'
        const itemRef = db.child(itemId);

        // Обновляем только поле comment у конкретного товара
    await itemRef.update({
      comment: item.comment,
      commentTime: currentTime
    });

        console.log('Комментарий успешно сохранён в Firebase Realtime Database');

        // Опционально: обновляем статус синхронизации
        document.getElementById('syncStatus').innerText =
            "● Обновлено " + new Date().toLocaleTimeString();

    } catch (error) {
        console.error('Ошибка при сохранении комментария в Firebase:', error);

        // Резервное сохранение в localStorage на случай проблем с сетью
        saveToLocalStorage();
    }
}

//Вспомогательная функция резервного сохранения в localStorage при проблемах с сетью
function saveToLocalStorage() {
    try {
        localStorage.setItem('shoppingList', JSON.stringify(items));
        console.log('Данные сохранены в localStorage как fallback');
    } catch (e) {
        console.error('Не удалось сохранить в localStorage:', e);
    }
}

// Обработчик нажатия клавиш
function handleKeyPress(event, itemId, input) {
    // Сохраняем при нажатии Enter (но не при Shift+Enter для переноса строки)
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        saveComment(itemId, input.value, input);
    }
}

// Обработчик потери фокуса
function handleCommentSave(itemId, input) {
    saveComment(itemId, input.value, input);
}

// Основная функция сохранения с индикацией статуса
async function saveComment(itemId, comment, input) {
    const statusEl = document.getElementById(`status-${itemId}`);

    // Показываем статус «сохраняется»
    if (statusEl) {
        statusEl.textContent = '💾';
        statusEl.className = 'save-status saving';
    }

    try {
        // Предполагаем, что updateItemComment возвращает обновлённый комментарий
        const updatedComment = await updateItemComment(itemId, comment);

        // Обновляем значение поля ввода, если сервер вернул изменённый текст
        input.value = updatedComment || comment;

        // Показываем успех
        if (statusEl) {
            statusEl.textContent = '👍';
            statusEl.className = 'save-status saved';

            // Возвращаем статус «готово» через 2 секунды
            setTimeout(() => {
                statusEl.textContent = '✅';
                statusEl.className = 'save-status';
            }, 2000);
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        if (statusEl) {
            statusEl.textContent = '❗️';
            statusEl.style.color = '#dc3545';
        }
    }
}

//Курсор слева при фокусе на комментарии
function forceCursorToBeginning(input) {
    // Даём браузеру обработать клик, затем перемещаем курсор
    setTimeout(() => {
        input.setSelectionRange(0, 0);
        input.focus();
    }, 0);
}


// Функция выбора подсказки (не перемещать в ругое место, там есть зависимость от функции updateSuggestions)
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

// Отмеченные товары
function toggleComplete(id) {
    const item = items.find(i => i.id === id);
    if (item) db.child(id).update({ completed: !item.completed });
    calculateCheckedSum();
}

//Сумма отмесенных товаров
function calculateCheckedSum() {
  return items.reduce((sum, item) => {
    if (item.completed) {
      return sum + (item.price * item.quantity);
    }
    return sum;
  }, 0);
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

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  loadGoogleAuthScript();
  checkAuthOnLoad();
});
