(function(){

  // 1️⃣ КОНСТАНТЫ
  // 2️⃣ ПЕРЕМЕННЫЕ СОСТОЯНИЯ
  // 3️⃣ УТИЛИТЫ
  // 4️⃣ РАБОТА С localStorage
  // 5️⃣ ЛОГИКА КАЛЕНДАРЯ
  // 6️⃣ ЛОГИКА СПИСКА ЗАМЕТОК
  // 7️⃣ UI-ФУНКЦИИ
  // 8️⃣ СОБЫТИЯ
  // 9️⃣ ИНИЦИАЛИЗАЦИЯ

})();

(function(){
//КОНСТАНТЫ (всегда в самом верху)
	const TABLE_COUNT = 7;
	const ROWS = 10;
	const STORAGE_KEY = 'sevenTablesData_v1';  
	const HISTORY_KEY = 'sevenTables_history_v1';
	const MAX_HISTORY_SIZE = 50;
 

//ПЕРЕМЕННЫЕ СОСТОЯНИЯ 
	let history = [];
	let historyIndex = -1;

	let slideshowUsedIndices = []; // Массив для отслеживания уже показанных изображений
	let slideshowCurrentIndex = 0;
	let slideshowInterval = null;
	
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


//УТИЛИТЫ (маленькие вспомогательные функции)
//Выбор даты с системного календаря
  function getWeekdayIndexFromDate(date) {
  // JS: 0=Вс ... 6=Сб
  const jsDay = date.getDay();

  // переводим в Пн=0 ... Вс=6
  return jsDay === 0 ? 6 : jsDay - 1;
}

//Работа с localStorage
	
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
  
  
//  Логика календаря

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
  
//ЛОГИКА СПИСКА ЗАМЕТОК

function loadNotes(){
  const raw = localStorage.getItem(NOTES_KEY);

  if(!raw){
    notes = Array.from({length:NOTES_COUNT},()=>({
      text:"",
      date:null
    }));
    saveNotes();
    return;
  }

  try{
    notes = JSON.parse(raw);
  }catch{
    notes = [];
  }

  while(notes.length < NOTES_COUNT){
    notes.push({text:"",date:null});
  }
}

function saveNotes(){
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function buildNotesList(){

  const container = document.getElementById("notesList");
  container.innerHTML = "";

  notes.forEach((note,index)=>{

    const row = document.createElement("div");
    row.className = "noteRow";

    const input = document.createElement("input");
    input.value = note.text;

    if(note.date){
      input.title = "Добавлено: " + new Date(note.date).toLocaleString();
    }

    input.addEventListener("input",()=>{

      notes[index].text = input.value;

      if(!notes[index].date && input.value.trim()){
        notes[index].date = Date.now();
      }

      saveNotes();
    });

    const btn = document.createElement("button");
    btn.textContent = "📅";
    btn.className = "moveBtn";

    btn.addEventListener("click",()=>{
      moveNoteToCalendar(index);
    });

    row.appendChild(input);
    row.appendChild(btn);

    container.appendChild(row);

  });

}

function moveNoteToCalendar(index){

  const text = notes[index].text;

  if(!text) return;

  const picker = document.createElement("input");
  picker.type = "date";

  picker.showPicker
    ? picker.showPicker()
    : picker.click();

  picker.addEventListener("change",()=>{

    const date = new Date(picker.value);

    const day = date.getDay();
    const weekIndex = day === 0 ? 6 : day - 1;

    selectedIndex = weekIndex;

    applySelectedHighlight();
    updateCurrentLabel();
    scrollToSelected();

    notes[index].text = "";
    saveNotes();
    buildNotesList();

    closeNotesList();

  });

}



  
//

  // UI-функции (построение интерфейса)
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
  
 

 
//  НАВЕШИВАНИЕ СОБЫТИЙ

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
 
//Открытие/закрытие списка заметок 
  const overlay = document.getElementById("notesOverlay");
const openBtn = document.getElementById("openNotesList");
const closeBtn = document.getElementById("closeNotesList");

openBtn.addEventListener("click",()=>{
  overlay.classList.add("show");
});

closeBtn.addEventListener("click",closeNotesList);

overlay.addEventListener("click",(e)=>{
  if(e.target === overlay){
    closeNotesList();
  }
});

function closeNotesList(){
  overlay.classList.remove("show");
}

document.getElementById("notesSort").addEventListener("change",(e)=>{

  const type = e.target.value;

  if(type === "date"){

    notes.sort((a,b)=>
      (a.date||0) - (b.date||0)
    );

  }

  if(type === "text"){

    notes.sort((a,b)=>
      (a.text||"").localeCompare(b.text||"")
    );

  }

  saveNotes();
  buildNotesList();

});

  
 // ИНИЦИАЛИЗАЦИЯ (самый низ файла)
   let state = loadData();
  let selectedIndex = getTodayIndex();

  buildUI(state);
  setupControls();
  
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

loadNotes();
buildNotesList();

})();