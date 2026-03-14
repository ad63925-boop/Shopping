//Связь с облаком
firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref("shopping_list");
const settingsDb = firebase.database().ref("settings"); // Для сохранения лимита