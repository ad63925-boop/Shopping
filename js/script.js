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

//Авторизация
// Инициализация Google Identity Services
function initGoogleAuth() {
  if (typeof google === 'undefined') {
    console.error('Google Identity Services не загружены');
    return;
  }

  google.accounts.id.initialize({
    client_id: '830473544242-h61ueurumh9fp70qfglb8l3jkle89otn.apps.googleusercontent.com', // Замените на ваш Client ID
    callback: handleGoogleResponse
  });

  google.accounts.id.renderButton(
    document.getElementById('googleSignIn'),
    { theme: 'outline', size: 'large' }
  );
}

// Обработка ответа от Google
async function handleGoogleResponse(response) {
  try {
    const payload = google.accounts.id.parseCredential(response.credential);

    // Сохраняем данные пользователя
    localStorage.setItem('user', JSON.stringify({
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    }));

    // Обновляем интерфейс
    updateUIAfterLogin(payload);

  } catch (error) {
    console.error('Ошибка авторизации:', error);
    Swal.fire('Ошибка', 'Не удалось войти через Google', 'error');
  }
}

// Обновление интерфейса после входа
function updateUIAfterLogin(user) {
  const header = document.querySelector('header');
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 15px;">
      <img src="${user.picture}" alt="Avatar" width="40" style="border-radius: 50%;">
      <div>
        <div style="font-weight: bold;">Добро пожаловать, ${user.name}!</div>
        <div style="font-size: 0.8rem; color: #666;">${user.email}</div>
      </div>
    </div>
  `;

  // Скрываем кнопку входа, показываем кнопку выхода
  document.getElementById('googleSignIn').style.display = 'none';
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Выйти';
  logoutBtn.onclick = logout;
  logoutBtn.className = 'google-btn';
  header.appendChild(logoutBtn);
}

// Выход из аккаунта
function logout() {
  localStorage.removeItem('user');
  location.reload();
}

// Проверка авторизации при загрузке страницы
function checkAuthOnLoad() {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    updateUIAfterLogin(JSON.parse(savedUser));
  }
}

// Загрузка Google Identity Services и инициализация
function loadGoogleAuthScript() {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.onload = initGoogleAuth;
  document.head.appendChild(script);
}
// Физические размеры экрана в пикселях
console.log('Ширина (px):', screen.width);
console.log('Высота (px):', screen.height);

// Размеры viewport (с учётом масштабирования)
console.log('Viewport ширина (px):', window.innerWidth);
console.log('Viewport высота (px):', window.innerHeight);

// Плотность пикселей (DPI)
console.log('Плотность (PPI):', window.devicePixelRatio);

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  loadGoogleAuthScript();
  checkAuthOnLoad();
});
