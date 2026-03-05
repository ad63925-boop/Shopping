  //Функция показа уведомления "Сохранено!"
  function showSaved() {
  const el = document.getElementById("saveNotify");
  el.style.display = "block";
  el.style.opacity = "1";

  clearTimeout(showSaved.timer);
  showSaved.timer = setTimeout(() => {
    el.style.display = "none";
  }, 2000);
}



(function(){
  const TABLE_COUNT = 7;
  const ROWS = 10;
  const STORAGE_KEY = 'sevenTablesData_v1';  
  const HISTORY_KEY = 'sevenTables_history_v1';
  const MAX_HISTORY_SIZE = 50;

  let history = [];
  let historyIndex = -1;

  function loadHistory() {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          history = parsed;
          historyIndex = history.length - 1;
        }
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  }

  function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function addToHistory(data) {
    // Удаляем все элементы после текущего индекса (если мы откатились назад и начали новые изменения)
    history = history.slice(0, historyIndex + 1);
    
    // Добавляем новое состояние
    history.push(JSON.parse(JSON.stringify(data)));
    
    // Ограничиваем размер истории
    if (history.length > MAX_HISTORY_SIZE) {
      history.shift();
    }
    
    historyIndex = history.length - 1;
    saveHistory();
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      const previousState = history[historyIndex];
      state = previousState;
      saveAll(state);
      buildUI(state);
    } else {
      alert('Нет действий для отмены');
    }
  }

  function loadData(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const arr = Array.from({length: TABLE_COUNT}, () => Array.from({length: ROWS}, () => ''));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      addToHistory(arr); // Добавляем начальное состояние в историю
      return arr;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length !== TABLE_COUNT) throw new Error();

      for (let i = 0; i < TABLE_COUNT; i++) {
        if (!Array.isArray(parsed[i])) parsed[i] = Array.from({length: ROWS}, () => '');
        if (parsed[i].length < ROWS) parsed[i] = parsed[i].concat(Array.from({length: ROWS - parsed[i].length}, () => ''));
        if (parsed[i].length > ROWS) parsed[i] = parsed[i].slice(0, ROWS);
      }
      
      // Загружаем историю и добавляем текущее состояние, если его нет в истории
      loadHistory();
      if (history.length === 0) {
        addToHistory(parsed);
      }
      
      return parsed;

    } catch {
      const arr = Array.from({length: TABLE_COUNT}, () => Array.from({length: ROWS}, () => ''));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      addToHistory(arr);
      return arr;
    }
  }

  function saveAll(data){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function updateCell(data, tableIndex, rowIndex, value){
    const oldValue = data[tableIndex][rowIndex];
    data[tableIndex][rowIndex] = value;
    saveAll(data);
    // Добавляем в историю только если значение действительно изменилось
    if (oldValue !== value) {
      addToHistory(data);
    }
  }

function moveRowUp(tableIndex, rowIndex) {
  if (rowIndex === 0) return; // уже наверху

  const table = state[tableIndex];

  // меняем местами
  [table[rowIndex - 1], table[rowIndex]] =
  [table[rowIndex], table[rowIndex - 1]];

  saveAll(state);
  addToHistory(state);
  buildUI(state);
}

  const weekDays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  function findNearestMonday(d) {
    // clone date
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
    return new Date(d);
  }

  const mondayOfThisWeek = findNearestMonday(new Date());


  // UI
  function buildUI(data){
    const container = document.getElementById('tablesContainer');
    container.innerHTML = '';

    const today = new Date();

    for (let t = 0; t < TABLE_COUNT; t++){
      const card = document.createElement('div');
      card.className = 'table-card';
      card.id = "card" + t;

		if (t === selectedIndex) {
  card.classList.add("selected-day");
}

  const titleH4 = document.createElement('h4');
	
	const shareBtn = document.createElement('button');
shareBtn.textContent = '📸';
shareBtn.title = 'Поделиться днём';
shareBtn.style.cssText = `
  float:right;
  font-size: 18px;
  margin: 0;
  padding: 0;
  border:none;
  background: none;
  cursor:pointer;
`;

shareBtn.addEventListener('click', () => {
  shareCardAsImage(card, titleH4.textContent);
});

card.appendChild(shareBtn);


      const thisDate = new Date(mondayOfThisWeek);
      thisDate.setDate(thisDate.getDate() + t);
      titleH4.textContent = `${weekDays[t]} ( ${thisDate.toLocaleDateString("ru-RU")} )`;
      card.appendChild(titleH4);

      if (
        thisDate.getDate() === today.getDate() &&
        thisDate.getMonth() === today.getMonth() &&
        thisDate.getFullYear() === today.getFullYear()
      ) {
        card.classList.add("today-highlight");
      }

      for (let r = 0; r < ROWS; r++){
const div = document.createElement('div');
div.className = 'cell';

// ⬆ КНОПКА ПЕРЕМЕЩЕНИЯ ВВЕРХ
const upBtn = document.createElement('button');
upBtn.textContent = '⬆';
upBtn.style.marginRight = '4px';
upBtn.style.cursor = 'pointer';

upBtn.addEventListener('click', () => {
  moveRowUp(t, r);
});

div.appendChild(upBtn);

        const input = document.createElement('input');
        input.type = 'search';
        input.className = 'jump';
        input.enterKeyHint = "next";
        input.value = data[t][r] || '';
        input.dataset.table = t;
        input.dataset.row = r;
        input.placeholder = (r+1) + '.';
        input.maxLength = '18';

//Функция показа уведомления "Сохранено!"
        input.addEventListener('input', (e) => {
  const ti = Number(e.target.dataset.table);
  const ri = Number(e.target.dataset.row);
  updateCell(state, ti, ri, e.target.value);
});

// уведомление при потере фокуса
input.addEventListener('blur', () => {
  showSaved();
});

        div.appendChild(input);
        card.appendChild(div);
      }

setTimeout(() => {
        const inputs = document.querySelectorAll('.jump');

        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();

                    const next = inputs[index + 1];
                    if (next) {
                        next.focus();
                    } else {
                        input.blur();
                    }
                }
            });
        });
    }, 0);
    
      container.appendChild(card);
    }

    // Применяем выделение выбранного дня
    updateCurrentLabel();
  }


  function applySelectedHighlight() {
    // удаляем старые выделения
    for (let i=0;i<7;i++){
      const el = document.getElementById('card'+i);
      if (!el) continue;
      el.classList.remove('selected-day');
    }
    const sel = selectedIndex;
    const selectedEl = document.getElementById('card' + sel);
    if (selectedEl) {
      selectedEl.classList.add('selected-day');
    }
  }

  function scrollToSelected(behavior = 'smooth') {
    const el = document.getElementById('card' + selectedIndex);
    if (el) {
      el.scrollIntoView({
        behavior,
        block: 'nearest',
        inline: 'center'
      });
    }
  }

  function updateCurrentLabel() {
    const label = document.getElementById('currentDayLabel');
    const thisDate = new Date(mondayOfThisWeek);
    thisDate.setDate(thisDate.getDate() + selectedIndex);
    label.textContent = `${weekDays[selectedIndex]} ( ${thisDate.toLocaleDateString("ru-RU")} )`;
  }

  function moveSelected(delta) {
  selectedIndex = (selectedIndex + delta + 7) % 7; 
  applySelectedHighlight();
  updateCurrentLabel();
  scrollToSelected();
}

  function exportToJsonFile() {
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      data: state
    };
	
	const now = new Date();

// --- 1. Получение компонентов локального времени ---
const day = String(now.getDate()).padStart(2, '0');
// Месяцы в JavaScript начинаются с 0, поэтому добавляем 1
const month = String(now.getMonth() + 1).padStart(2, '0');
const year = now.getFullYear();
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');

// --- 2. Сборка строки в нужном формате (дд.мм.гггг.чч.мм) ---
const formattedDate = `${day}.${month}.${year}.${hours}.${minutes}`;

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = formattedDate+"_Ежедневник.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFromJsonFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.data || parsed.data.length !== TABLE_COUNT) throw new Error();
        state = parsed.data;
        saveAll(state);
        addToHistory(state); // Добавляем импортированные данные в историю
        buildUI(state);
        alert("Импорт выполнен!");
      } catch {
        alert("Ошибка импорта!");
      }
    };
    reader.readAsText(file);
  }

// ====== ОТДЕЛЬНАЯ ФУНКЦИЯ "ПОДЕЛИТЬСЯ JSON" ======
async function shareJsonFile(data) {
  const exportData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    data
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const file = new File([blob], "Ежедневник.json", { type: "application/json" });

  if (!navigator.share) {
    alert("Делиться файлами тут нельзя 💀");
    return;
  }

  try {
    await navigator.share({
      title: "Ежедневник",
      text: "JSON-файл:",
      files: [file]
    });
  } catch (err) {
    console.log("Ты чё, отменил? Ошибка:", err);
  }
}

function clearSearchHighlight() {
  document.querySelectorAll('.search-found').forEach(el => {
    el.classList.remove('search-found');
  });
  searchResults = [];
  searchPos = 0;
}

	var searchBtn = document.getElementById('searchBtn');
	searchBtn.addEventListener('click', function(){
		searchInput.style.display = 'inline-flex';
	})
function searchNotes(text) {
  clearSearchHighlight();
  if (!text) return;

  text = text.toLowerCase();

  for (let t = 0; t < TABLE_COUNT; t++) {
    for (let r = 0; r < ROWS; r++) {
      const value = state[t][r];
      if (value && value.toLowerCase().includes(text)) {
        searchResults.push({ t, r });
      }
    }
  }

  // Подсветка всех совпадений
  setTimeout(() => {
    searchResults.forEach(({ t, r }) => {
      const input = document.querySelector(
        `input[data-table="${t}"][data-row="${r}"]`
      );
      if (input) input.classList.add('search-found');
    });

    if (searchResults.length) {
      searchPos = 0;
      goToSearchResult(0);
    }
  }, 0);
}

function goToSearchResult(index) {
  const res = searchResults[index];
  if (!res) return;

  selectedIndex = res.t;
  applySelectedHighlight();
  updateCurrentLabel();
  scrollToSelected();

  const input = document.querySelector(
    `input[data-table="${res.t}"][data-row="${res.r}"]`
  );

  if (input) {
    input.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
}

  function setupControls(){
    
    document.getElementById('clearBtn').addEventListener('click', () => {
      if (!confirm('Очистить данные?')) return;
      state = Array.from({length:TABLE_COUNT},()=>Array.from({length:ROWS},()=>''));  
      saveAll(state);
      addToHistory(state); // Добавляем очищенное состояние в историю
      buildUI(state);
    });

     document.getElementById('exportBtn').addEventListener('click', exportToJsonFile);

    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', (e)=>{
      if (e.target.files.length) importFromJsonFile(e.target.files[0]);
    });

    document.getElementById('prevDayBtn').addEventListener('click', () => {
      moveSelected(-1);
    });
    document.getElementById('nextDayBtn').addEventListener('click', () => {
      moveSelected(1);
    });

 //Выбор даты с системного календаря
  function getWeekdayIndexFromDate(date) {
  // JS: 0=Вс ... 6=Сб
  const jsDay = date.getDay();

  // переводим в Пн=0 ... Вс=6
  return jsDay === 0 ? 6 : jsDay - 1;
}

const pickDateBtn = document.getElementById('pickDateBtn');
const datePicker = document.getElementById('datePicker');

// открыть системный календарь
pickDateBtn.addEventListener('click', () => {
  datePicker.showPicker
    ? datePicker.showPicker()
    : datePicker.click();
});

// обработка выбранной даты
datePicker.addEventListener('change', () => {
  if (!datePicker.value) return;

  const selectedDate = new Date(datePicker.value);
  const index = getWeekdayIndexFromDate(selectedDate);

  selectedIndex = index;
  applySelectedHighlight();
  updateCurrentLabel();
  scrollToSelected();
});

    // Кнопка отмены
    document.getElementById('undoBtn').addEventListener('click', undo);

    // Горячая клавиша Ctrl+Z для отмены
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    });
  }

	//Поле поиска
	const searchInput = document.getElementById('searchInput');

searchInput.addEventListener('input', (e) => {
  searchNotes(e.target.value.trim());
});

function getTodayIndex() {
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayOfThisWeek);
    d.setDate(d.getDate() + i);
    if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
      return i;
    }
  }
  return 0; // если сегодня не в этой неделе, показываем понедельник
}

  let state = loadData();
  let selectedIndex = getTodayIndex();

  buildUI(state);
  setupControls();

  window.addEventListener("load", () => {
	scrollToSelected('smooth');
  });
  
  // Функция для вычисления прошедших недель
        function getWeeksSinceDate() {
            // Получаем текущую дату
            const now = new Date();
            
            // Устанавливаем дату отсчёта (29 сентября текущего года)
            const currentYear = now.getFullYear();
            const startDate = new Date(currentYear, 8, 29); // Месяцы 0-11 (8 = сентябрь)
            
            // Если текущая дата раньше 29 сентября, берём 29 сентября прошлого года
            const targetDate = now < startDate 
                ? new Date(currentYear - 1, 8, 29) 
                : startDate;
            
            // Разница в миллисекундах
            const diffInMs = now - targetDate;
            
            // Конвертируем в недели (1 неделя = 7 дней × 24 часа × 60 минут × 60 секунд × 1000 мс)
            const msInWeek = 7 * 24 * 60 * 60 * 1000;
            const weeksPassed = Math.floor(diffInMs / msInWeek);
            
            return weeksPassed;
        }

        window.addEventListener("load", function () {
    const weekNotifyty = document.getElementById("weekNotifyty");
    const weeks = getWeeksSinceDate();
    weekNotifyty.style.display = 'block';
    weekNotifyty.innerHTML = `С 29 сентября прошло: <br> ${weeks} недель.`;
});

		
		async function shareCardAsImage(cardElement, titleText) {
  const canvas = await html2canvas(cardElement, {
    scale: 2,
    backgroundColor: '#ffffff'
  });

  canvas.toBlob(async (blob) => {
    const fileName = titleText.replace(/[^\w\d]/g, '_') + '.png';
    const file = new File([blob], fileName, { type: 'image/png' });

    // Если поддерживается Web Share API
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Ежедневник',
          text: titleText,
          files: [file]
        });
      } catch (e) {
        console.log('Шаринг отменён');
      }
    } else {
      // fallback — скачать
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  });

}

// ====== СЛАЙДШОУ ИЗОБРАЖЕНИЙ ======
// ====== СЛАЙДШОУ ИЗОБРАЖЕНИЙ С РАНДОМНЫМ ВЫБОРОМ ======

// Массив с ссылками на изображения
const slideshowImages = [
  "https://s1.1zoom.ru/big0/846/Iceland_Mountains_Waterfalls_616668_1280x640.jpg",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba",
  "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
  "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e",
  "https://images.unsplash.com/photo-1439066615861-d1af74d74000"
];

let slideshowUsedIndices = []; // Массив для отслеживания уже показанных изображений
let slideshowCurrentIndex = 0;
let slideshowInterval = null;

// Функция для получения случайного индекса, который еще не использовался
function getRandomUnusedIndex() {
  // Если все изображения были показаны, сбрасываем отслеживание
  if (slideshowUsedIndices.length >= slideshowImages.length) {
    slideshowUsedIndices = [];
  }
  
  // Получаем доступные индексы (те, которые еще не были показаны в текущем цикле)
  const availableIndices = [];
  for (let i = 0; i < slideshowImages.length; i++) {
    if (!slideshowUsedIndices.includes(i)) {
      availableIndices.push(i);
    }
  }
  
  // Если остались доступные изображения, выбираем случайное
  if (availableIndices.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    return availableIndices[randomIndex];
  }
  
  // Если все были показаны, возвращаем случайное из всех
  return Math.floor(Math.random() * slideshowImages.length);
}

// Функция для смены изображения на случайное
function changeSlideshowImage() {
  const imageElement = document.getElementById('currentImage');
  if (!imageElement) {
    console.error('Элемент currentImage не найден!');
    return;
  }
  
  // Плавное исчезновение
  imageElement.style.opacity = '0';
  
  setTimeout(() => {
    // Получаем случайное изображение, которое еще не показывалось в текущем цикле
    slideshowCurrentIndex = getRandomUnusedIndex();
    
    // Добавляем индекс в использованные
    slideshowUsedIndices.push(slideshowCurrentIndex);
    
    // Меняем источник изображения
    imageElement.src = slideshowImages[slideshowCurrentIndex];
    
    // Плавное появление
    setTimeout(() => {
      imageElement.style.opacity = '1';
    }, 10);
  }, 500); // Половина времени перехода
}

// Функция для установки случайного изображения при загрузке
function setRandomImageOnLoad() {
  const imageElement = document.getElementById('currentImage');
  if (!imageElement) return;
  
  // Выбираем случайное изображение
  slideshowCurrentIndex = Math.floor(Math.random() * slideshowImages.length);
  
  // Добавляем его в использованные
  slideshowUsedIndices = [slideshowCurrentIndex];
  
  // Устанавливаем изображение
  imageElement.src = slideshowImages[slideshowCurrentIndex];
  
  // Делаем изображение видимым
  imageElement.style.opacity = '1';
}

// Функция для запуска слайдшоу
function startSlideshow() {
  // Очищаем предыдущий интервал если он существует
  if (slideshowInterval) {
    clearInterval(slideshowInterval);
  }
  
  // Устанавливаем интервал смены изображений (30 секунд)
  slideshowInterval = setInterval(changeSlideshowImage, 30000); // 30000 мс = 30 секунд
}

// Функция для остановки слайдшоу
function stopSlideshow() {
  if (slideshowInterval) {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
  }
}

// Функция для следующего изображения (случайного)
function nextSlideshowImage() {
  changeSlideshowImage();
  // Перезапускаем таймер
  if (slideshowInterval) {
    clearInterval(slideshowInterval);
    slideshowInterval = setInterval(changeSlideshowImage, 30000);
  }
}

// Функция для предыдущего изображения (реализуем как случайное из истории или новое случайное)
function prevSlideshowImage() {
  const imageElement = document.getElementById('currentImage');
  if (!imageElement) return;
  
  imageElement.style.opacity = '0';
  
  setTimeout(() => {
    // Удаляем последний использованный индекс (чтобы можно было вернуться)
    if (slideshowUsedIndices.length > 1) {
      slideshowUsedIndices.pop(); // Убираем текущий
      slideshowCurrentIndex = slideshowUsedIndices[slideshowUsedIndices.length - 1]; // Берем предыдущий
    } else {
      // Если история пуста, берем случайное
      slideshowCurrentIndex = getRandomUnusedIndex();
      slideshowUsedIndices.push(slideshowCurrentIndex);
    }
    
    imageElement.src = slideshowImages[slideshowCurrentIndex];
    imageElement.style.opacity = '1';
  }, 500);
  
  // Перезапускаем таймер
  if (slideshowInterval) {
    clearInterval(slideshowInterval);
    slideshowInterval = setInterval(changeSlideshowImage, 30000);
  }
}

// Функция для перехода к конкретному изображению
function goToSlideshowImage(index) {
  if (index >= 0 && index < slideshowImages.length) {
    const imageElement = document.getElementById('currentImage');
    if (!imageElement) return;
    
    imageElement.style.opacity = '0';
    
    setTimeout(() => {
      slideshowCurrentIndex = index;
      // Добавляем в использованные, если его там еще нет
      if (!slideshowUsedIndices.includes(index)) {
        slideshowUsedIndices.push(index);
      }
      imageElement.src = slideshowImages[slideshowCurrentIndex];
      imageElement.style.opacity = '1';
    }, 500);
  }
}

// Запускаем слайдшоу при загрузке страницы
window.addEventListener('load', function() {
  // Добавляем CSS для плавных переходов
  const style = document.createElement('style');
  style.textContent = `
    #currentImage {
      transition: opacity 1s ease-in-out;
      opacity: 0; /* Начинаем с невидимого */
    }
  `;
  document.head.appendChild(style);
  
  // Устанавливаем случайное изображение при загрузке
  setRandomImageOnLoad();
  
  // Запускаем слайдшоу через 1 секунду
  setTimeout(() => {
    startSlideshow();
  }, 1000);
  
  // Останавливаем слайдшоу при уходе со страницы
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      stopSlideshow();
    } else {
      startSlideshow();
    }
  });
});

})();

