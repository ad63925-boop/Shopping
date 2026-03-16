// Конфигурация
const CONFIG = {
  GOOGLE_CLIENT_ID: '830473544242-h61ueurumh9fp70qfglb8l3jkle89otn.apps.googleusercontent.com',
  GOOGLE_SCRIPT_URL: 'https://accounts.google.com/gsi/client'
};

// Инициализация Google Identity Services
async function initGoogleAuth() {
  if (typeof google === 'undefined') {
    console.error('Google Identity Services не загружены');
    showError('Сервис авторизации временно недоступен');
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
    showError('Не удалось настроить вход через Google');
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

// Обработка ответа от Google
async function handleGoogleResponse(response) {
  try {
    const payload = google.accounts.id.parseCredential(response.credential);

    // Валидация данных
    if (!payload.email || !payload.name) {
      throw new Error('Неполные данные от Google');
    }

    const userData = {
      name: sanitizeInput(payload.name),
      email: payload.email,
      picture: payload.picture || '/default-avatar.png'
    };

    // Сохраняем данные пользователя
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('googleToken', response.credential); // Сохраняем токен

    // Обновляем интерфейс
    updateUIAfterLogin(userData);

  } catch (error) {
    console.error('Ошибка авторизации:', error);
    showError('Не удалось войти через Google. Попробуйте ещё раз.');
  }
}

// Очистка потенциально опасных символов
function sanitizeInput(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Обновление интерфейса после входа
function updateUIAfterLogin(user) {
  const header = document.querySelector('header');
  if (!header) return;

  // Очищаем заголовок
  header.innerHTML = '';

  // Создаём контейнер профиля
  const profileContainer = createSafeElement('div', {
    style: 'display: flex; align-items: center; gap: 15px;'
  });

  // Аватар
  const avatar = createSafeElement('img', {
    src: user.picture,
    alt: 'Avatar',
    width: '40',
    style: 'border-radius: 50%;'
  });

  // Информация о пользователе
  const userInfo = createSafeElement('div');
  const name = createSafeElement('div', {
    style: 'font-weight: bold;'
  }, [`Добро пожаловать, ${user.name}!`]);
  const email = createSafeElement('div', {
    style: 'font-size: 0.8rem; color: #666;'
  }, [user.email]);

  userInfo.appendChild(name);
  userInfo.appendChild(email);

  profileContainer.appendChild(avatar);
  profileContainer.appendChild(userInfo);
  header.appendChild(profileContainer);

  // Кнопка выхода
  const logoutBtn = createSafeElement('button', {
    textContent: 'Выйти',
    className: 'google-btn',
    onclick: logout
  });

  header.appendChild(logoutBtn);

  // Скрываем кнопку входа
  const signInBtn = document.getElementById('googleSignIn');
  if (signInBtn) {
    signInBtn.style.display = 'none';
  }
}

// Выход из аккаунта
function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('googleToken');

  // Опционально: вызов Google logout
  if (typeof google !== 'undefined') {
    google.accounts.id.disableAutoSelect();
  }

  location.reload();
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

// Загрузка Google Identity Services и инициализация
function loadGoogleAuthScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CONFIG.GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('Google Auth script загружен');
      initGoogleAuth();
      resolve();
    };

    script.onerror = () => {
      console.error('Ошибка загрузки Google Auth script');
      showError('Не удалось загрузить сервис авторизации');
      reject();
    };

    document.head.appendChild(script);
  });
}

// Отображение ошибок пользователю
function showError(message) {
  Swal.fire('Ошибка', message, 'error');
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  checkAuthOnLoad();
  await loadGoogleAuthScript();
});
