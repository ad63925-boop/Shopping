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

// Функция для добавления товара
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

//Комментарии к товарам
async function updateItemComment(itemId, comment) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Обновляем локальный объект
    item.comment = comment;

    try {
        // Используем уже инициализированную базу данных
        // db указывает на 'shopping_list'
        const itemRef = db.child(itemId);

        // Обновляем только поле comment у конкретного товара
        await itemRef.update({
            comment: comment
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
        statusEl.textContent = 'Сохраняется...';
        statusEl.className = 'save-status saving';
    }

    try {
        // Предполагаем, что updateItemComment возвращает обновлённый комментарий
        const updatedComment = await updateItemComment(itemId, comment);

        // Обновляем значение поля ввода, если сервер вернул изменённый текст
        input.value = updatedComment || comment;

        // Показываем успех
        if (statusEl) {
            statusEl.textContent = 'Сохранено';
            statusEl.className = 'save-status saved';

            // Возвращаем статус «готово» через 2 секунды
            setTimeout(() => {
                statusEl.textContent = 'Готово';
                statusEl.className = 'save-status';
            }, 2000);
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        if (statusEl) {
            statusEl.textContent = 'Ошибка сохранения';
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

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  loadGoogleAuthScript();
  checkAuthOnLoad();
});
