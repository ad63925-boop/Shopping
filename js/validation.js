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

// Добавляем проверку при вводе в поле названия
document.getElementById('itemName').addEventListener('input', function() {
    const name = this.value;

    // Если есть точка — показываем ошибку
    if (name.includes('.')) {
        showError('Точка (.) запрещена в названии — это ограничение Firebase');
        Swal.fire('Ошибка', 'Точка (.) запрещена!', 'error');
    } else {
        // Удаляем сообщение об ошибке, если пользователь исправил
        const errorDiv = document.getElementById('inputError');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
});

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

