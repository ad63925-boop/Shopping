// Валидация названия товара (запрет точки)
function isValidItemName(name) {
    if (!name) return true; // Пустое поле — допустимо

    // Проверяем наличие точки
    if (name.includes('.')) {
        showError('Название не может содержать точку (.) — это запрещено Firebase');
        return false;
    }

    return true;
}

//Функция отображения ошибки
function showError(message) {
    // Удаляем предыдущее сообщение, если есть
    const existingError = document.getElementById('inputError');
    if (existingError) {
        existingError.remove();
    }

    const nameInput = document.getElementById('itemName');
    const errorDiv = document.createElement('div');
    errorDiv.id = 'inputError';
    errorDiv.className = 'input-error';
    errorDiv.textContent = message;

    // Вставляем сообщение сразу после поля ввода
    nameInput.parentNode.insertBefore(errorDiv, nameInput.nextSibling);

    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}