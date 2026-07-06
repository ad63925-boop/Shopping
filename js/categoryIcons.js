window.categoryIcons = {
  "Разное": "fa-cart-shopping",
  "Овощи": "fa-carrot",
  "Молочка": "fa-cow",
  "Вода": "fa-bottle-water",
  "Колбаса": "fa-drumstick-bite",
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
  "Детское": "fa-baby-carriage",
  "Авто": "fa-car",
  "Техно": "fa-laptop",
  "Инструмент": "fa-screwdriver-wrench"
};

window.categoryColors = {
  "Разное": "#7c3aed",
  "Овощи": "#16a34a",
  "Молочка": "#f59e0b",
  "Вода": "#0ea5e9",
  "Колбаса": "#dc2626",
  "Колбаса/сыр": "#dc2626",
  "Крупы": "#a16207",
  "Консервы": "#ef4444",
  "Приправы": "#8b5cf6",
  "Хлеб": "#d97706",
  "Сладкое": "#ec4899",
  "Заморозка": "#3b82f6",
  "Алко": "#7f1d1d",
  "Химия": "#14b8a6",
  "Канцтов": "#6366f1",
  "Кассы": "#0f766e",
  "Аптека": "#22c55e",
  "Детское": "#f43f5e",
  "Авто": "#475569",
  "Техно": "#2563eb",
  "Инструмент": "#ea580c"
};

window.getCategoryIcon = function getCategoryIcon(category) {
  const cleanCategory = String(category || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const iconName = window.categoryIcons[cleanCategory] || 'fa-cart-shopping';

  return `<i class="fa-solid ${iconName}" aria-hidden="true"></i>`;
};

window.getCategoryColor = function getCategoryColor(category) {
  const cleanCategory = String(category || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  return window.categoryColors[cleanCategory] || '#3b82f6';
};
