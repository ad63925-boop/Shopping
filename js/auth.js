
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