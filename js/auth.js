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
  const userInfo = createSafeElement('div',{},[`🛒Список покупок🛍️`]);
  userInfo.className = 'user-info';
  const name = createSafeElement('div', {
      }, [`Добро пожаловать!`]);
      console.log('Пользователь:', name.textContent);
  name.className = 'user-name';
  const email = createSafeElement('div', {
  }, [user.email]);
  email.className = 'user-email';

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

  userInfo.appendChild(logoutBtn);

  // Скрываем кнопку входа
  const signInBtn = document.getElementById('googleSignIn');
  if (signInBtn) {
    signInBtn.style.display = 'none';
    shoppingList.style.display = 'block';
    visit.style.display = 'none';
  } else {
    visit.style.display = 'block';
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
  await loadGoogleAuthScript();
});
