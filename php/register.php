<?php

require_once 'config.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $_POST['username'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT); // Хэширование пароля

    $sql = "INSERT INTO users (username, password) VALUES (:username, :password)";
    $stmt = $pdo->prepare($sql);

    try {
        $stmt->execute([
            ':username' => $username,
            ':password' => $password
        ]);
        echo "Регистрация прошла успешно!";
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) { // Ошибка дублирования уникального поля
            echo "Пользователь с таким именем уже существует.";
        } else {
            echo "Ошибка при выполнении запроса: " . $e->getMessage();
        }
    }
}
?>
