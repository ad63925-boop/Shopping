// Функция для добавления записи в журнал
function addLog(actionText) {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    
    const log = {
        date: new Date().toLocaleString(),
        action: actionText,
        user: user.email || "Неизвестно"
    };

    const logsRef = firebase.database().ref("logs");

    // Добавляем запись
    logsRef.push(log);

    // Ограничиваем до 50 записей
    logsRef.once("value", snapshot => {
        const logs = [];
        snapshot.forEach(child => {
            logs.push({
                key: child.key,
                ...child.val()
            });
        });

        if (logs.length > 50) {
            const toDelete = logs.slice(0, logs.length - 50);
            toDelete.forEach(item => {
                logsRef.child(item.key).remove();
            });
        }
    });
}

//Функция отображения журнала
function showLogs() {
    const container = document.getElementById("logsContainer");

    if (container.style.display === "block") {
        container.style.display = "none";
        return;
    }

    container.style.display = "block";
    container.innerHTML = "Загрузка...";

    firebase.database().ref("logs")
        .limitToLast(50)
        .once("value", snapshot => {

            let html = "<h3>Журнал событий</h3>";

            const logs = [];

            snapshot.forEach(child => {
                logs.push(child.val());
            });

            logs.reverse().forEach(log => {
                html += `
                    <div style="border-bottom:1px solid #ccc; padding:5px;">
                        <b>${log.date}</b><br>
                        ${log.action}<br>
                        👤 ${log.user}
                    </div>
                `;
            });

            container.innerHTML = html;
        });
}