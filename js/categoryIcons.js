window.categoryIcons = {
  "Разное": "fa-cart-shopping",
  "Овощи/Фрукты": "fa-carrot",
  "Молочка": "fa-cow",
  "Вода/соки": "fa-bottle-water",
  "Колбаса/сыр": "fa-drumstick-bite",
  "Крупы/пиво": "fa-wheat-awn",
  "Консервы": "fa-box-archive",
  "Приправы/сахар": "fa-mortar-pestle",
  "Хлеб/булочки": "fa-bread-slice",
  "Конфеты/печенье": "fa-cookie-bite",
  "Заморозка": "fa-snowflake",
  "Вино/водка": "fa-wine-bottle",
  "Химия": "fa-pump-soap",
  "Канцтовары": "fa-book",
  "Кассы": "fa-cash-register",
  "Аптека": "fa-pills",
  "Детское" : "fa-baby-carriage"
};

window.getCategoryIcon = function getCategoryIcon(category) {
  const cleanCategory = String(category || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const iconName = window.categoryIcons[cleanCategory] || 'fa-cart-shopping';

  return `<i class="fa-solid ${iconName}" aria-hidden="true"></i>`;
};
