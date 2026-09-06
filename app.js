let appState = {
    unlockedLaws: JSON.parse(localStorage.getItem('customs_unlocked_laws')) || [],
    completedActions: JSON.parse(localStorage.getItem('customs_completed_actions')) || [],
    lawNotes: JSON.parse(localStorage.getItem('customs_law_notes')) || {},
    currentCase: null
};

window.addEventListener('DOMContentLoaded', () => {
    // 更新總法規數量顯示
    document.getElementById('total-laws-count').textContent = globalLawsDB.length;

    generateRandomCase();
    renderDatabase();
    updateUI();

    const savedBg = localStorage.getItem('customs_custom_bg');
    const savedOpacity = localStorage.getItem('customs_bg_opacity');
    
    if (savedBg) applyBackground(savedBg);
    if (savedOpacity) {
        document.getElementById('bg-opacity-range').value = savedOpacity;
        changeBgOpacity(savedOpacity, false);
    }
});

function switchTab(tabName) {
    ['simulator', 'database', 'weakness'].forEach(t => {
        document.getElementById(`view-${t}`).classList.add('hidden');
        document.getElementById(`nav-${t}`).className = "px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition hover:bg-slate-300 dark:hover:bg-slate-700";
    });
    document.getElementById(`view-${tabName}`).classList.remove('hidden');
    document.getElementById(`nav-${tabName}`).className = "px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 text-white transition shadow";

    if (tabName === 'weakness') updateWeaknessDashboard();
}

function generateRandomCase() {
    const randomIndex = Math.floor(Math.random() * caseScenarios.length);
    const c = caseScenarios[randomIndex];
    appState.currentCase = c;

    document.getElementById('case-category-badge').textContent = `類別：${c.category}`;
    document.getElementById('case-title').textContent = c.title;
    document.getElementById('case-desc').textContent = c.desc;
    document.getElementById('feedback-panel').classList.add('hidden');

    const hintsContainer = document.getElementById('case-hints');
    hintsContainer.innerHTML = `<p class="font-semibold text-sky-600 dark:text-sky-400 mb-2">📌 本案核心關聯法條：</p>`;
    
    const relatedLawNums = [...new Set(c.options.flatMap(opt => opt.laws))];
    
    relatedLawNums.forEach(lawNumStr => {
        const lawObj = globalLawsDB.find(l => l.num === lawNumStr);
        if (lawObj) {
            const hintItem = document.createElement('div');
            hintItem.className = "bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-2";
            hintItem.innerHTML = `
                <div class="font-bold text-slate-700 dark:text-slate-300">《${lawObj.category}》${lawObj.num} - ${lawObj.title}</div>
                <div class="text-[11px] text-slate-500 mt-0.5">${lawObj.desc}</div>
            `;
            hintsContainer.appendChild(hintItem);
        }
    });

    const optContainer = document.getElementById('action-options');
    optContainer.innerHTML = '';

    c.options.forEach(opt => {
        const isCompleted = appState.completedActions.includes(opt.id);
        const btn = document.createElement('button');
        btn.className = `w-full text-left p-4 rounded-xl border transition flex justify-between items-center ${
            isCompleted ? 'opacity-60 bg-slate-200 dark:bg-slate-900 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700'
        }`;
        
        if (!isCompleted) btn.onclick = () => handleCaseAction(opt);

        btn.innerHTML = `
            <div>
                <div class="font-bold text-sky-600 dark:text-sky-300">${opt.title}</div>
                <div class="text-xs text-slate-500 mt-1">${opt.desc}</div>
            </div>
            <span class="text-xs px-2.5 py-1 rounded ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}">${isCompleted ? '已完成 ✓' : '執行處置'}</span>
        `;
        optContainer.appendChild(btn);
    });
}

function handleCaseAction(opt) {
    if (appState.completedActions.includes(opt.id)) return;

    const feedback = document.getElementById('feedback-panel');
    feedback.classList.remove('hidden');
    feedback.className = "mt-6 p-4 rounded-xl text-sm border bg-sky-50 dark:bg-sky-950/80 border-sky-200 text-sky-800 dark:text-sky-200";
    feedback.innerHTML = `<strong>💼 實務解析：</strong><br>${opt.feedback}`;

    opt.laws.forEach(lNum => {
        if (!appState.unlockedLaws.includes(lNum)) appState.unlockedLaws.push(lNum);
    });

    appState.completedActions.push(opt.id);
    saveState();
    updateUI();
    generateRandomCase();
}

function renderDatabase() {
    const container = document.getElementById('database-container');
    container.innerHTML = '';

    globalLawsDB.forEach(law => {
        appendLawCard(law, container);
    });
}

function filterDatabase() {
    const categoryFilter = document.getElementById('db-category-filter').value;
    const keyword = document.getElementById('db-search').value.toLowerCase();
    const container = document.getElementById('database-container');
    container.innerHTML = '';

    const filtered = globalLawsDB.filter(law => {
        const matchesCategory = (categoryFilter === 'all' || law.category === categoryFilter);
        const matchesKeyword = law.num.toLowerCase().includes(keyword) || 
                               law.title.toLowerCase().includes(keyword) || 
                               law.desc.toLowerCase().includes(keyword) ||
                               law.chapter.toLowerCase().includes(keyword);
        return matchesCategory && matchesKeyword;
    });

    filtered.forEach(law => {
        appendLawCard(law, container);
    });
}

function appendLawCard(law, container) {
    const hasNote = appState.lawNotes[law.num] ? true : false;
    const isUnlocked = appState.unlockedLaws.includes(law.num);

    const card = document.createElement('div');
    card.className = "bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3";
    card.innerHTML = `
        <div>
            <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded"> ${law.num} </span>
                <span class="text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">${law.category}</span>
                <span class="text-xs text-slate-500">${law.chapter}</span>
                ${isUnlocked ? '<span class="text-xs text-emerald-500 font-semibold">✅ 已掌握</span>' : ''}
                ${hasNote ? '<span class="text-xs text-amber-500 font-semibold">📝 有筆記</span>' : ''}
            </div>
            <h4 class="font-bold text-sm text-slate-800 dark:text-slate-100">${law.title}</h4>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">${law.desc}</p>
        </div>
        <button onclick="openLawNote('${law.num}', '${law.title}')" class="px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition shrink-0">編輯筆記</button>
    `;
    container.appendChild(card);
}

function updateWeaknessDashboard() {
    const notesCount = Object.keys(appState.lawNotes).length;
    document.getElementById('stat-notes-count').textContent = notesCount;
    document.getElementById('stat-weak-count').textContent = globalLawsDB.length - appState.unlockedLaws.length;
    document.getElementById('stat-coverage-rate').textContent = `${Math.round((appState.unlockedLaws.length / globalLawsDB.length) * 100)}%`;

    const list = document.getElementById('weakness-notes-list');
    list.innerHTML = '';

    if (notesCount === 0) {
        list.innerHTML = `<p class="text-slate-500">尚無筆記記錄，請從法規資料庫中新增筆記。</p>`;
        return;
    }

    for (const [num, note] of Object.entries(appState.lawNotes)) {
        const law = globalLawsDB.find(l => l.num == num);
        const div = document.createElement('div');
        div.className = "bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800";
        div.innerHTML = `<strong>《${law ? law.category : '關稅法'}》${num} (${law ? law.title : ''})：</strong><p class="text-slate-600 dark:text-slate-300 mt-1">${note}</p>`;
        list.appendChild(div);
    }
}

let currentActiveLawNum = null;
function openLawNote(num, title) {
    currentActiveLawNum = num;
    const law = globalLawsDB.find(l => l.num == num);
    const categoryName = law ? law.category : '關稅法';
    document.getElementById('modal-law-title').textContent = `【《${categoryName}》${num}】${title}`;
    document.getElementById('modal-law-desc').textContent = law ? law.desc : '';
    document.getElementById('modal-law-note-input').value = appState.lawNotes[num] || '';
    document.getElementById('law-modal').classList.remove('hidden');
}

function closeLawNote() {
    document.getElementById('law-modal').classList.add('hidden');
    currentActiveLawNum = null;
}

function saveLawNote() {
    if (currentActiveLawNum !== null) {
        const text = document.getElementById('modal-law-note-input').value;
        if (text.trim() === "") {
            delete appState.lawNotes[currentActiveLawNum];
        } else {
            appState.lawNotes[currentActiveLawNum] = text;
        }
        saveState();
        renderDatabase();
        closeLawNote();
        alert('筆記與弱點標記已成功儲存！');
    }
}

// ==========================================
// 📌 自選檔案：TXT 筆記匯出與匯入模組
// ==========================================

// 1. 選擇資料夾/位置並將筆記匯出為 TXT 檔案
async function exportNotesToFolder() {
    const notesObj = appState.lawNotes;
    if (Object.keys(notesObj).length === 0) {
        alert('目前沒有發現任何儲存的筆記可以匯出！');
        return;
    }

    let textContent = "=== 關稅法全景實務與弱點追蹤系統 - 個人備考筆記備份 ===\n\n";
    for (const [num, note] of Object.entries(notesObj)) {
        const law = globalLawsDB.find(l => l.num == num);
        const category = law ? law.category : '關稅法';
        const title = law ? law.title : '';
        
        textContent += `【法規】《${category}》第 ${num} 條 - ${title}\n`;
        textContent += `【筆記內容】\n${note}\n`;
        textContent += "--------------------------------------------------\n\n";
    }

    const fileName = `customs_law_notes_backup_${new Date().toISOString().slice(0, 10)}.txt`;

    if ('showSaveFilePicker' in window) {
        try {
            const options = {
                suggestedName: fileName,
                types: [{
                    description: '文字備份檔案',
                    accept: { 'text/plain': ['.txt'] },
                }],
            };
            const handle = await window.showSaveFilePicker(options);
            const writable = await handle.createWritable();
            await writable.write(textContent);
            await writable.close();
            alert('筆記已成功匯出為 TXT 檔案至您指定的位置！');
            return;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.warn('使用 File System API 失敗，改用傳統下載模式', err);
            } else {
                return; 
            }
        }
    }

    // 降級防呆方案：傳統下載
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('已透過傳統下載方式將 TXT 檔案儲存至您的預設下載資料夾。');
}

// 2. 點擊按鈕直接觸發隱藏的檔案上傳 input 進行單一檔案選取匯入
function importNotesFromFile() {
    document.getElementById('fallbackImportInput').click();
}

// 3. 智慧解析 TXT 內容並轉換為系統物件結構
function processImportedTxtContent(fileName, content) {
    try {
        const parsedNotes = {};
        const blocks = content.split('--------------------------------------------------');
        
        for (const block of blocks) {
            const lawMatch = block.match(/【法規】《.*?》第\s*(.*?)\s*條/);
            const noteMatch = block.match(/【筆記內容】\s*([\s\S]*)/);
            
            if (lawMatch && noteMatch) {
                const lawNum = lawMatch[1].trim();
                const noteText = noteMatch[1].trim();
                if (lawNum && noteText) {
                    parsedNotes[lawNum] = noteText;
                }
            }
        }

        if (Object.keys(parsedNotes).length === 0) {
            throw new Error('未解析到有效的筆記內容');
        }

        if (confirm(`確定要從檔案「${fileName}」還原並轉換匯入筆記嗎？這將會更新您目前的本地筆記內容。`)) {
            localStorage.setItem('customs_law_notes', JSON.stringify(parsedNotes));
            appState.lawNotes = parsedNotes;
            alert('TXT 筆記成功轉換並匯入！頁面將自動重新整理。');
            location.reload();
        }
    } catch (error) {
        alert('匯入失敗：所選 TXT 檔案格式不符合系統的備份規範。');
    }
}

// 4. 檔案上傳 input 的讀取處理
function handleFallbackImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        processImportedTxtContent(file.name, e.target.result);
        event.target.value = '';
    };
    reader.readAsText(file);
}

// ==========================================

function updateUI() {
    document.getElementById('completed-cases-count').textContent = appState.completedActions.length;
    document.getElementById('unlocked-laws-count').textContent = appState.unlockedLaws.length;
}

function saveState() {
    localStorage.setItem('customs_unlocked_laws', JSON.stringify(appState.unlockedLaws));
    localStorage.setItem('customs_completed_actions', JSON.stringify(appState.completedActions));
    localStorage.setItem('customs_law_notes', JSON.stringify(appState.lawNotes));
}

function resetLearningProgress() {
    if (confirm("確定要重置所有專利戰術完成案件與已掌握法條的進度嗎？（個人筆記會被保留）")) {
        localStorage.removeItem('customs_unlocked_laws');
        localStorage.removeItem('customs_completed_actions');
        appState.unlockedLaws = [];
        appState.completedActions = [];
        updateUI();
        generateRandomCase();
        renderDatabase();
        alert("學習進度已成功重置！");
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        themeIcon.textContent = '🌙';
    } else {
        html.classList.add('dark');
        themeIcon.textContent = '☀️';
    }
}

function handleCustomBgUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        localStorage.setItem('customs_custom_bg', base64Image);
        applyBackground(base64Image);
    };
    reader.readAsDataURL(file);
}

function applyBackground(imgData) {
    const bgLayer = document.getElementById('custom-bg-layer');
    bgLayer.style.backgroundImage = `url('${imgData}')`;
    bgLayer.style.display = 'block';
}

function changeBgOpacity(val, save = true) {
    const bgLayer = document.getElementById('custom-bg-layer');
    bgLayer.style.opacity = val / 100;
    if (save) localStorage.setItem('customs_bg_opacity', val);
}

function clearCustomBg() {
    localStorage.removeItem('customs_custom_bg');
    localStorage.removeItem('customs_custom_opacity');
    const bgLayer = document.getElementById('custom-bg-layer');
    bgLayer.style.backgroundImage = '';
    bgLayer.style.display = 'none';
    document.getElementById('bg-image-input').value = '';
    document.getElementById('bg-opacity-range').value = 30;
}
