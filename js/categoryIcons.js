window.categoryIcons = {
  "Разное": "fa-cart-shopping",
  "Овощи": "fa-carrot",
  "Молочка": "fa-cow",
  "Вода": "fa-bottle-water",
  "Колбаса/сыр": "fa-drumstick-bite",
  "Крупы": "fa-wheat-awn",
  "Консервы": "fa-box-archive",
  "Приправы": "fa-mortar-pestle",
  "Хлеб": "fa-bread-slice",
  "Сладкое": "fa-cookie-bite",
  "Заморозка": "fa-snowflake",
  "Алко": "fa-wine-bottle",
  "Химия": "fa-pump-soap",
  "Канцтов": "fa-book",
  "Кассы": "fa-cash-register",
  "Аптека": "fa-pills",
  "Детское" : "fa-baby-carriage",
  "Авто": "fa-car",
  "Техно": "fa-laptop"
};

window.getCategoryIcon = function getCategoryIcon(category) {
  const cleanCategory = String(category || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const iconName = window.categoryIcons[cleanCategory] || 'fa-cart-shopping';

  return `<i class="fa-solid ${iconName}" aria-hidden="true"></i>`;
};
