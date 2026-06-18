// Конфигурация
const CONFIG = {
  GOOGLE_CLIENT_ID: '830473544242-h61ueurumh9fp70qfglb8l3jkle89otn.apps.googleusercontent.com',
  GOOGLE_SCRIPT_URL: 'https://accounts.google.com/gsi/client'
};

// Инициализация Google Identity Services
async function initGoogleAuth() {
  if (typeof google === 'undefined') {
    console.error('Google Identity Services не загружены');
    showNotification('Сервис авторизации временно недоступен', 'error');
    return;
  }

    if (!google.accounts?.id) {
    console.error('Google accounts API не инициализирован');
    showNotification('Ошибка инициализации сервиса авторизации', 'error');
    return;
  }

  const signInButton = document.getElementById('googleSignIn');
  if (!signInButton) {
    console.warn('Кнопка входа не найдена');
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse
    });

    google.accounts.id.renderButton(signInButton, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with'
    });
  } catch (error) {
    console.error('Ошибка инициализации Google Auth:', error);
    showNotification('Не удалось настроить вход через Google');
  }
}

// Безопасное создание элементов (защита от XSS)
function createSafeElement(tag, props = {}, children = []) {
  const element = document.createElement(tag);
  Object.assign(element, props);
  children.forEach(child => {
    if (child instanceof Node) {
      element.appendChild(child);
    } else {
      element.textContent = child;
    }
  });
  return element;
}

// Вспомогательные функции (вынесены за пределы handleGoogleResponse)
function fixUnicodeString(str) {
  try {
    // Если строка уже нормальная (латиница + кириллица), возвращаем её
    if (/^[\u0000-\u007F\u0400-\u04FF\s]+$/.test(str)) {
      return str;
    }

    // Преобразуем строку в ArrayBuffer и декодируем как UTF‑8
    const bytes = new TextEncoder().encode(str);
    return new TextDecoder('utf-8').decode(bytes);
  } catch (error) {
    console.warn('Не удалось исправить кодировку строки:', error);
    return str; // Возвращаем оригинал при ошибке
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  const tempDiv = document.createElement('div');
  tempDiv.textContent = str;
  return tempDiv.textContent;
}

// Обработка ответа от Google
async function handleGoogleResponse(response) {
  try {
    console.log('Raw Google response:', response);
    console.log('Raw credential (JWT):', response.credential);

    let payload;

    // Попытка использовать parseCredential (современный способ)
    if (typeof google !== 'undefined' && google.accounts?.id?.parseCredential) {
      console.log('Используем google.accounts.id.parseCredential');
      payload = google.accounts.id.parseCredential(response.credential);
    } else {
      // Fallback: ручной парсинг JWT
      console.warn('parseCredential недоступен. Используем ручной парсинг JWT');

      try {
        const jwtParts = response.credential.split('.');

        // Проверка структуры JWT (должно быть 3 части)
        if (jwtParts.length !== 3) {
          throw new Error('Некорректный формат JWT-токена');
        }

        // Декодирование payload (вторая часть JWT)
        const decodedPayload = JSON.parse(atob(jwtParts[1]));
        payload = decodedPayload;
      } catch (parseError) {
        console.error('Ошибка ручного парсинга JWT:', parseError);
        throw new Error(`Не удалось распарсить токен: ${parseError.message}`);
      }
    }

    console.log('Parsed payload:', payload);
    console.log('Name before sanitization:', payload.name);

    // Валидация данных от Google
    if (!payload.email || !isValidEmail(payload.email)) {
      throw new Error('Некорректный email от Google');
    }
    if (!payload.name) {
      throw new Error('Отсутствует имя пользователя от Google');
    }

    const userData = {
      name: fixUnicodeString(sanitizeInput(payload.name)),
      email: payload.email,
      picture: payload.picture || '/default-avatar.png',
      id: payload.sub
    };

    console.log('Final user data:', userData);

    // Сохраняем данные пользователя
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('googleToken', response.credential); // Сохраняем токен

    // Обновляем интерфейс
    updateUIAfterLogin(userData);
  } catch (error) {
    console.error('Критическая ошибка авторизации:', error);
    showNotification('Не удалось войти через Google. Попробуйте ещё раз.', 'error');
  }
}



// Очистка потенциально опасных символов
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';

  const tempDiv = document.createElement('div');
  tempDiv.textContent = str;
  return tempDiv.textContent; // Возвращаем только текст, без HTML
}

// Обновление интерфейса после входа
function updateUIAfterLogin(user) {
  const header = document.querySelector('header');
  if (!header) return;

  // Очищаем заголовок
  header.innerHTML = '';

  // Создаём контейнер профиля
  const profileContainer = createSafeElement('div', {
    className: 'profile-container'
  });

  // Аватар
  const avatar = createSafeElement('img', {
    src: user.picture,
    alt: 'Avatar',
    width: '40',
    style: 'border-radius: 50%;'
  });

  //обработчик ошибки для изображения:
  avatar.onerror = () => {
  avatar.src = '/default-avatar.png';
};

  // Информация о пользователе
  const userInfo = createSafeElement('div', {
    className: 'user-info'
  });

  const name = createSafeElement('div', {
    className: 'user-name'
  }, [user.name || 'Гость']);

  const email = createSafeElement('div', {
    className: 'user-email'
  }, [user.email || 'Неизвестно']);

  userInfo.appendChild(name);
  userInfo.appendChild(email);

  profileContainer.appendChild(avatar);
  profileContainer.appendChild(userInfo);
  header.appendChild(profileContainer);

  // Кнопка выхода
  const logoutBtn = createSafeElement('button', {
    innerHTML: '<i class="fa-solid fa-arrow-right-from-bracket"></i>Выйти',
    className: 'google-btn',
    onclick: logout
  });

  userInfo.appendChild(logoutBtn);

  // Скрываем кнопку входа
  const signInBtn = document.getElementById('googleSignIn');
  if (signInBtn && user.email === 'ad63925@gmail.com') {
    signInBtn.style.display = 'none';
    shoppingList.style.display = 'block';
    currentList = "deferredList";
    visit.style.display = 'none';
  } else {
    visit.style.display = 'block';
  }
  
  addLog("Вошел в аккаунт: " + user.email);
}

// Выход из аккаунта
function logout() {
  Swal.fire({
    title: 'Вы уверены?',
    text: 'Вы действительно хотите выйти из аккаунта?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Да, выйти',
    cancelButtonText: 'Отмена',
    reverseButtons: true,
    customClass: {
      confirmButton: 'swal2-btn-confirm',
      cancelButton: 'swal2-btn-cancel'
    },
    buttonsStyling: false
  }).then((result) => {
    if (!result.isConfirmed) return;

    const stored = getStoredUser();
    const email = stored.email || 'Неизвестно';
    addLog('Вышел из аккаунта: ' + email);
    localStorage.removeItem('user');
    localStorage.removeItem('googleToken');

    // Опционально: вызов Google logout
    if (typeof google !== 'undefined') {
      google.accounts.id.disableAutoSelect();
    }

    Swal.fire({
      title: 'Вы вышли',
      text: 'Вы успешно вышли из аккаунта.',
      icon: 'success',
      timer: 1200,
      showConfirmButton: false
    }).then(() => {
      location.reload();
    });
  });
}

// Проверка авторизации при загрузке страницы
function checkAuthOnLoad() {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      updateUIAfterLogin(user);
    } catch (e) {
      console.error('Ошибка парсинга данных пользователя:', e);
      localStorage.removeItem('user');
    }
  }
}

function getStoredUser() {
  const savedUser = localStorage.getItem('user');
  if (!savedUser) return {};
  try {
    return JSON.parse(savedUser);
  } catch (e) {
    console.error('Ошибка парсинга данных пользователя:', e);
    return {};
  }
}

function loadProfilePanelFields() {
  const user = getStoredUser();
  const photo = document.getElementById('profilePhoto');
  const name = document.getElementById('profileName');
  const email = document.getElementById('profileEmail');
  const phone = document.getElementById('profilePhone');
  const comment = document.getElementById('profileComment');
  const notice = document.getElementById('profileLoginNotice');

  if (photo) {
    photo.src = user.picture || '/default-avatar.png';
    photo.alt = user.name ? `Фото ${user.name}` : 'Фото профиля';
    photo.onerror = () => { photo.src = '/default-avatar.png'; };
  }

  // Приоритет: локально сохранённое имя пользователя, затем Google, затем 'Гость'
  const localName = localStorage.getItem('profileName');
  if (name) name.textContent = localName || user.name || 'Гость';
  if (email) email.textContent = user.email || 'Не авторизован';
  if (phone) phone.value = localStorage.getItem('profilePhone') || '';
  if (comment) comment.value = localStorage.getItem('profileComment') || '';
  if (notice) notice.textContent = user.email ? '' : 'Чтобы получить имя и почту, войдите через Google.';
}

function saveProfilePanelData() {
  const phoneInput = document.getElementById('profilePhone');
  const commentInput = document.getElementById('profileComment');
  if (!phoneInput || !commentInput) return;

  const phone = sanitizeInput(phoneInput.value.trim());
  const comment = sanitizeInput(commentInput.value.trim());
  localStorage.setItem('profilePhone', phone);
  localStorage.setItem('profileComment', comment);
  // Сохраняем редактируемое имя профиля
  const profileNameEl = document.getElementById('profileName');
  if (profileNameEl) {
    const savedName = sanitizeInput(profileNameEl.textContent.trim()) || 'Гость';
    localStorage.setItem('profileName', savedName);
    // Обновляем поле в хранилище user, если он есть
    const stored = getStoredUser();
    if (stored && stored.email) {
      stored.name = savedName;
      try { localStorage.setItem('user', JSON.stringify(stored)); } catch (e) { /* ignore */ }
    }
    addLog(`Сохранено имя профиля: ${savedName}`);
  }
  showNotification('Данные профиля сохранены локально.', 'success');
  addLog(`Сохранены данные профиля: телефон=${phone || 'пусто'}, коммент="${comment ? comment.slice(0,50) : ''}"`);
}

function openProfilePanel() {
  const panel = document.getElementById('profilePanel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  loadProfilePanelFields();
  addLog('Открыт профиль');
}

function closeProfilePanel() {
  const panel = document.getElementById('profilePanel');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  addLog('Закрыт профиль');
}

function toggleProfilePanel() {
  const panel = document.getElementById('profilePanel');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    closeProfilePanel();
  } else {
    openProfilePanel();
  }
}

// Загрузка Google Identity Services и инициализация
async function loadGoogleAuthScript(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CONFIG.GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      //console.log('Google Auth script загружен успешно');
      //console.log('google:', typeof google);
      if (typeof google !== 'undefined') {
        //console.log('google.accounts:', typeof google.accounts);
        if (google.accounts?.id) {
          //console.log('parseCredential доступен:', typeof google.accounts.id.parseCredential);
        }
      }
      initGoogleAuth();
      resolve();
    };

    script.onerror = () => {
      console.error('Ошибка загрузки Google Auth script');
      showNotification('Не удалось загрузить сервис авторизации', 'error');
      reject();
    };

    document.head.appendChild(script);
  });
        return;
    } catch (error) {
      if (i === retries - 1) {
        showNotification('Не удалось загрузить сервис авторизации после нескольких попыток', 'error');
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Отображение ошибок пользователю
function showError(message) {
  Swal.fire('Ошибка', message, 'error');
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  checkAuthOnLoad();
  document.getElementById('login')?.addEventListener('click', event => {
    event.preventDefault();
    toggleProfilePanel();
  });
  document.getElementById('closeProfilePanel')?.addEventListener('click', closeProfilePanel);
  document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfilePanelData);
  // Позволяем править имя прямо в панели: сохраняем при blur и при Enter
  const profileNameEl = document.getElementById('profileName');
  if (profileNameEl) {
    profileNameEl.addEventListener('blur', () => {
      const val = sanitizeInput(profileNameEl.textContent.trim()) || 'Гость';
      localStorage.setItem('profileName', val);
      // Обновляем user.name, если есть
      const stored = getStoredUser();
      if (stored && stored.email) {
        stored.name = val;
        try { localStorage.setItem('user', JSON.stringify(stored)); } catch (e) {}
      }
      showNotification('Имя сохранено локально', 'success');
      addLog('Сохранено имя профиля: ' + val);
    });
    profileNameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); profileNameEl.blur(); }
    });
  }
  // Меню-панель: открытие/закрытие
  document.getElementById('menu')?.addEventListener('click', event => {
    event.preventDefault();
    toggleMenuPanel();
  });
  document.getElementById('closeMenuPanel')?.addEventListener('click', closeMenuPanel);
  document.getElementById('shareBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await shareCurrentList();
  });
  document.getElementById('selectAllBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await toggleSelectAll();
  });
  await loadGoogleAuthScript();
});

// Меню-панель: функции управления
function openMenuPanel() {
  const panel = document.getElementById('menuPanel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  addLog('Открылось меню');
}

// Функция шаринга текущего списка
async function shareCurrentList() {
  try {
    const listItems = (typeof items !== 'undefined' && Array.isArray(items)) ? items : (Array.isArray(window.items) ? window.items : []);
    if (listItems.length === 0) {
      showNotification('Список пуст', 'error');
      return;
    }

    const lines = [];
    lines.push('Список покупок:');
    let total = 0;
    listItems.forEach((it, idx) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.price) || 0;
      const itemTotal = qty * price;
      total += itemTotal;
      lines.push(`${idx + 1}. ${it.name} — ${qty} x ${price} ₽ = ${itemTotal.toFixed(2)} ₽`);
    });
    lines.push('Итого: ' + total.toFixed(2) + ' ₽');

    const text = lines.join('\n');

    if (navigator.share) {
      await navigator.share({ title: 'Список покупок', text });
      showNotification('Список отправлен', 'success');
      addLog('Список отправлен через Web Share API');
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showNotification('Список скопирован в буфер обмена', 'success');
      addLog('Список скопирован в буфер обмена');
    } else {
      // last resort: открыть окно с текстом для ручного копирования
      const win = window.open('', '_blank');
      if (win) {
        win.document.write('<pre>' + text.replace(/</g, '&lt;') + '</pre>');
        win.document.title = 'Список покупок';
      }
      showNotification('Шэринг недоступен — открылось окно с текстом', 'info');
      addLog('Шэринг: открыт терминальный просмотр списка');
    }

    // Закрываем меню после успешного шаринга
    closeMenuPanel();
  } catch (err) {
    console.error('Ошибка шаринга списка:', err);
    showNotification('Не удалось поделиться списком', 'error');
  }
}

function closeMenuPanel() {
  const panel = document.getElementById('menuPanel');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  addLog('Закрыто меню');
}

function toggleMenuPanel() {
  const panel = document.getElementById('menuPanel');
  if (!panel) return;
  if (panel.classList.contains('open')) closeMenuPanel(); else openMenuPanel();
}

// Отметить/снять отметки для всех товаров текущего списка
async function toggleSelectAll() {
  try {
    const listItems = (typeof items !== 'undefined' && Array.isArray(items)) ? items : (Array.isArray(window.items) ? window.items : []);
    if (listItems.length === 0) {
      showNotification('Список пуст', 'error');
      return;
    }

    const allSelected = listItems.every(it => !!it.completed);
    const setTo = !allSelected;

    const promises = listItems.map(it => {
      try {
        return getDb().child(it.id).update({ completed: setTo });
      } catch (err) {
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
    showNotification(setTo ? 'Все товары отмечены' : 'Выделения сняты', 'success');
    addLog(setTo ? 'Отмечены все товары' : 'Сняты отметки со всех товаров');
    closeMenuPanel();
    render();
  } catch (err) {
    console.error('Ошибка при массовой отметке:', err);
    showNotification('Не удалось отметить все товары', 'error');
  }
}
