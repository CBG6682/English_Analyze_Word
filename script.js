let vocabData = [];
let unplayedWords = [];
let currentFlashcard = null;

// --- DOM Elements ---
const loadingOverlay = document.getElementById('loadingOverlay');
const errorOverlay = document.getElementById('errorOverlay');
const celebrationOverlay = document.getElementById('celebrationOverlay');
const btnRestart = document.getElementById('btnRestart');

const tabSearch = document.getElementById('tab-search');
const tabMinigame = document.getElementById('tab-minigame');
const sectionSearch = document.getElementById('section-search');
const sectionMinigame = document.getElementById('section-minigame');

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

const flashcardContent = document.getElementById('flashcardContent');
const gameWord = document.getElementById('gameWord');
const gamePrefix = document.getElementById('gamePrefix');
const gameRoot = document.getElementById('gameRoot');
const gameSuffix = document.getElementById('gameSuffix');
const gameSynonym = document.getElementById('gameSynonym');
const btnCheck = document.getElementById('btnCheck');
const btnNext = document.getElementById('btnNext');
const gameResult = document.getElementById('gameResult');
const gameProgress = document.getElementById('gameProgress');

// --- Initialization ---
async function init() {
    try {
        const response = await fetch('analyzed_vocab.json');
        if (!response.ok) throw new Error("File not found");
        vocabData = [];
        const rawData = await response.json();
        
        rawData.forEach(item => {
            if (item.definitions && Array.isArray(item.definitions)) {
                item.definitions.forEach(def => {
                    vocabData.push({
                        word: item.word,
                        phonetic: item.phonetic,
                        ...def
                    });
                });
            } else {
                // Fallback for old format
                vocabData.push(item);
            }
        });
        
        loadingOverlay.classList.add('hidden');
        
        if(vocabData.length > 0) {
            renderSearchResults(vocabData);
            initMinigame();
        } else {
            throw new Error("Empty data");
        }
    } catch (err) {
        console.error(err);
        loadingOverlay.classList.add('hidden');
        errorOverlay.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', init);

// --- Tab Switching ---
function switchTab(activeTab, inactiveTab, showSection, hideSection) {
    activeTab.classList.add('active-tab');
    activeTab.classList.remove('text-white/70', 'hover:text-white');
    
    inactiveTab.classList.remove('active-tab');
    inactiveTab.classList.add('text-white/70', 'hover:text-white');
    
    hideSection.classList.add('hidden');
    hideSection.classList.remove('block');
    
    showSection.classList.remove('hidden');
    showSection.classList.add('block');
}

tabSearch.addEventListener('click', () => switchTab(tabSearch, tabMinigame, sectionSearch, sectionMinigame));
tabMinigame.addEventListener('click', () => switchTab(tabMinigame, tabSearch, sectionMinigame, sectionSearch));

// --- Search Logic ---
function renderMorphologyDetails(item) {
    if(!item.analysis) return '';
    const a = item.analysis;
    const hasP = a.prefix && a.prefix.val && a.prefix.val !== 'null';
    const hasR = a.root && a.root.val && a.root.val !== 'null';
    const hasS = a.suffix && a.suffix.val && a.suffix.val !== 'null';
    
    if(!hasP && !hasR && !hasS) return '';
    
    let html = `<div class="mt-4 pt-4 border-t border-white/10 relative z-10 text-left">
        <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Morphology Details</h4>
        <dl class="grid grid-cols-1 sm:grid-cols-3 gap-4">`;
        
    if(hasP) {
        html += `<div class="morph-box bg-blue-900/20 border border-blue-500/20 rounded-xl p-3 relative cursor-pointer transition-colors hover:bg-blue-800/30" onclick="toggleTooltip(this, event)">
            <dt class="text-xs text-blue-300/70 uppercase mb-1 pointer-events-none">Prefix</dt>
            <dd><span class="hl-prefix pointer-events-none">${a.prefix.val}</span></dd>
            <div class="morph-tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] p-2 bg-slate-800 text-white text-sm rounded-lg shadow-xl opacity-0 invisible transition-all z-20 border border-white/10 pointer-events-none text-center">${a.prefix.mean || ''}</div>
        </div>`;
    }
    if(hasR) {
        html += `<div class="morph-box bg-purple-900/20 border border-purple-500/20 rounded-xl p-3 relative cursor-pointer transition-colors hover:bg-purple-800/30" onclick="toggleTooltip(this, event)">
            <dt class="text-xs text-purple-300/70 uppercase mb-1 pointer-events-none">Root</dt>
            <dd><span class="hl-root pointer-events-none">${a.root.val}</span></dd>
            <div class="morph-tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] p-2 bg-slate-800 text-white text-sm rounded-lg shadow-xl opacity-0 invisible transition-all z-20 border border-white/10 pointer-events-none text-center">${a.root.mean || ''}</div>
        </div>`;
    }
    if(hasS) {
        html += `<div class="morph-box bg-pink-900/20 border border-pink-500/20 rounded-xl p-3 relative cursor-pointer transition-colors hover:bg-pink-800/30" onclick="toggleTooltip(this, event)">
            <dt class="text-xs text-pink-300/70 uppercase mb-1 pointer-events-none">Suffix</dt>
            <dd><span class="hl-suffix pointer-events-none">${a.suffix.val}</span></dd>
            <div class="morph-tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] p-2 bg-slate-800 text-white text-sm rounded-lg shadow-xl opacity-0 invisible transition-all z-20 border border-white/10 pointer-events-none text-center">${a.suffix.mean || ''}</div>
        </div>`;
    }
    
    html += `</dl></div>`;
    return html;
}

window.toggleTooltip = function(el, evt) {
    if(evt) evt.stopPropagation();
    
    // Đóng tất cả các tooltip khác trước
    document.querySelectorAll('.morph-tooltip').forEach(tooltip => {
        if(tooltip.parentElement !== el) {
            tooltip.classList.add('opacity-0', 'invisible');
        }
    });

    // Bật tắt tooltip hiện tại
    const tooltip = el.querySelector('.morph-tooltip');
    if(tooltip) {
        tooltip.classList.toggle('opacity-0');
        tooltip.classList.toggle('invisible');
    }
};

// Đóng toàn bộ tooltips khi người dùng bấm ra ngoài các box này
document.addEventListener('click', (e) => {
    if(!e.target.closest('.morph-box')) {
        document.querySelectorAll('.morph-tooltip').forEach(tooltip => {
            tooltip.classList.add('opacity-0', 'invisible');
        });
    }
});

function renderSearchResults(data) {
    if(data.length === 0) {
        searchResults.innerHTML = `<div class="col-span-full text-center text-slate-400 py-12 text-lg">No words found matching your search.</div>`;
        return;
    }
    
    searchResults.innerHTML = data.map(item => `
        <div class="word-card bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 transition-all relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
            <div class="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <div class="text-3xl font-bold flex gap-1 items-baseline shadow-sm text-white">${item.word}</div>
                    <div class="text-purple-300/80 font-medium text-lg mt-2">${item.phonetic || ''}</div>
                </div>
            </div>
            
            <div class="mb-5 relative z-10">
                <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Meaning</h4>
                <p class="text-white text-xl font-medium">${item.meaning}</p>
            </div>
            
            ${item.synonyms && item.synonyms.length > 0 ? `
            <div class="mb-5 relative z-10">
                <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Synonyms</h4>
                <div class="flex gap-2 flex-wrap">
                    ${item.synonyms.map(syn => `<span class="px-4 py-1.5 bg-white/5 hover:bg-white/10 transition-colors rounded-xl text-sm font-medium border border-white/5 shadow-sm">${syn}</span>`).join('')}
                </div>
            </div>` : ''}
            
            <div class="relative z-10">
                <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Example</h4>
                <p class="text-slate-300 italic text-lg opacity-90">"${item.example}"</p>
            </div>
            ${renderMorphologyDetails(item)}
        </div>
    `).join('');
}

searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if(!q) {
        renderSearchResults(vocabData);
        return;
    }
    
    const filtered = vocabData.filter(item => {
        const inWord = item.word.toLowerCase().includes(q);
        const inMeaning = item.meaning.toLowerCase().includes(q);
        const inSynonyms = item.synonyms && item.synonyms.some(s => s.toLowerCase().includes(q));
        
        let inAnalysis = false;
        if(item.analysis) {
            const a = item.analysis;
            inAnalysis = 
                (a.prefix?.val && String(a.prefix.val).toLowerCase().includes(q)) || 
                (a.prefix?.mean && String(a.prefix.mean).toLowerCase().includes(q)) ||
                (a.root?.val && String(a.root.val).toLowerCase().includes(q)) || 
                (a.root?.mean && String(a.root.mean).toLowerCase().includes(q)) ||
                (a.suffix?.val && String(a.suffix.val).toLowerCase().includes(q)) || 
                (a.suffix?.mean && String(a.suffix.mean).toLowerCase().includes(q));
        }
        
        return inWord || inMeaning || inSynonyms || inAnalysis;
    });
    
    renderSearchResults(filtered);
});

// --- Minigame Logic ---

function initMinigame() {
    unplayedWords = [...vocabData];
    unplayedWords.sort(() => Math.random() - 0.5);
    updateProgress();
    loadNextCard();
}

function updateProgress() {
    const total = vocabData.length;
    const played = total - unplayedWords.length;
    const percentage = total === 0 ? 0 : (played / total) * 100;
    gameProgress.style.width = `${percentage}%`;
}

function loadNextCard() {
    if(unplayedWords.length === 0) {
        showCelebration();
        return;
    }
    
    currentFlashcard = unplayedWords.pop();
    updateProgress();
    
    [gameWord, gamePrefix, gameRoot, gameSuffix, gameSynonym].forEach(input => {
        input.value = '';
        input.classList.remove('input-success', 'input-error');
        input.disabled = false;
    });
    
    gameResult.classList.add('hidden');
    gameResult.className = "mt-6 text-center text-lg font-medium hidden rounded-xl py-4 border";
    btnCheck.classList.remove('hidden');
    btnNext.classList.add('hidden');
    
    flashcardContent.innerHTML = `
        <div class="text-center animate-fade-in">
            <div class="text-7xl text-white/5 mb-6 font-black tracking-widest uppercase blur-sm select-none">???????</div>
            <div class="bg-gradient-to-br from-purple-900/60 to-pink-900/40 border border-purple-500/30 shadow-lg shadow-purple-500/10 rounded-3xl p-8 mb-6 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
                <h3 class="text-purple-300 text-xs font-semibold uppercase tracking-widest mb-3 relative z-10">Meaning</h3>
                <p class="text-3xl text-white font-semibold relative z-10 leading-snug">${currentFlashcard.meaning}</p>
            </div>
            <div class="bg-slate-800/40 border border-white/5 rounded-3xl p-8 shadow-inner">
                <h3 class="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Example</h3>
                <p class="text-xl text-slate-300 italic opacity-90">"${currentFlashcard.example.replace(new RegExp(currentFlashcard.word, 'gi'), '_____')}"</p>
            </div>
        </div>
    `;
    
    // Auto-focus first input
    gameWord.focus();
}

function normalizeStr(str) {
    if(!str || String(str).toLowerCase() === 'null') return '';
    return String(str).toLowerCase().replace(/[^a-z]/g, '');
}

btnCheck.addEventListener('click', () => {
    if(!currentFlashcard) return;
    
    const analysis = currentFlashcard.analysis || {};
    
    const expPrefix = normalizeStr(analysis.prefix?.val);
    const expRoot = normalizeStr(analysis.root?.val);
    const expSuffix = normalizeStr(analysis.suffix?.val);
    
    const expWord = normalizeStr(currentFlashcard.word);
    const userWord = normalizeStr(gameWord.value);
    const userPrefix = normalizeStr(gamePrefix.value);
    const userRoot = normalizeStr(gameRoot.value);
    const userSuffix = normalizeStr(gameSuffix.value);
    const userSynonym = gameSynonym.value.toLowerCase().trim();
    
    let isCorrect = true;
    
    function checkField(inputEl, userVal, expVal) {
        if(userVal === expVal) {
            inputEl.classList.add('input-success');
            inputEl.classList.remove('input-error');
        } else {
            inputEl.classList.add('input-error');
            inputEl.classList.remove('input-success');
            isCorrect = false;
        }
    }
    
    checkField(gameWord, userWord, expWord);
    checkField(gamePrefix, userPrefix, expPrefix);
    checkField(gameRoot, userRoot, expRoot);
    checkField(gameSuffix, userSuffix, expSuffix);
    
    const validSynonyms = currentFlashcard.synonyms ? currentFlashcard.synonyms.map(s => s.toLowerCase().trim()) : [];
    if(validSynonyms.length > 0) {
        if(validSynonyms.includes(userSynonym)) {
            gameSynonym.classList.add('input-success');
            gameSynonym.classList.remove('input-error');
        } else {
            gameSynonym.classList.add('input-error');
            gameSynonym.classList.remove('input-success');
            isCorrect = false;
        }
    } else {
        if(userSynonym === '') {
            gameSynonym.classList.add('input-success');
            gameSynonym.classList.remove('input-error');
        } else {
            gameSynonym.classList.add('input-success');
            gameSynonym.classList.remove('input-error');
        }
    }
    
    if(isCorrect) {
        gameResult.innerHTML = `<span class="text-green-400 font-bold"><i class="fa-solid fa-check-circle mr-2"></i> Excellent! The word is: <span class="text-white">${currentFlashcard.word}</span></span>`;
        gameResult.classList.remove('hidden');
        gameResult.classList.add('bg-green-500/20', 'border-green-500/30', 'shadow-lg', 'shadow-green-500/20');
        
        btnCheck.classList.add('hidden');
        btnNext.classList.remove('hidden');
        
        [gameWord, gamePrefix, gameRoot, gameSuffix, gameSynonym].forEach(input => input.disabled = true);
        
        flashcardContent.innerHTML = `
            <div class="text-center animate-fade-in relative">
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div class="mb-4 flex justify-center scale-110"><span class="font-bold text-white text-4xl">${currentFlashcard.word}</span></div>
                <div class="text-purple-300/80 mb-8 font-medium text-xl">${currentFlashcard.phonetic || ''}</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-slate-800/80 border border-white/5 shadow-inner rounded-3xl p-6 text-left">
                        <p class="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-2">Meaning</p>
                        <p class="text-xl text-white font-medium">${currentFlashcard.meaning}</p>
                    </div>
                    <div class="bg-slate-800/80 border border-white/5 shadow-inner rounded-3xl p-6 text-left">
                        <p class="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">Example</p>
                        <p class="text-lg text-slate-300 italic opacity-90">"${currentFlashcard.example}"</p>
                    </div>
                </div>
                ${renderMorphologyDetails(currentFlashcard)}
            </div>
        `;
    } else {
         gameResult.innerHTML = `<span class="text-red-400 font-medium"><i class="fa-solid fa-xmark-circle mr-2"></i> That's not quite right. Try again!</span>`;
         gameResult.classList.remove('hidden', 'bg-green-500/20', 'border-green-500/30', 'shadow-lg', 'shadow-green-500/20');
         gameResult.classList.add('bg-red-500/10', 'border-red-500/20');
         
         setTimeout(() => {
             [gameWord, gamePrefix, gameRoot, gameSuffix, gameSynonym].forEach(input => {
                 input.classList.remove('input-error');
             });
         }, 600);
    }
});

btnNext.addEventListener('click', loadNextCard);

// Handle Enter key for submit action
[gameWord, gamePrefix, gameRoot, gameSuffix, gameSynonym].forEach(input => {
    input.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
            if(!btnCheck.classList.contains('hidden')) {
                btnCheck.click();
            } else if(!btnNext.classList.contains('hidden')) {
                btnNext.click();
            }
        }
    });
});

function showCelebration() {
    celebrationOverlay.classList.remove('hidden');
    confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#3b82f6', '#f59e0b', '#10b981']
    });
}

btnRestart.addEventListener('click', () => {
    celebrationOverlay.classList.add('hidden');
    initMinigame();
});
