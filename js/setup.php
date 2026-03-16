<?php
$host = 'localhost';
$dbname = 'my_website'; // Замените на имя вашей БД
$username_db = 'root';  // Замените на логин пользователя БД
$password_db = '';       // Замените на пароль пользователя БД

try {
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8";
    $pdo = new PDO($dsn, $username_db, $password_db);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";

    $pdo->exec($sql);
    echo "Таблица 'users' успешно создана или уже существует.";
} catch (PDOException $e) {
    die("Ошибка: " . $e->getMessage());
}
?>
