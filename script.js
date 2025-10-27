// 全局变量
let wordbooks = JSON.parse(localStorage.getItem('wordbooks')) || [];
let currentWords = [];
let currentWordIndex = 0;
let currentAnswer = '';
let selectedSlot = null;
let gameResults = [];
let currentWordbookId = null; // 当前单词本ID，用于保存进度

// 页面切换
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'wordbook-list') {
        loadWordbookList();
    } else if (pageId === 'create-wordbook' && !editingWordbookId) {
        // 只有在非编辑模式下才重置表单
        resetCreateForm();
    }
}

// 创建单词本相关功能
let tempWords = [];

function addWord() {
    const englishWord = document.getElementById('english-word').value.trim();
    const chineseMeaning = document.getElementById('chinese-input').value.trim();
    
    if (!englishWord || !chineseMeaning) {
        alert('请输入完整的单词和中文意思');
        return;
    }
    
    tempWords.push({
        english: englishWord, // 保持原始大小写
        chinese: chineseMeaning
    });
    
    document.getElementById('english-word').value = '';
    document.getElementById('chinese-input').value = '';
    
    updateWordList();
}

function updateWordList() {
    const wordList = document.getElementById('word-list');
    wordList.innerHTML = '';
    
    if (tempWords.length === 0) {
        wordList.innerHTML = '<p style="color: #666; text-align: center;">暂无单词</p>';
        return;
    }
    
    tempWords.forEach((word, index) => {
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        wordItem.innerHTML = `
            <span><strong>${word.english}</strong> - ${word.chinese}</span>
            <button class="delete-btn" onclick="deleteWord(${index})">删除</button>
        `;
        wordList.appendChild(wordItem);
    });
}

function deleteWord(index) {
    tempWords.splice(index, 1);
    updateWordList();
}

function saveWordbook() {
    const wordbookName = document.getElementById('wordbook-name').value.trim();
    
    if (!wordbookName) {
        alert('请输入单词本名称');
        return;
    }
    
    if (tempWords.length === 0) {
        alert('请至少添加一个单词');
        return;
    }
    
    if (editingWordbookId) {
        // 编辑模式：更新现有单词本
        const index = wordbooks.findIndex(wb => wb.id === editingWordbookId);
        if (index !== -1) {
            wordbooks[index] = {
                ...wordbooks[index],
                name: wordbookName,
                words: [...tempWords]
            };
        }
        alert('单词本修改成功！');
        editingWordbookId = null;
    } else {
        // 创建模式：添加新单词本
        const wordbook = {
            id: Date.now(),
            name: wordbookName,
            words: [...tempWords],
            createdAt: new Date().toLocaleDateString()
        };
        wordbooks.push(wordbook);
        alert('单词本保存成功！');
    }
    
    localStorage.setItem('wordbooks', JSON.stringify(wordbooks));
    
    // 清空表单并重置状态
    resetCreateForm();
    showPage('home-page');
}

function resetCreateForm() {
    document.getElementById('wordbook-name').value = '';
    tempWords = [];
    updateWordList();
    editingWordbookId = null;
    
    // 重置页面标题和按钮
    document.querySelector('#create-wordbook h2').textContent = '创建单词本';
    document.querySelector('#create-wordbook button[onclick="saveWordbook()"]').textContent = '保存单词本';
}

// 单词本列表
function loadWordbookList() {
    const container = document.getElementById('wordbook-container');
    container.innerHTML = '';
    
    if (wordbooks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">暂无单词本，请先创建一个</p>';
        return;
    }
    
    wordbooks.forEach(wordbook => {
        // 检查学习进度（单词测试）
        const easyProgress = JSON.parse(localStorage.getItem(`progress_${wordbook.id}_easy`));
        const hardProgress = JSON.parse(localStorage.getItem(`progress_${wordbook.id}_hard`));
        
        const easyProgressText = easyProgress ? 
            `📖 进度: ${easyProgress.currentIndex}/${wordbook.words.length}` : '';
        const hardProgressText = hardProgress ? 
            `📖 进度: ${hardProgress.currentIndex}/${wordbook.words.length}` : '';
        
        // 检查泡泡大战进度
        const bubbleProgress = JSON.parse(localStorage.getItem(`bubble_progress_${wordbook.id}`));
        let bubbleProgressText = '';
        if (bubbleProgress && bubbleProgress.wordAmmo) {
            const masteredWords = bubbleProgress.wordAmmo.filter(ammo => ammo === 0).length;
            const remainingWords = wordbook.words.length - masteredWords;
            bubbleProgressText = `🎮 已掌握: ${masteredWords}/${wordbook.words.length}`;
        }
        
        const wordbookItem = document.createElement('div');
        wordbookItem.className = 'wordbook-item';
        wordbookItem.innerHTML = `
            <div class="wordbook-content">
                <h3>${wordbook.name}</h3>
                <p>单词数量: ${wordbook.words.length} | 创建时间: ${wordbook.createdAt}</p>
                ${bubbleProgressText ? `<p style="color: #4CAF50; font-weight: bold;">${bubbleProgressText}</p>` : ''}
                <div class="difficulty-buttons">
                    <button class="difficulty-btn easy" onclick="startGameById(${wordbook.id}, 'easy')">
                        简单模式${easyProgressText ? '<br><small>' + easyProgressText + '</small>' : ''}
                    </button>
                    <button class="difficulty-btn hard" onclick="startGameById(${wordbook.id}, 'hard')">
                        困难模式${hardProgressText ? '<br><small>' + hardProgressText + '</small>' : ''}
                    </button>
                </div>
            </div>
            <div class="wordbook-actions">
                <button class="edit-btn" onclick="editWordbook(${wordbook.id})">编辑</button>
                <button class="delete-wordbook-btn" onclick="deleteWordbook(${wordbook.id})">删除</button>
            </div>
        `;
        container.appendChild(wordbookItem);
    });
}

// 全局变量添加难度设置
let currentDifficulty = 'easy';

// 通过ID启动游戏
function startGameById(wordbookId, difficulty = 'easy') {
    const wordbook = wordbooks.find(wb => wb.id === wordbookId);
    if (wordbook) {
        currentDifficulty = difficulty;
        startGame(wordbook);
    }
}

// 游戏相关功能
function startGame(wordbook) {
    console.log('开始游戏，单词本:', wordbook);
    
    currentWordbookId = wordbook.id; // 保存当前单词本ID
    currentWords = [...wordbook.words];
    
    // 读取学习进度
    const progressKey = `progress_${wordbook.id}_${currentDifficulty}`;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey));
    
    if (savedProgress && savedProgress.currentIndex < currentWords.length) {
        // 继续上次的进度
        currentWordIndex = savedProgress.currentIndex;
        gameResults = savedProgress.results || [];
        console.log(`📚 继续学习进度: ${currentWordIndex + 1}/${currentWords.length}`);
        
        // 显示提示
        setTimeout(() => {
            alert(`欢迎回来！继续学习第 ${currentWordIndex + 1} 个单词`);
        }, 500);
    } else {
        // 从头开始
        currentWordIndex = 0;
        gameResults = [];
        console.log('📚 开始新的学习');
    }
    
    console.log('当前单词列表:', currentWords);
    
    const difficultyText = currentDifficulty === 'hard' ? ' - 困难模式' : ' - 简单模式';
    document.getElementById('game-title').textContent = wordbook.name + difficultyText;
    document.getElementById('total-words').textContent = currentWords.length;
    
    showPage('game-page');
    loadCurrentWord();
}

function loadCurrentWord() {
    if (currentWordIndex >= currentWords.length) {
        showResults();
        return;
    }
    
    const word = currentWords[currentWordIndex];
    currentAnswer = word.english;
    
    document.getElementById('current-word').textContent = currentWordIndex + 1;
    // 等待DOM完全加载后再设置中文意思
    setTimeout(() => {
        const chineseMeaningElement = document.getElementById('meaning-display');
        const firstLetterHintElement = document.getElementById('first-letter-hint');
        console.log('找到元素:', chineseMeaningElement);
        
        if (chineseMeaningElement) {
            if (word.chinese && word.chinese.trim()) {
                chineseMeaningElement.textContent = word.chinese;
                console.log('成功设置中文意思:', word.chinese);
            } else {
                chineseMeaningElement.textContent = '无中文意思';
            }
            
            // 强制刷新显示
            chineseMeaningElement.style.display = 'none';
            chineseMeaningElement.offsetHeight; // 触发重排
            chineseMeaningElement.style.display = 'flex';
            
            console.log('最终显示内容:', chineseMeaningElement.textContent);
        } else {
            console.error('找不到中文意思元素！');
        }
        
        // 显示第一个字母提示
        if (firstLetterHintElement && word.english) {
            const firstLetter = word.english.charAt(0).toUpperCase();
            firstLetterHintElement.textContent = `💡 提示：首字母是 ${firstLetter}`;
        }
    }, 100);
    
    generateWordPuzzle();
    generateLetterOptions();
    
    // 自动选择第一个空格
    setTimeout(() => {
        autoSelectFirstSlot();
    }, 100);
    
    document.getElementById('submit-answer').style.display = 'block';
}

function generateWordPuzzle() {
    const word = currentAnswer;
    const puzzle = document.getElementById('word-puzzle');
    puzzle.innerHTML = '';
    
    let blankPositions = [];
    
    if (currentDifficulty === 'hard') {
        // 困难模式：所有位置都是空白
        blankPositions = Array.from({length: word.length}, (_, i) => i);
    } else {
        // 简单模式：随机选择需要填空的位置（至少2个，最多一半）
        const minBlanks = Math.max(2, Math.floor(word.length * 0.3));
        const maxBlanks = Math.floor(word.length * 0.6);
        const numBlanks = Math.floor(Math.random() * (maxBlanks - minBlanks + 1)) + minBlanks;
        
        while (blankPositions.length < numBlanks) {
            const pos = Math.floor(Math.random() * word.length);
            if (!blankPositions.includes(pos)) {
                blankPositions.push(pos);
            }
        }
    }
    
    for (let i = 0; i < word.length; i++) {
        const slot = document.createElement('span');
        slot.className = 'letter-slot';
        slot.dataset.index = i;
        
        if (blankPositions.includes(i)) {
            slot.textContent = '';
            slot.dataset.blank = 'true';
            slot.onclick = () => selectSlot(slot);
        } else {
            slot.textContent = word[i]; // 保持原始大小写
            slot.classList.add('filled');
        }
        
        puzzle.appendChild(slot);
    }
}

function generateLetterOptions() {
    const word = currentAnswer;
    const options = document.getElementById('letter-options');
    options.innerHTML = '';
    
    let allOptions = [];
    
    if (currentDifficulty === 'hard') {
        // 困难模式：提供完整的字母表
        const hasUpperCase = word.split('').some(char => char >= 'A' && char <= 'Z');
        const hasLowerCase = word.split('').some(char => char >= 'a' && char <= 'z');
        
        if (hasUpperCase && hasLowerCase) {
            allOptions = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        } else if (hasUpperCase) {
            allOptions = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        } else {
            allOptions = 'abcdefghijklmnopqrstuvwxyz'.split('');
        }
    } else {
        // 简单模式：只提供需要的字母和一些干扰字母
        const blankSlots = document.querySelectorAll('.letter-slot[data-blank="true"]');
        const correctLetters = Array.from(blankSlots).map(slot => 
            word[parseInt(slot.dataset.index)]
        );
        
        // 添加一些干扰字母
        const hasUpperCase = word.split('').some(char => char >= 'A' && char <= 'Z');
        const hasLowerCase = word.split('').some(char => char >= 'a' && char <= 'z');
        
        let allLetters = '';
        if (hasUpperCase && hasLowerCase) {
            allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        } else if (hasUpperCase) {
            allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        } else {
            allLetters = 'abcdefghijklmnopqrstuvwxyz';
        }
        
        const distractors = [];
        while (distractors.length < Math.min(4, allLetters.length - correctLetters.length)) {
            const letter = allLetters[Math.floor(Math.random() * allLetters.length)];
            if (!correctLetters.includes(letter) && !distractors.includes(letter)) {
                distractors.push(letter);
            }
        }
        
        allOptions = [...correctLetters, ...distractors];
        shuffleArray(allOptions);
    }
    
    allOptions.forEach(letter => {
        const button = document.createElement('button');
        button.className = 'letter-option';
        button.textContent = letter;
        button.onclick = () => selectLetter(button);
        options.appendChild(button);
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function selectSlot(slot) {
    // 清除所有选中状态
    document.querySelectorAll('.letter-slot').forEach(s => s.style.border = '3px solid #ddd');
    slot.style.border = '3px solid #667eea';
    selectedSlot = slot;
}

function selectLetter(button) {
    // 如果没有选中的空格，自动选择第一个空的空格
    if (!selectedSlot) {
        const emptySlots = document.querySelectorAll('.letter-slot[data-blank="true"]');
        for (let slot of emptySlots) {
            if (!slot.textContent) {
                selectSlot(slot);
                break;
            }
        }
    }
    
    if (selectedSlot) {
        selectedSlot.textContent = button.textContent;
        selectedSlot.style.border = '3px solid #ddd';
        
        // 自动选择下一个空的空格
        const emptySlots = document.querySelectorAll('.letter-slot[data-blank="true"]');
        let nextSlot = null;
        for (let slot of emptySlots) {
            if (!slot.textContent) {
                nextSlot = slot;
                break;
            }
        }
        
        if (nextSlot) {
            selectSlot(nextSlot);
        } else {
            selectedSlot = null; // 所有空格都填满了
        }
    }
}

// 初始化时自动选择第一个空格
function autoSelectFirstSlot() {
    const emptySlots = document.querySelectorAll('.letter-slot[data-blank="true"]');
    if (emptySlots.length > 0) {
        selectSlot(emptySlots[0]);
    }
}

function submitAnswer() {
    const slots = document.querySelectorAll('.letter-slot');
    let userAnswer = '';
    let allFilled = true;
    
    slots.forEach(slot => {
        if (slot.dataset.blank === 'true') {
            if (slot.textContent) {
                userAnswer += slot.textContent; // 保持原始大小写
            } else {
                allFilled = false;
            }
        } else {
            userAnswer += slot.textContent; // 保持原始大小写
        }
    });
    
    if (!allFilled) {
        alert('请填完所有空格');
        return;
    }
    
    const isCorrect = userAnswer === currentAnswer;
    
    // 记录结果（不显示对错）
    gameResults.push({
        word: currentAnswer,
        chinese: currentWords[currentWordIndex].chinese,
        userAnswer: userAnswer,
        correct: isCorrect
    });
    
    // 禁用空格选择和提交按钮
    document.querySelectorAll('.letter-slot').forEach(slot => {
        slot.onclick = null;
    });
    document.getElementById('submit-answer').style.display = 'none';
    selectedSlot = null;
    
    // 显示"已提交"状态
    const submitBtn = document.getElementById('submit-answer');
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = `
        text-align: center;
        font-size: 1.2em;
        font-weight: bold;
        color: #667eea;
        margin: 20px 0;
    `;
    statusDiv.textContent = '✅ 已提交';
    submitBtn.parentNode.insertBefore(statusDiv, submitBtn);
    
    // 0.8秒后自动跳转到下一题
    setTimeout(() => {
        statusDiv.remove();
        nextWord();
    }, 800);
}

function nextWord() {
    currentWordIndex++;
    
    // 保存学习进度
    if (currentWordbookId) {
        const progressKey = `progress_${currentWordbookId}_${currentDifficulty}`;
        const progress = {
            currentIndex: currentWordIndex,
            results: gameResults,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(progressKey, JSON.stringify(progress));
        console.log(`💾 进度已保存: ${currentWordIndex}/${currentWords.length}`);
    }
    
    loadCurrentWord();
}

function showResults() {
    const correctCount = gameResults.filter(result => result.correct).length;
    const totalCount = gameResults.length;
    const percentage = Math.round((correctCount / totalCount) * 100);
    
    // 清除学习进度（已完成）
    if (currentWordbookId) {
        const progressKey = `progress_${currentWordbookId}_${currentDifficulty}`;
        localStorage.removeItem(progressKey);
        console.log('✅ 单词本学习完成，进度已清除');
    }
    
    const resultContent = document.getElementById('result-content');
    resultContent.innerHTML = `
        <div class="score">
            <div>🎉 测试完成！</div>
            <div>正确率: ${percentage}% (${correctCount}/${totalCount})</div>
        </div>
    `;
    
    gameResults.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${result.correct ? 'correct' : 'incorrect'}`;
        
        // 创建单词显示，显示正确答案和用户答案的对比
        let wordDisplay = '';
        const correctWord = result.word;
        const userWord = result.userAnswer;
        
        // 逐字符对比显示
        for (let i = 0; i < Math.max(correctWord.length, userWord.length); i++) {
            const correctChar = correctWord[i] || '';
            const userChar = userWord[i] || '';
            
            if (correctChar === userChar) {
                wordDisplay += `<span style="color: #28a745;">${correctChar}</span>`;
            } else {
                wordDisplay += `<span style="color: #dc3545; text-decoration: line-through;">${userChar}</span>`;
                if (correctChar) {
                    wordDisplay += `<span style="color: #28a745;">${correctChar}</span>`;
                }
            }
        }
        
        resultItem.innerHTML = `
            <div>
                <div style="margin-bottom: 5px;">
                    <strong>第${index + 1}题:</strong> ${result.chinese}
                </div>
                <div style="font-family: monospace; font-size: 1.2em;">
                    正确答案: <strong>${result.word}</strong>
                </div>
                <div style="font-family: monospace; font-size: 1.2em;">
                    你的答案: <strong style="color: ${result.correct ? '#28a745' : '#dc3545'}">${result.userAnswer}</strong>
                </div>
            </div>
            <div style="font-size: 1.1em; font-weight: bold;">
                ${result.correct ? '✅ 正确' : '❌ 错误'}
            </div>
        `;
        resultContent.appendChild(resultItem);
    });
    
    showPage('result-page');
}

// 编辑单词本功能
let editingWordbookId = null;

function editWordbook(wordbookId) {
    const wordbook = wordbooks.find(wb => wb.id === wordbookId);
    if (!wordbook) return;
    
    editingWordbookId = wordbookId;
    
    // 填充编辑表单
    document.getElementById('wordbook-name').value = wordbook.name;
    tempWords = [...wordbook.words];
    updateWordList();
    
    // 更新页面标题和按钮
    document.querySelector('#create-wordbook h2').textContent = '编辑单词本';
    document.querySelector('#create-wordbook button[onclick="saveWordbook()"]').textContent = '保存修改';
    
    showPage('create-wordbook');
}

function deleteWordbook(wordbookId) {
    if (confirm('确定要删除这个单词本吗？')) {
        wordbooks = wordbooks.filter(wb => wb.id !== wordbookId);
        localStorage.setItem('wordbooks', JSON.stringify(wordbooks));
        loadWordbookList();
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 总是创建一个示例单词本用于测试
    const sampleWordbook = {
        id: Date.now() + 999,
        name: '🌟 示例单词本',
        words: [
            { english: 'hello', chinese: '你好' },
            { english: 'world', chinese: '世界' },
            { english: 'apple', chinese: '苹果' },
            { english: 'book', chinese: '书' },
            { english: 'water', chinese: '水' }
        ],
        createdAt: new Date().toLocaleDateString()
    };
    
    // 检查是否已经存在示例单词本
    const existingSample = wordbooks.find(wb => wb.name === '🌟 示例单词本');
    if (!existingSample) {
        wordbooks.push(sampleWordbook);
        localStorage.setItem('wordbooks', JSON.stringify(wordbooks));
    }
    
    // 调试：显示所有单词本的内容
    console.log('所有单词本:', wordbooks);
    wordbooks.forEach((wb, index) => {
        console.log(`单词本 ${index + 1}: ${wb.name}`, wb.words);
    });
    
    showPage('home-page');
});


// ==================== 泡泡大战游戏 ====================

let bubbleGame = {
    canvas: null,
    ctx: null,
    bubbles: [],
    bullets: [],
    particles: [],
    score: 0,
    totalScore: 0, // 总积分（用于解锁）
    combo: 0,
    maxCombo: 0,
    currentWordIndex: 0,
    words: [],
    wordbookName: '',
    isGameRunning: false,
    animationId: null,
    selectedWeapon: 'normal', // 当前选择的子弹类型
    selectedCannon: 'cannon1', // 当前选择的炮台类型
    boss: null, // 泡泡老大
    bubblesDestroyed: 0, // 已消灭的泡泡数量
    wordAmmo: [], // 每个单词的剩余弹药次数
    currentRoundIndex: 0, // 当前轮次中的单词索引
    ultimateUsed: false // 终极弹是否已使用
};

// 武器解锁配置
const weaponUnlocks = {
    // 子弹类型
    normal: { score: 0, name: '普通子弹', icon: '⭐', description: '基础射击', type: 'bullet' },
    split: { score: 500, name: '分裂双炮', icon: '🔱', description: '发射2发子弹', type: 'bullet' },
    laser: { score: 1000, name: '激光弹', icon: '⚡', description: '射线消灭一条线', type: 'bullet' },
    spiral: { score: 1500, name: '螺旋弹', icon: '🌀', description: '螺旋飞行轨迹', type: 'bullet' },
    bounce: { score: 2000, name: '弹跳弹', icon: '🏀', description: '反弹多次', type: 'bullet' },
    mega: { score: 2500, name: '超大子弹', icon: '💥', description: '巨大缓慢', type: 'bullet' },
    // 炮台类型
    cannon1: { score: 0, name: '单炮台', icon: '🔫', description: '1个炮台', type: 'cannon' },
    cannon2: { score: 3000, name: '双炮台', icon: '🔫🔫', description: '2个炮台', type: 'cannon' },
    cannon3: { score: 3500, name: '三炮台', icon: '🔫🔫🔫', description: '3个炮台', type: 'cannon' },
    // 新增武器
    homing: { score: 4000, name: '追踪弹', icon: '🎯', description: '自动追踪目标', type: 'bullet' },
    explosive: { score: 4500, name: '爆炸弹', icon: '💣', description: '范围爆炸', type: 'bullet' },
    chain: { score: 5500, name: '连锁弹', icon: '⛓️', description: '连锁反应', type: 'bullet' },
    multi: { score: 6500, name: '分身弹', icon: '👥', description: '分裂成5发', type: 'bullet' },
    pierce: { score: 7000, name: '穿透弹', icon: '🌟', description: '穿透所有泡泡', type: 'bullet' },
    freeze: { score: 7500, name: '冰冻弹', icon: '❄️', description: '冻结减速泡泡', type: 'bullet' },
    ultimate: { score: 8000, name: '终极弹', icon: '⚡💥', description: '清空全屏', type: 'bullet' },
    starburst: { score: 9000, name: '星爆弹', icon: '⭐', description: '爆炸成8发子弹', type: 'bullet' },
    tornado: { score: 10000, name: '龙卷弹', icon: '🌪️', description: '吸引并摧毁', type: 'bullet' }
};

// 从本地存储加载总积分
function loadTotalScore() {
    const saved = localStorage.getItem('bubbleGameTotalScore');
    return saved ? parseInt(saved) : 0;
}

// 保存总积分
function saveTotalScore(score) {
    localStorage.setItem('bubbleGameTotalScore', score.toString());
}

// 加载泡泡大战单词本列表
function loadBubbleWordbookList() {
    const container = document.getElementById('bubble-wordbook-container');
    container.innerHTML = '';
    
    if (wordbooks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">暂无单词本，请先创建一个</p>';
        return;
    }
    
    wordbooks.forEach(wordbook => {
        const wordbookItem = document.createElement('div');
        wordbookItem.className = 'wordbook-item';
        wordbookItem.innerHTML = `
            <div class="wordbook-content" onclick="startBubbleGame(${wordbook.id})">
                <h3>🎮 ${wordbook.name}</h3>
                <p>单词数量: ${wordbook.words.length} | 准备战斗！</p>
            </div>
        `;
        container.appendChild(wordbookItem);
    });
}

// 开始泡泡大战游戏
function startBubbleGame(wordbookId) {
    const wordbook = wordbooks.find(wb => wb.id === wordbookId);
    if (!wordbook || wordbook.words.length === 0) {
        alert('单词本为空，无法开始游戏！');
        return;
    }
    
    // 初始化游戏数据
    bubbleGame.words = [...wordbook.words];
    bubbleGame.wordbookName = wordbook.name;
    bubbleGame.wordbookId = wordbookId; // 保存单词本ID
    bubbleGame.currentWordIndex = 0;
    bubbleGame.score = 0;
    bubbleGame.totalScore = loadTotalScore(); // 加载总积分
    bubbleGame.combo = 0;
    bubbleGame.maxCombo = 0;
    bubbleGame.bubbles = [];
    bubbleGame.bullets = [];
    bubbleGame.particles = [];
    bubbleGame.isGameRunning = true;
    bubbleGame.boss = null; // 重置BOSS
    bubbleGame.bubblesDestroyed = 0; // 重置计数
    bubbleGame.currentRoundIndex = 0; // 重置轮次索引
    bubbleGame.ultimateUsed = false; // 重置终极弹状态
    
    // 读取单词学习进度
    const progressKey = `bubble_progress_${wordbookId}`;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey));
    
    if (savedProgress && savedProgress.wordAmmo) {
        // 继续上次的进度
        bubbleGame.wordAmmo = savedProgress.wordAmmo;
        const remainingWords = bubbleGame.wordAmmo.filter(ammo => ammo > 0).length;
        console.log(`📚 继续泡泡大战进度: 剩余 ${remainingWords}/${bubbleGame.words.length} 个单词`);
        
        if (remainingWords === 0) {
            // 所有单词都已掌握，重新开始
            bubbleGame.wordAmmo = bubbleGame.words.map(() => 5);
            localStorage.removeItem(progressKey);
            alert('🎉 恭喜！所有单词都已掌握！\n现在重新开始新一轮学习。');
        } else {
            setTimeout(() => {
                alert(`欢迎回来！还有 ${remainingWords} 个单词等待学习`);
            }, 500);
        }
    } else {
        // 从头开始
        bubbleGame.wordAmmo = bubbleGame.words.map(() => 5);
        console.log('📚 开始新的泡泡大战');
    }
    
    // 显示游戏页面
    showPage('bubble-game');
    
    // 初始化Canvas
    setTimeout(() => {
        initBubbleCanvas();
        loadNextWord();
        startBubbleSpawning();
        loadGameWeaponSelector();
        updateGameTotalScore();
        
        // 开局直接生成BOSS
        setTimeout(() => {
            spawnBoss();
        }, 1000); // 延迟1秒，让孩子看到游戏界面
    }, 100);
}

// 炮筒瞄准角度
let cannonAngle = -Math.PI / 2; // 默认向上
let targetX = 0;
let targetY = 0;

// 初始化Canvas
function initBubbleCanvas() {
    bubbleGame.canvas = document.getElementById('bubble-canvas');
    bubbleGame.ctx = bubbleGame.canvas.getContext('2d');
    
    // 设置Canvas实际大小
    const rect = bubbleGame.canvas.getBoundingClientRect();
    bubbleGame.canvas.width = rect.width;
    bubbleGame.canvas.height = rect.height;
    
    // 添加鼠标移动事件监听
    bubbleGame.canvas.addEventListener('mousemove', handleCanvasMouseMove);
    bubbleGame.canvas.addEventListener('click', handleCanvasClick);
    
    // 添加触摸事件支持
    bubbleGame.canvas.addEventListener('touchmove', handleCanvasTouchMove);
    bubbleGame.canvas.addEventListener('touchstart', handleCanvasTouchStart);
    
    // 开始游戏循环
    gameLoop();
}

// 处理鼠标移动
function handleCanvasMouseMove(e) {
    const rect = bubbleGame.canvas.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    updateCannonAngle();
}

// 处理Canvas点击
function handleCanvasClick(e) {
    const rect = bubbleGame.canvas.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    
    // 如果单词拼写正确，点击Canvas也可以发射
    if (!document.getElementById('fire-btn').disabled) {
        fireBullet();
    }
}

// 处理触摸移动
function handleCanvasTouchMove(e) {
    e.preventDefault();
    const rect = bubbleGame.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    targetX = touch.clientX - rect.left;
    targetY = touch.clientY - rect.top;
    updateCannonAngle();
}

// 处理触摸开始
function handleCanvasTouchStart(e) {
    e.preventDefault();
    const rect = bubbleGame.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    targetX = touch.clientX - rect.left;
    targetY = touch.clientY - rect.top;
    
    // 如果单词拼写正确，触摸Canvas也可以发射
    if (!document.getElementById('fire-btn').disabled) {
        fireBullet();
    }
}

// 更新炮筒角度
function updateCannonAngle() {
    const cannonX = bubbleGame.canvas.width / 2;
    const cannonY = bubbleGame.canvas.height - 30;
    
    // 计算角度
    const dx = targetX - cannonX;
    const dy = targetY - cannonY;
    cannonAngle = Math.atan2(dy, dx);
    
    // 限制角度范围（只能向上半圆发射）
    const minAngle = -Math.PI * 0.9; // 左上
    const maxAngle = -Math.PI * 0.1; // 右上
    
    if (cannonAngle > 0) {
        // 如果指向下方，调整到最近的上方角度
        if (cannonAngle < Math.PI / 2) {
            cannonAngle = maxAngle;
        } else {
            cannonAngle = minAngle;
        }
    }
    
    cannonAngle = Math.max(minAngle, Math.min(maxAngle, cannonAngle));
}

// 当前输入的单词
let currentInput = [];

// 加载下一个单词
function loadNextWord() {
    // 检查是否所有单词都用完了
    const totalAmmo = bubbleGame.wordAmmo.reduce((sum, ammo) => sum + ammo, 0);
    if (totalAmmo === 0) {
        // 所有单词都用完了，单词本完成
        showWordbookCompletePopup();
        return;
    }
    
    // 轮流选择下一个还有弹药的单词
    let attempts = 0;
    const maxAttempts = bubbleGame.words.length;
    
    while (attempts < maxAttempts) {
        // 移动到下一个单词
        bubbleGame.currentRoundIndex = (bubbleGame.currentRoundIndex + 1) % bubbleGame.words.length;
        
        // 如果这个单词还有弹药，就选它
        if (bubbleGame.wordAmmo[bubbleGame.currentRoundIndex] > 0) {
            bubbleGame.currentWordIndex = bubbleGame.currentRoundIndex;
            break;
        }
        
        attempts++;
    }
    
    // 如果找不到有弹药的单词（理论上不会发生，因为上面已经检查了总弹药）
    if (attempts >= maxAttempts) {
        showWordbookCompletePopup();
        return;
    }
    
    const word = bubbleGame.words[bubbleGame.currentWordIndex];
    const ammo = bubbleGame.wordAmmo[bubbleGame.currentWordIndex];
    
    // 显示中文和剩余子弹数
    const stars = '⭐'.repeat(ammo);
    document.getElementById('bubble-chinese').textContent = `${word.chinese} ${stars} (${ammo}/5)`;
    
    // 清空输入
    currentInput = [];
    updateWordDisplay();
    
    // 生成字母键盘
    generateLetterKeyboard(word.english);
    
    document.getElementById('fire-btn').disabled = true;
    
    // 显示状态（不再显示弹药，因为已经在中文旁边显示了）
    document.getElementById('bullet-status').textContent = '点击字母拼写单词...';
    document.getElementById('bullet-status').className = 'bullet-status';
    
    // 更新炮台显示
    updateCannonDisplay();
}

// 生成字母键盘
function generateLetterKeyboard(word) {
    const keyboard = document.getElementById('letter-keyboard');
    keyboard.innerHTML = '';
    
    // 获取单词中的所有字母
    const wordLetters = word.split('');
    
    // 判断大小写
    const hasUpperCase = wordLetters.some(char => char >= 'A' && char <= 'Z');
    const hasLowerCase = wordLetters.some(char => char >= 'a' && char <= 'z');
    
    let allLetters = '';
    if (hasUpperCase && hasLowerCase) {
        allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    } else if (hasUpperCase) {
        allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    } else {
        allLetters = 'abcdefghijklmnopqrstuvwxyz';
    }
    
    // 创建字母按钮
    for (let letter of allLetters) {
        const btn = document.createElement('button');
        btn.className = 'keyboard-letter';
        btn.textContent = letter;
        btn.onclick = () => addLetter(letter);
        keyboard.appendChild(btn);
    }
}

// 添加字母
function addLetter(letter) {
    const currentWord = bubbleGame.words[bubbleGame.currentWordIndex];
    
    // 限制长度
    if (currentInput.length >= currentWord.english.length + 5) {
        return;
    }
    
    currentInput.push(letter);
    updateWordDisplay();
    checkWord();
}

// 更新单词显示
function updateWordDisplay() {
    const slotsContainer = document.getElementById('word-slots');
    const currentWord = bubbleGame.words[bubbleGame.currentWordIndex];
    slotsContainer.innerHTML = '';
    
    // 显示目标单词长度的空格
    for (let i = 0; i < currentWord.english.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'letter-slot-bubble';
        
        if (i < currentInput.length) {
            slot.textContent = currentInput[i];
            slot.onclick = () => removeLetter(i);
        } else {
            slot.classList.add('empty');
            slot.textContent = '_';
        }
        
        slotsContainer.appendChild(slot);
    }
}

// 移除字母
function removeLetter(index) {
    currentInput.splice(index, 1);
    updateWordDisplay();
    checkWord();
}

// 清空单词
function clearWord() {
    currentInput = [];
    updateWordDisplay();
    checkWord();
}

// 检查单词是否正确
function checkWord() {
    const currentWord = bubbleGame.words[bubbleGame.currentWordIndex];
    const userInput = currentInput.join('');
    
    if (userInput === currentWord.english) {
        document.getElementById('fire-btn').disabled = false;
        document.getElementById('bullet-status').textContent = '✅ 正确！可以发射！';
        document.getElementById('bullet-status').className = 'bullet-status correct';
    } else {
        document.getElementById('fire-btn').disabled = true;
        
        if (userInput.length === 0) {
            document.getElementById('bullet-status').textContent = '点击字母拼写单词...';
            document.getElementById('bullet-status').className = 'bullet-status';
        } else if (userInput.length === currentWord.english.length) {
            // 拼写完成但错误
            document.getElementById('bullet-status').textContent = '❌ 拼写错误！请重新拼写';
            document.getElementById('bullet-status').className = 'bullet-status wrong';
        } else {
            // 还在拼写中
            document.getElementById('bullet-status').textContent = `继续拼写... (${userInput.length}/${currentWord.english.length})`;
            document.getElementById('bullet-status').className = 'bullet-status';
        }
    }
}

// 更新炮台显示
function updateCannonDisplay() {
    const weaponKey = bubbleGame.selectedWeapon || 'normal';
    const weapon = weaponUnlocks[weaponKey];
    const barrel = document.getElementById('cannon-barrel');
    const modeType = document.getElementById('mode-type');
    const modeAbility = document.getElementById('mode-ability');
    
    if (!weapon) return;
    
    // 移除所有类型类
    barrel.classList.remove('normal', 'super', 'mega', 'split', 'laser', 'spiral', 'bounce');
    modeType.classList.remove('normal', 'super', 'mega', 'split', 'laser', 'spiral', 'bounce');
    
    // 添加当前类型类
    barrel.classList.add(weaponKey);
    modeType.classList.add(weaponKey);
    
    // 更新文字和能力说明
    modeType.textContent = `${weapon.icon} ${weapon.name}`;
    modeAbility.textContent = weapon.description;
}

// 查找连锁目标（超级子弹）
function findChainTargets(mainBubble, allBubbles, radius, maxCount) {
    const targets = [];
    const checkedBubbles = new Set([mainBubble]);
    
    for (let i = 0; i < allBubbles.length && targets.length < maxCount; i++) {
        const bubble = allBubbles[i];
        if (checkedBubbles.has(bubble)) continue;
        
        const dx = bubble.x - mainBubble.x;
        const dy = bubble.y - mainBubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
            targets.push({ bubble: bubble, index: i });
            checkedBubbles.add(bubble);
        }
    }
    
    return targets;
}

// 查找爆炸范围目标（终极子弹）
function findExplosionTargets(mainBubble, allBubbles, radius) {
    const targets = [];
    
    for (let i = 0; i < allBubbles.length; i++) {
        const bubble = allBubbles[i];
        if (bubble === mainBubble) continue;
        
        const dx = bubble.x - mainBubble.x;
        const dy = bubble.y - mainBubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
            targets.push({ bubble: bubble, index: i });
        }
    }
    
    return targets;
}

// 创建闪电效果（超级子弹）
function createLightning(x1, y1, x2, y2) {
    bubbleGame.particles.push({
        type: 'lightning',
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        life: 1,
        decay: 0.02  // 更慢的衰减，持续约50帧（0.8秒）
    });
}

// 创建冰冻效果
function createFreezeEffect(x, y, radius) {
    // 创建冰冻粒子
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;
        
        bubbleGame.particles.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1,
            decay: 0.02,
            size: Math.random() * 8 + 4,
            color: '#00BFFF',
            type: 'freeze'
        });
    }
}

// 创建星爆效果
function createStarburstEffect(x, y) {
    // 创建星形爆炸粒子
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 4;
        
        bubbleGame.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.015,
            size: Math.random() * 6 + 3,
            color: '#FFD700',
            type: 'star'
        });
    }
}

// 创建龙卷效果
function createTornadoEffect(x, y, radius) {
    // 创建旋转粒子
    for (let i = 0; i < 40; i++) {
        const angle = (Math.PI * 2 / 40) * i;
        const distance = Math.random() * radius;
        
        bubbleGame.particles.push({
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            vx: Math.cos(angle + Math.PI / 2) * 5,
            vy: Math.sin(angle + Math.PI / 2) * 5,
            life: 1,
            decay: 0.02,
            size: Math.random() * 10 + 5,
            color: '#87CEEB',
            type: 'tornado'
        });
    }
}

// 绘制所有闪电效果（在所有元素之上）
function drawLightningEffects(ctx) {
    for (let i = 0; i < bubbleGame.particles.length; i++) {
        const particle = bubbleGame.particles[i];
        
        if (particle.type === 'lightning' && particle.life > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(particle.life * 1.2, 1); // 更亮
            
            // 外层光晕（更大的发光效果）
            ctx.strokeStyle = '#9B59B6';
            ctx.lineWidth = 8;
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#9B59B6';
            ctx.lineCap = 'round';
            
            // 绘制锯齿状闪电
            ctx.beginPath();
            ctx.moveTo(particle.x1, particle.y1);
            
            const segments = 8;
            for (let j = 1; j <= segments; j++) {
                const t = j / segments;
                const x = particle.x1 + (particle.x2 - particle.x1) * t;
                const y = particle.y1 + (particle.y2 - particle.y1) * t;
                const offset = (Math.random() - 0.5) * 30;
                ctx.lineTo(x + offset, y + offset);
            }
            ctx.lineTo(particle.x2, particle.y2);
            ctx.stroke();
            
            // 中层紫色闪电
            ctx.strokeStyle = '#BB8FCE';
            ctx.lineWidth = 5;
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#BB8FCE';
            ctx.beginPath();
            ctx.moveTo(particle.x1, particle.y1);
            for (let j = 1; j <= segments; j++) {
                const t = j / segments;
                const x = particle.x1 + (particle.x2 - particle.x1) * t;
                const y = particle.y1 + (particle.y2 - particle.y1) * t;
                const offset = (Math.random() - 0.5) * 20;
                ctx.lineTo(x + offset, y + offset);
            }
            ctx.lineTo(particle.x2, particle.y2);
            ctx.stroke();
            
            // 内层亮光（白色核心）
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(particle.x1, particle.y1);
            for (let j = 1; j <= segments; j++) {
                const t = j / segments;
                const x = particle.x1 + (particle.x2 - particle.x1) * t;
                const y = particle.y1 + (particle.y2 - particle.y1) * t;
                const offset = (Math.random() - 0.5) * 10;
                ctx.lineTo(x + offset, y + offset);
            }
            ctx.lineTo(particle.x2, particle.y2);
            ctx.stroke();
            
            ctx.restore();
        }
    }
}

// 创建超级爆炸效果（爆炸弹）
function createMegaExplosion(x, y, radius) {
    // 第一波：中心大爆炸
    for (let i = 0; i < 50; i++) {
        const angle = (Math.PI * 2 / 50) * i;
        const speed = 3 + Math.random() * 5;
        
        bubbleGame.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 8 + Math.random() * 12,
            color: ['#FF0000', '#FF6B00', '#FFAA00', '#FFD700', '#FFFFFF'][Math.floor(Math.random() * 5)],
            life: 1,
            decay: 0.015 + Math.random() * 0.01
        });
    }
    
    // 第二波：火花（延迟0.1秒）
    setTimeout(() => {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            
            bubbleGame.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                size: 4 + Math.random() * 6,
                color: ['#FFFF00', '#FF6B00', '#FF0000'][Math.floor(Math.random() * 3)],
                life: 1,
                decay: 0.02
            });
        }
    }, 100);
    
    // 多层冲击波
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            createShockwave(x, y, radius + i * 30);
        }, i * 100);
    }
}

// 屏幕震动效果
function shakeScreen(intensity, duration) {
    const canvas = bubbleGame.canvas;
    if (!canvas) return;
    
    const startTime = Date.now();
    const shakeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= duration) {
            clearInterval(shakeInterval);
            canvas.style.transform = 'translate(0, 0)';
            return;
        }
        
        const progress = elapsed / duration;
        const currentIntensity = intensity * (1 - progress); // 逐渐减弱
        
        const offsetX = (Math.random() - 0.5) * currentIntensity * 2;
        const offsetY = (Math.random() - 0.5) * currentIntensity * 2;
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }, 50);
}

// 创建冲击波效果（终极子弹）
function createShockwave(x, y, radius) {
    bubbleGame.particles.push({
        type: 'shockwave',
        x: x,
        y: y,
        radius: 0,
        maxRadius: radius,
        life: 1,
        decay: 0.05
    });
}

// 创建爆炸效果
function createExplosion(x, y, bulletType) {
    const particleCount = bulletType === 'mega' ? 20 : bulletType === 'super' ? 15 : 10;
    const colors = bulletType === 'mega' 
        ? ['#ff00ff', '#cc00cc', '#ff66ff'] 
        : bulletType === 'super' 
        ? ['#00ff00', '#00cc00', '#66ff66']
        : ['#ffd700', '#ff6b6b', '#ffaa00'];
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 / particleCount) * i;
        const speed = 2 + Math.random() * 3;
        
        bubbleGame.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1,
            decay: 0.02 + Math.random() * 0.02
        });
    }
}

// 更新和绘制粒子
function updateParticles(ctx) {
    for (let i = bubbleGame.particles.length - 1; i >= 0; i--) {
        const particle = bubbleGame.particles[i];
        
        if (particle.type === 'lightning') {
            // 闪电效果在drawLightningEffects中单独绘制
            // 这里只更新生命值
            if (particle.life > 0) {
                particle.life -= particle.decay;
            } else {
                bubbleGame.particles.splice(i, 1);
            }
        } else if (particle.type === 'shockwave') {
            // 绘制冲击波
            if (particle.life > 0 && particle.radius < particle.maxRadius) {
                ctx.save();
                ctx.globalAlpha = particle.life;
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 5;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#ff00ff';
                
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                // 内圈
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.restore();
                
                particle.radius += particle.maxRadius * 0.1;
                particle.life -= particle.decay;
            } else {
                bubbleGame.particles.splice(i, 1);
            }
        } else if (particle.type === 'laser-beam') {
            // 绘制激光束
            if (particle.life > 0) {
                ctx.save();
                ctx.globalAlpha = particle.life;
                
                // 主激光束
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 8;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00ff00';
                ctx.beginPath();
                ctx.moveTo(particle.x1, particle.y1);
                ctx.lineTo(particle.x2, particle.y2);
                ctx.stroke();
                
                // 内层亮光
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(particle.x1, particle.y1);
                ctx.lineTo(particle.x2, particle.y2);
                ctx.stroke();
                
                ctx.restore();
                particle.life -= particle.decay;
            } else {
                bubbleGame.particles.splice(i, 1);
            }
        } else {
            // 普通爆炸粒子
            if (particle.vx !== undefined) {
                particle.x += particle.vx;
                particle.y += particle.vy;
            }
            particle.life -= particle.decay;
            
            if (particle.life > 0) {
                ctx.save();
                ctx.globalAlpha = particle.life;
                ctx.fillStyle = particle.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                bubbleGame.particles.splice(i, 1);
            }
        }
    }
}

// 绘制子弹尾迹
function drawBulletTrail(ctx, bullet) {
    if (!bullet.trail || bullet.trail.length < 2) return;
    
    ctx.save();
    
    // 螺旋弹特殊尾迹：连线效果
    if (bullet.type === 'spiral' && bullet.trail.length > 1) {
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff00ff';
        
        ctx.beginPath();
        ctx.moveTo(bullet.trail[0].x, bullet.trail[0].y);
        for (let i = 1; i < bullet.trail.length; i++) {
            ctx.lineTo(bullet.trail[i].x, bullet.trail[i].y);
        }
        ctx.stroke();
    }
    
    // 普通尾迹粒子
    for (let i = 0; i < bullet.trail.length - 1; i++) {
        const alpha = i / bullet.trail.length;
        const size = bullet.size * alpha * 0.5;
        
        ctx.beginPath();
        ctx.arc(bullet.trail[i].x, bullet.trail[i].y, size, 0, Math.PI * 2);
        
        // 根据武器类型设置尾迹颜色
        let color;
        switch(bullet.type) {
            case 'mega':
                color = `rgba(255, 0, 255, ${alpha * 0.5})`;
                break;
            case 'split':
                color = `rgba(0, 255, 255, ${alpha * 0.5})`;
                break;
            case 'laser':
                color = `rgba(0, 255, 0, ${alpha * 0.5})`;
                break;
            case 'spiral':
                color = `rgba(255, 0, 255, ${alpha * 0.7})`; // 螺旋弹尾迹更明显
                break;
            case 'bounce':
                color = `rgba(255, 107, 107, ${alpha * 0.5})`;
                break;
            default:
                color = `rgba(255, 215, 0, ${alpha * 0.5})`;
        }
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 0;
        ctx.fill();
    }
    
    ctx.restore();
}

// 绘制子弹
function drawBullet(ctx, bullet) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    
    // 添加旋转动画
    if (!bullet.rotation) bullet.rotation = 0;
    bullet.rotation += 0.1;
    ctx.rotate(bullet.rotation);
    
    // 根据武器类型绘制不同的子弹
    switch(bullet.type) {
        case 'mega':
            drawMegaBullet(ctx, bullet);
            break;
        case 'split':
            drawNormalBullet(ctx, bullet); // 分裂子弹使用普通样式但颜色不同
            break;
        case 'laser':
            drawLaserBullet(ctx, bullet);
            break;
        case 'spiral':
            drawSpiralBullet(ctx, bullet);
            break;
        case 'bounce':
            drawBounceBullet(ctx, bullet);
            break;
        case 'explosive':
            drawExplosiveBullet(ctx, bullet);
            break;
        case 'homing':
            drawHomingBullet(ctx, bullet);
            break;
        case 'chain':
            drawChainBullet(ctx, bullet);
            break;
        case 'multi':
        case 'multi-split':
            drawMultiBullet(ctx, bullet);
            break;
        case 'ultimate':
            drawUltimateBullet(ctx, bullet);
            break;
        default:
            drawNormalBullet(ctx, bullet);
    }
    
    ctx.restore();
}

// 绘制激光子弹（简化版）
function drawLaserBullet(ctx, bullet) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff00';
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#00ff00');
    gradient.addColorStop(1, '#00cc00');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(-bullet.size, -bullet.size/2, bullet.size*2, bullet.size);
}

// 绘制螺旋子弹
function drawSpiralBullet(ctx, bullet) {
    // 强烈的紫色光晕
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#ff00ff';
    
    // 绘制螺旋形状
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + bullet.rotation;
        const radius = bullet.size * (0.5 + Math.sin(angle * 2) * 0.3);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    
    // 渐变填充
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#ff00ff');
    gradient.addColorStop(0.7, '#cc00cc');
    gradient.addColorStop(1, '#990099');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 旋转线条效果
    ctx.shadowBlur = 0;
    for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i + bullet.rotation * 2;
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * bullet.size, Math.sin(angle) * bullet.size);
        ctx.stroke();
    }
}

// 绘制弹跳子弹（简化版）
function drawBounceBullet(ctx, bullet) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff6b6b';
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#ff6b6b');
    gradient.addColorStop(1, '#ff4757');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.size, 0, Math.PI * 2);
    ctx.fill();
}

// 绘制爆炸弹
function drawExplosiveBullet(ctx, bullet) {
    // 强烈的红色光晕
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#FF0000';
    
    // 闪烁效果
    const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
    
    // 外圈火焰
    for (let i = 3; i > 0; i--) {
        ctx.strokeStyle = `rgba(255, ${100 - i * 30}, 0, ${0.5 / i * pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, bullet.size + i * 8, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 主体渐变
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.3, '#FFFF00');
    gradient.addColorStop(0.6, '#FF6B00');
    gradient.addColorStop(1, '#FF0000');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 危险标志
    ctx.fillStyle = '#000';
    ctx.font = `${bullet.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', 0, 0);
}

// 绘制追踪弹
function drawHomingBullet(ctx, bullet) {
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#FFD700';
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.5, '#FFD700');
    gradient.addColorStop(1, '#FFA500');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 追踪标志
    ctx.fillStyle = '#000';
    ctx.font = `${bullet.size * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎯', 0, 0);
}

// 绘制连锁弹
function drawChainBullet(ctx, bullet) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#9B59B6';
    
    // 电流效果
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.5, '#9B59B6');
    gradient.addColorStop(1, '#6C3483');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.size, 0, Math.PI * 2);
    ctx.fill();
}

// 绘制分身弹
function drawMultiBullet(ctx, bullet) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00CED1';
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.5, '#00CED1');
    gradient.addColorStop(1, '#008B8B');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.size, 0, Math.PI * 2);
    ctx.fill();
}

// 绘制终极弹
function drawUltimateBullet(ctx, bullet) {
    // 彩虹光晕
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#FF1493';
    
    // 彩虹渐变
    const time = Date.now() / 1000;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.2, `hsl(${(time * 100) % 360}, 100%, 50%)`);
    gradient.addColorStop(0.5, `hsl(${(time * 100 + 120) % 360}, 100%, 50%)`);
    gradient.addColorStop(0.8, `hsl(${(time * 100 + 240) % 360}, 100%, 50%)`);
    gradient.addColorStop(1, '#FF1493');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 多层光环
    for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(255, 20, 147, ${0.5 - i * 0.15})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, bullet.size + i * 10 + Math.sin(time * 5 + i) * 5, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// 绘制普通子弹
function drawNormalBullet(ctx, bullet) {
    // 外层光晕
    ctx.shadowBlur = 15;
    ctx.shadowColor = bullet.color || '#ffd700';
    
    // 主体渐变
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#ffffff');
    
    if (bullet.type === 'split') {
        // 分裂子弹：青色
        gradient.addColorStop(0.3, '#00ffff');
        gradient.addColorStop(0.7, '#00cccc');
        gradient.addColorStop(1, '#009999');
    } else {
        // 普通子弹：金色
        gradient.addColorStop(0.3, '#ffd700');
        gradient.addColorStop(0.7, '#ff6b6b');
        gradient.addColorStop(1, '#ff4757');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 内层高光
    ctx.shadowBlur = 0;
    const highlight = ctx.createRadialGradient(-5, -5, 0, 0, 0, bullet.size * 0.5);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.size, 0, Math.PI * 2);
    ctx.fill();
}

// 绘制超级子弹
function drawSuperBullet(ctx, bullet) {
    // 强烈的绿色光晕
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00ff00';
    
    // 绘制六边形
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = Math.cos(angle) * bullet.size;
        const y = Math.sin(angle) * bullet.size;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    
    // 渐变填充
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#00ff00');
    gradient.addColorStop(0.7, '#00cc00');
    gradient.addColorStop(1, '#009900');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 电光效果
    ctx.shadowBlur = 0;
    for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i + bullet.rotation;
        const x1 = Math.cos(angle) * bullet.size * 0.3;
        const y1 = Math.sin(angle) * bullet.size * 0.3;
        const x2 = Math.cos(angle) * bullet.size * 0.8;
        const y2 = Math.sin(angle) * bullet.size * 0.8;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

// 绘制终极子弹
function drawMegaBullet(ctx, bullet) {
    // 超强紫色光晕
    ctx.shadowBlur = 35;
    ctx.shadowColor = '#ff00ff';
    
    // 绘制五角星
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const x = Math.cos(angle) * bullet.size;
        const y = Math.sin(angle) * bullet.size;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        // 内角
        const innerAngle = angle + Math.PI / 5;
        const innerX = Math.cos(innerAngle) * bullet.size * 0.4;
        const innerY = Math.sin(innerAngle) * bullet.size * 0.4;
        ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    
    // 渐变填充
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#ff00ff');
    gradient.addColorStop(0.7, '#cc00cc');
    gradient.addColorStop(1, '#990099');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 多层光环
    ctx.shadowBlur = 0;
    for (let i = 1; i <= 3; i++) {
        ctx.strokeStyle = `rgba(255, 0, 255, ${0.3 / i})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, bullet.size + i * 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 中心闪光
    const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.size * 0.3);
    flash.addColorStop(0, 'rgba(255, 255, 255, 1)');
    flash.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

// 发射子弹
function fireBullet() {
    if (!bubbleGame.isGameRunning) return;
    
    // 消耗当前单词的弹药
    const currentIndex = bubbleGame.currentWordIndex;
    if (bubbleGame.wordAmmo[currentIndex] > 0) {
        bubbleGame.wordAmmo[currentIndex]--;
        
        // 保存学习进度
        if (bubbleGame.wordbookId) {
            const progressKey = `bubble_progress_${bubbleGame.wordbookId}`;
            const progress = {
                wordAmmo: bubbleGame.wordAmmo,
                lastUpdate: new Date().toISOString()
            };
            localStorage.setItem(progressKey, JSON.stringify(progress));
        }
        
        // 检查这个单词是否用完了
        if (bubbleGame.wordAmmo[currentIndex] === 0) {
            const word = bubbleGame.words[currentIndex];
            showWordMasteredPopup(word.english, word.chinese);
        }
    }
    
    // 炮台发射动画
    const barrel = document.getElementById('cannon-barrel');
    barrel.style.transform = 'translateX(-10px)';
    setTimeout(() => {
        barrel.style.transform = 'translateX(0)';
    }, 100);
    
    const canvas = bubbleGame.canvas;
    const weaponType = getBulletType();
    const cannonType = bubbleGame.selectedCannon || 'cannon1';
    
    // 确定炮台数量
    const cannonCount = cannonType === 'cannon3' ? 3 : cannonType === 'cannon2' ? 2 : 1;
    
    // 计算炮台位置
    const cannonPositions = [];
    if (cannonCount === 1) {
        cannonPositions.push({ x: canvas.width / 2, y: canvas.height - 30 });
    } else if (cannonCount === 2) {
        cannonPositions.push({ x: canvas.width / 2 - 40, y: canvas.height - 30 });
        cannonPositions.push({ x: canvas.width / 2 + 40, y: canvas.height - 30 });
    } else {
        cannonPositions.push({ x: canvas.width / 2 - 60, y: canvas.height - 30 });
        cannonPositions.push({ x: canvas.width / 2, y: canvas.height - 30 });
        cannonPositions.push({ x: canvas.width / 2 + 60, y: canvas.height - 30 });
    }
    
    // 从每个炮台发射
    cannonPositions.forEach(cannonPos => {
        createBullet(cannonPos.x, cannonPos.y, weaponType);
    });
    
    // 准备下一个单词
    loadNextWord();
}

// 创建子弹
function createBullet(cannonX, cannonY, weaponType) {
    const canvas = bubbleGame.canvas;
    const barrelLength = 35;
    
    const startX = cannonX + Math.cos(cannonAngle) * barrelLength;
    const startY = cannonY + Math.sin(cannonAngle) * barrelLength;
    
    // 根据武器类型设置速度
    let speed = 10;
    if (weaponType === 'mega') speed = 3; // 超大子弹非常慢
    if (weaponType === 'bounce') speed = 12; // 弹跳弹快速
    if (weaponType === 'homing') speed = 8; // 追踪弹中速
    if (weaponType === 'explosive') speed = 9; // 爆炸弹
    if (weaponType === 'chain') speed = 10; // 连锁弹
    if (weaponType === 'multi') speed = 6; // 分身弹（速度较慢，便于观察分裂）
    if (weaponType === 'pierce') speed = 14; // 穿透弹快速
    if (weaponType === 'freeze') speed = 11; // 冰冻弹
    if (weaponType === 'starburst') speed = 10; // 星爆弹
    if (weaponType === 'tornado') speed = 7; // 龙卷弹慢速
    if (weaponType === 'ultimate') speed = 15; // 终极弹快速
    
    const vx = Math.cos(cannonAngle) * speed;
    const vy = Math.sin(cannonAngle) * speed;
    
    // 激光弹特殊处理
    if (weaponType === 'laser') {
        createLaserBeam(startX, startY, cannonAngle);
        return;
    }
    
    // 终极弹特殊处理
    if (weaponType === 'ultimate') {
        createUltimateBullet(startX, startY, vx, vy);
        return;
    }
    
    // 分裂双炮
    if (weaponType === 'split') {
        const angleOffset = 0.15;
        
        const leftAngle = cannonAngle - angleOffset;
        bubbleGame.bullets.push({
            x: startX,
            y: startY,
            vx: Math.cos(leftAngle) * speed,
            vy: Math.sin(leftAngle) * speed,
            type: weaponType,
            size: 15,
            color: '#00ffff'
        });
        
        const rightAngle = cannonAngle + angleOffset;
        bubbleGame.bullets.push({
            x: startX,
            y: startY,
            vx: Math.cos(rightAngle) * speed,
            vy: Math.sin(rightAngle) * speed,
            type: weaponType,
            size: 15,
            color: '#00ffff'
        });
    } else {
        // 普通子弹
        const bullet = {
            x: startX,
            y: startY,
            vx: vx,
            vy: vy,
            type: weaponType,
            size: getBulletSize(weaponType),
            color: getBulletColor(weaponType)
        };
        
        // 弹跳弹特殊属性
        if (weaponType === 'bounce') {
            bullet.bounceCount = 0;
            bullet.maxBounces = 5;
        }
        
        // 追踪弹特殊属性
        if (weaponType === 'homing') {
            bullet.isHoming = true;
        }
        
        // 爆炸弹特殊属性
        if (weaponType === 'explosive') {
            bullet.isExplosive = true;
            bullet.explosionRadius = 200; // 增大爆炸半径
            bullet.explosionDelay = 0; // 爆炸延迟（秒）
            bullet.isExploding = false; // 是否正在爆炸
        }
        
        // 连锁弹特殊属性
        if (weaponType === 'chain') {
            bullet.isChain = true;
            bullet.maxChain = 10;
        }
        
        // 分身弹特殊属性
        if (weaponType === 'multi') {
            bullet.isMulti = true;
            bullet.splitTime = Date.now(); // 立即分裂
            bullet.hasSplit = false;
        }
        
        // 穿透弹特殊属性
        if (weaponType === 'pierce') {
            bullet.isPierce = true;
            bullet.pierceCount = 0;
            bullet.maxPierce = 999; // 无限穿透
        }
        
        // 冰冻弹特殊属性
        if (weaponType === 'freeze') {
            bullet.isFreeze = true;
            bullet.freezeRadius = 150;
            bullet.freezeDuration = 10000; // 冻结10秒
            bullet.onlyFreeze = true; // 只冻结，不打碎
        }
        
        // 星爆弹特殊属性
        if (weaponType === 'starburst') {
            bullet.isStarburst = true;
            bullet.burstCount = 8; // 爆炸成8发
        }
        
        // 龙卷弹特殊属性
        if (weaponType === 'tornado') {
            bullet.isTornado = true;
            bullet.pullRadius = 500; // 超大吸引范围（几乎全屏）
            bullet.pullStrength = 3; // 更强的吸引力度
        }
        
        bubbleGame.bullets.push(bullet);
    }
}

// 创建激光束
function createLaserBeam(startX, startY, angle) {
    const canvas = bubbleGame.canvas;
    const maxDistance = Math.max(canvas.width, canvas.height) * 2;
    
    const endX = startX + Math.cos(angle) * maxDistance;
    const endY = startY + Math.sin(angle) * maxDistance;
    
    // 创建激光效果
    bubbleGame.particles.push({
        type: 'laser-beam',
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY,
        life: 1,
        decay: 0.05,
        angle: angle
    });
    
    // 检测激光路径上的所有泡泡
    const hitBubbles = [];
    for (let i = bubbleGame.bubbles.length - 1; i >= 0; i--) {
        const bubble = bubbleGame.bubbles[i];
        
        // 点到线段的距离
        const distance = pointToLineDistance(bubble.x, bubble.y, startX, startY, endX, endY);
        
        if (distance < bubble.size + 10) {
            hitBubbles.push({ bubble: bubble, index: i });
        }
    }
    
    // 击中所有泡泡
    if (hitBubbles.length > 0) {
        hitBubbles.sort((a, b) => b.index - a.index);
        hitBubbles.forEach(hit => {
            createExplosion(hit.bubble.x, hit.bubble.y, 'laser');
            bubbleGame.bubbles.splice(hit.index, 1);
        });
        
        // 计算得分
        bubbleGame.combo++;
        bubbleGame.bubblesDestroyed += hitBubbles.length;
        
        const basePoints = hitBubbles.length * 100;
        const comboBonus = bubbleGame.combo * 50;
        const totalEarned = basePoints + comboBonus;
        
        bubbleGame.score += totalEarned;
        bubbleGame.totalScore += totalEarned;
        saveTotalScore(bubbleGame.totalScore);
        
        // BOSS现在开局就出现，不需要计数触发
        // if (bubbleGame.bubblesDestroyed >= 15 && !bubbleGame.boss) {
        //     spawnBoss();
        // }
        
        checkWeaponUnlocks();
        updateScore();
        updateBubbleCount();
        
        if (bubbleGame.combo >= 5 && bubbleGame.combo % 5 === 0) {
            showComboPopup();
        }
    }
}

// 点到线段的距离
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// 获取子弹大小
function getBulletSize(weaponType) {
    switch(weaponType) {
        case 'mega': return 50; // 超大子弹
        case 'laser': return 12;
        case 'spiral': return 18;
        case 'bounce': return 16;
        case 'split': return 15;
        case 'homing': return 18; // 追踪弹
        case 'explosive': return 20; // 爆炸弹
        case 'chain': return 17; // 连锁弹
        case 'multi': return 22; // 分身弹（分裂前大）
        case 'pierce': return 14; // 穿透弹（细长）
        case 'freeze': return 19; // 冰冻弹
        case 'starburst': return 25; // 星爆弹（大）
        case 'tornado': return 30; // 龙卷弹（大）
        case 'ultimate': return 40; // 终极弹
        default: return 15;
    }
}

// 获取子弹颜色
function getBulletColor(weaponType) {
    switch(weaponType) {
        case 'normal': return '#ffd700';
        case 'split': return '#00ffff';
        case 'laser': return '#00ff00';
        case 'spiral': return '#ff00ff';
        case 'bounce': return '#ff6b6b';
        case 'mega': return '#ff00ff';
        case 'homing': return '#FFD700'; // 金色
        case 'explosive': return '#FF0000'; // 红色
        case 'chain': return '#9B59B6'; // 紫色
        case 'multi': return '#00CED1'; // 青色
        case 'pierce': return '#00FF7F'; // 春绿色
        case 'freeze': return '#00BFFF'; // 深天蓝
        case 'starburst': return '#FFD700'; // 金黄色
        case 'tornado': return '#87CEEB'; // 天蓝色
        case 'ultimate': return '#FF1493'; // 深粉色（彩虹效果在绘制时处理）
        default: return '#ffd700';
    }
}

// 获取当前选择的子弹类型
function getBulletType() {
    return bubbleGame.selectedWeapon || 'normal';
}

// 开始生成泡泡
function startBubbleSpawning() {
    if (!bubbleGame.isGameRunning) return;
    
    // 每1秒生成一个泡泡（提高频率）
    const spawnInterval = setInterval(() => {
        if (!bubbleGame.isGameRunning) {
            clearInterval(spawnInterval);
            return;
        }
        
        if (bubbleGame.bubbles.length < 15) { // 增加最大泡泡数量
            spawnBubble();
        }
    }, 1000); // 从2000ms改为1000ms
    
    // 初始生成5个泡泡（增加初始数量）
    for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnBubble(), i * 300);
    }
}

// 生成泡泡
function spawnBubble() {
    const canvas = bubbleGame.canvas;
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'];
    
    const bubble = {
        x: Math.random() * (canvas.width - 60) + 30,
        y: -30,
        vy: 1 + Math.random() * 2,
        size: 25 + Math.random() * 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.02 + Math.random() * 0.03
    };
    
    bubbleGame.bubbles.push(bubble);
    updateBubbleCount();
}

// 创建泡泡老大
// BOSS特征定义
const bossTraits = {
    shield: { name: '护盾', icon: '🛡️', difficulty: 'easy' },
    lightning: { name: '闪电攻击', icon: '⚡', difficulty: 'medium' },
    summon: { name: '召唤泡泡', icon: '🎯', difficulty: 'easy' },
    rage: { name: '狂暴模式', icon: '💪', difficulty: 'medium' },
    teleport: { name: '瞬移', icon: '💨', difficulty: 'medium' },
    clone: { name: '分身', icon: '👥', difficulty: 'hard' },
    fire_aura: { name: '火焰光环', icon: '🔥', difficulty: 'easy' },
    freeze_immune: { name: '冰冻免疫', icon: '🧊', difficulty: 'hard' }
};

// 为单词本选择随机特征
function selectBossTraits(wordbookId) {
    // 检查是否已经为这个单词本选择过特征
    const savedKey = `boss_traits_${wordbookId}`;
    const saved = localStorage.getItem(savedKey);
    if (saved) {
        return JSON.parse(saved);
    }
    
    // 分类特征
    const easy = ['shield', 'summon', 'fire_aura'];
    const medium = ['lightning', 'rage', 'teleport'];
    const hard = ['clone', 'freeze_immune'];
    
    // 随机选择：2个简单 + 1个中等 + 1个困难
    const selected = [];
    
    // 选2个简单
    const shuffledEasy = easy.sort(() => Math.random() - 0.5);
    selected.push(shuffledEasy[0], shuffledEasy[1]);
    
    // 选1个中等
    const shuffledMedium = medium.sort(() => Math.random() - 0.5);
    selected.push(shuffledMedium[0]);
    
    // 选1个困难
    const shuffledHard = hard.sort(() => Math.random() - 0.5);
    selected.push(shuffledHard[0]);
    
    // 保存选择
    localStorage.setItem(savedKey, JSON.stringify(selected));
    
    return selected;
}

function spawnBoss() {
    const canvas = bubbleGame.canvas;
    
    // 获取当前单词本的BOSS特征
    const wordbookId = bubbleGame.wordbookId || 'default';
    const traits = selectBossTraits(wordbookId);
    
    bubbleGame.boss = {
        x: canvas.width / 2,
        y: 100,
        vx: 2.5,
        vy: 1.5,
        size: 60,
        maxSize: 90,
        minSize: 45,
        hp: 100,
        maxHp: 100,
        color: '#ff0000',
        floatOffset: 0,
        sizePhase: 0,
        speedPhase: 0,
        movePattern: 0,
        patternTimer: 0,
        // 特征系统
        traits: traits,
        traitTimers: {},
        // 护盾特征
        shield: traits.includes('shield') ? 50 : 0,
        maxShield: 50,
        // 狂暴特征
        isRage: false,
        // 分身特征
        clones: []
    };
    
    // 初始化特征计时器
    traits.forEach(trait => {
        bubbleGame.boss.traitTimers[trait] = 0;
    });
    
    // 显示BOSS出现提示
    showBossAppearPopup();
}

// BOSS特征：闪电攻击
function bossLightningAttack(boss, canvas) {
    showBossTraitPopup('BOSS使用了闪电攻击！⚡');
    
    // 创建闪电从BOSS到炮台
    const cannonX = canvas.width / 2;
    const cannonY = canvas.height - 30;
    
    createLightning(boss.x, boss.y, cannonX, cannonY);
    
    // 造成伤害（减少玩家连击）
    if (bubbleGame.combo > 0) {
        bubbleGame.combo = Math.max(0, bubbleGame.combo - 5);
        updateScore();
    }
}

// BOSS特征：召唤泡泡
function bossSummonBubbles(boss, canvas) {
    showBossTraitPopup('BOSS召唤了泡泡！🎯');
    
    // 在BOSS周围召唤3个泡泡
    for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i;
        const distance = boss.size + 50;
        
        const bubble = {
            x: boss.x + Math.cos(angle) * distance,
            y: boss.y + Math.sin(angle) * distance,
            size: 25,
            color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'][Math.floor(Math.random() * 4)],
            vy: 0.5,
            floatOffset: Math.random() * Math.PI * 2,
            floatSpeed: 0.02 + Math.random() * 0.02
        };
        
        bubbleGame.bubbles.push(bubble);
        
        // 召唤特效
        for (let j = 0; j < 20; j++) {
            const particleAngle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3;
            bubbleGame.particles.push({
                x: bubble.x,
                y: bubble.y,
                vx: Math.cos(particleAngle) * speed,
                vy: Math.sin(particleAngle) * speed,
                life: 1,
                decay: 0.02,
                size: Math.random() * 5 + 2,
                color: bubble.color
            });
        }
    }
    
    updateBubbleCount();
}

// 显示BOSS特征提示（已禁用，避免干扰游戏）
function showBossTraitPopup(message) {
    // 不显示提示框，保持游戏流畅
    // console.log('BOSS技能:', message); // 可以在控制台查看
}

// 更新泡泡老大
function updateBoss(ctx, canvas) {
    if (!bubbleGame.boss) return;
    
    const boss = bubbleGame.boss;
    
    // 检查冰冻状态（冰冻免疫特征检查）
    if (boss.isFrozen && Date.now() >= boss.frozenUntil) {
        boss.isFrozen = false;
        boss.vx = boss.originalVx || boss.vx;
        boss.vy = boss.originalVy || boss.vy;
    }
    
    // 更新特征计时器
    if (boss.traits) {
        boss.traits.forEach(trait => {
            boss.traitTimers[trait]++;
        });
        
        // 闪电攻击特征（每5秒 = 300帧）
        if (boss.traits.includes('lightning') && boss.traitTimers.lightning >= 300) {
            boss.traitTimers.lightning = 0;
            bossLightningAttack(boss, canvas);
        }
        
        // 召唤泡泡特征（每8秒 = 480帧）
        if (boss.traits.includes('summon') && boss.traitTimers.summon >= 480) {
            boss.traitTimers.summon = 0;
            bossSummonBubbles(boss, canvas);
        }
        
        // 狂暴模式特征（HP < 30%）
        if (boss.traits.includes('rage') && !boss.isRage && boss.hp < boss.maxHp * 0.3) {
            boss.isRage = true;
            showBossTraitPopup('BOSS进入狂暴模式！💪');
        }
    }
    
    // 更新大小（呼吸效果 - 更明显的变大变小）
    boss.sizePhase += 0.05;  // 加快呼吸速度
    const sizeWave = Math.sin(boss.sizePhase);
    boss.size = boss.minSize + (boss.maxSize - boss.minSize) * (sizeWave * 0.5 + 0.5);
    
    // 更新速度（时快时慢 - 更明显的速度变化）
    boss.speedPhase += 0.03;
    const speedWave = Math.sin(boss.speedPhase);
    let baseSpeedMultiplier = 0.3 + speedWave * 0.7;
    
    // 狂暴模式：速度翻倍
    if (boss.isRage) {
        baseSpeedMultiplier *= 2;
    }
    
    // 冰冻时速度减慢
    const speedMultiplier = boss.isFrozen ? 0.2 : baseSpeedMultiplier;
    
    // 移动模式切换
    boss.patternTimer++;
    if (boss.patternTimer > 180) {  // 每3秒切换一次移动模式
        boss.movePattern = Math.floor(Math.random() * 3);
        boss.patternTimer = 0;
        
        // 根据模式设置不同的速度
        switch(boss.movePattern) {
            case 0: // 慢速飘动
                boss.vx = (Math.random() - 0.5) * 2;
                boss.vy = (Math.random() - 0.5) * 1.5;
                break;
            case 1: // 中速移动
                boss.vx = (Math.random() - 0.5) * 4;
                boss.vy = (Math.random() - 0.5) * 3;
                break;
            case 2: // 快速冲刺
                boss.vx = (Math.random() - 0.5) * 6;
                boss.vy = (Math.random() - 0.5) * 4.5;
                break;
        }
    }
    
    // 移动（应用速度倍增器）
    boss.x += boss.vx * speedMultiplier;
    boss.y += boss.vy * speedMultiplier;
    
    // 边界反弹
    if (boss.x < boss.size || boss.x > canvas.width - boss.size) {
        boss.vx = -boss.vx;
        boss.x = Math.max(boss.size, Math.min(canvas.width - boss.size, boss.x));
    }
    
    if (boss.y < boss.size || boss.y > canvas.height / 2) {
        boss.vy = -boss.vy;
        boss.y = Math.max(boss.size, Math.min(canvas.height / 2, boss.y));
    }
    
    // 随机突然改变方向（增加不可预测性）
    if (Math.random() < 0.015) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        boss.vx = Math.cos(angle) * speed;
        boss.vy = Math.sin(angle) * speed;
    }
    
    // 绘制泡泡老大
    drawBoss(ctx, boss);
}

// 绘制泡泡老大
function drawBoss(ctx, boss) {
    ctx.save();
    ctx.translate(boss.x, boss.y);
    
    // 根据大小变化调整光环强度
    const sizeRatio = (boss.size - boss.minSize) / (boss.maxSize - boss.minSize);
    
    // 外层光环（随大小脉动）
    for (let i = 4; i > 0; i--) {
        const alpha = (0.4 / i) * (0.5 + sizeRatio * 0.5);
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, boss.size + i * 12, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 能量波纹（变大时更明显）
    if (sizeRatio > 0.7) {
        ctx.strokeStyle = `rgba(255, 100, 0, ${(sizeRatio - 0.7) * 2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, boss.size + 20, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 主体渐变
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, boss.size);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.2, '#ffff00');
    gradient.addColorStop(0.4, '#ff6b6b');
    gradient.addColorStop(0.7, '#ff0000');
    gradient.addColorStop(1, '#cc0000');
    
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 30 + sizeRatio * 20;  // 变大时光晕更强
    ctx.shadowColor = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, 0, boss.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 高光
    ctx.shadowBlur = 0;
    const highlight = ctx.createRadialGradient(-boss.size * 0.3, -boss.size * 0.3, 0, 0, 0, boss.size * 0.5);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(0, 0, boss.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛（让BOSS更有生命力）
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-boss.size * 0.25, -boss.size * 0.15, boss.size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(boss.size * 0.25, -boss.size * 0.15, boss.size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛高光
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-boss.size * 0.25 + boss.size * 0.03, -boss.size * 0.15 - boss.size * 0.03, boss.size * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(boss.size * 0.25 + boss.size * 0.03, -boss.size * 0.15 - boss.size * 0.03, boss.size * 0.04, 0, Math.PI * 2);
    ctx.fill();
    
    // 血条
    const barWidth = boss.size * 2.2;
    const barHeight = 10;
    const barY = boss.size + 18;
    
    // 血条背景
    ctx.fillStyle = '#333';
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
    
    // 血条
    const hpPercent = boss.hp / boss.maxHp;
    let barColor;
    if (hpPercent > 0.6) {
        barColor = '#00ff00';
    } else if (hpPercent > 0.3) {
        barColor = '#ffaa00';
    } else {
        barColor = '#ff0000';
    }
    
    // 血条渐变
    const barGradient = ctx.createLinearGradient(-barWidth / 2, 0, barWidth / 2, 0);
    barGradient.addColorStop(0, barColor);
    barGradient.addColorStop(0.5, '#ffffff');
    barGradient.addColorStop(1, barColor);
    ctx.fillStyle = barGradient;
    ctx.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight);
    
    // 血条边框
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
    
    // 护盾条（如果有护盾特征）
    if (boss.shield > 0) {
        const shieldY = barY + barHeight + 5;
        const shieldPercent = boss.shield / boss.maxShield;
        
        // 护盾背景
        ctx.fillStyle = '#222';
        ctx.fillRect(-barWidth / 2, shieldY, barWidth, 6);
        
        // 护盾
        ctx.fillStyle = '#00BFFF';
        ctx.fillRect(-barWidth / 2, shieldY, barWidth * shieldPercent, 6);
        
        // 护盾边框
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, shieldY, barWidth, 6);
    }
    
    // HP文字
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    const hpText = boss.shield > 0 ? `${boss.hp}/${boss.maxHp} (🛡️${boss.shield})` : `${boss.hp}/${boss.maxHp}`;
    ctx.strokeText(hpText, 0, barY + barHeight + (boss.shield > 0 ? 24 : 18));
    ctx.fillText(hpText, 0, barY + barHeight + (boss.shield > 0 ? 24 : 18));
    
    // 特征图标
    if (boss.traits && boss.traits.length > 0) {
        ctx.font = '20px Arial';
        const iconY = barY + barHeight + (boss.shield > 0 ? 45 : 38);
        const iconSpacing = 25;
        const totalWidth = boss.traits.length * iconSpacing;
        
        boss.traits.forEach((trait, index) => {
            const traitInfo = bossTraits[trait];
            if (traitInfo) {
                const x = -totalWidth / 2 + index * iconSpacing + iconSpacing / 2;
                ctx.fillText(traitInfo.icon, x, iconY);
            }
        });
    }
    
    // BOSS标记
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px Arial';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('👑 泡泡老大', 0, -boss.size - 15);
    ctx.fillText('👑 泡泡老大', 0, -boss.size - 15);
    
    // 狂暴模式效果
    if (boss.isRage) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#FF0000';
        ctx.beginPath();
        ctx.arc(0, 0, boss.size + 15, 0, Math.PI * 2);
        ctx.stroke();
        
        // 狂暴文字
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 16px Arial';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText('💪 狂暴', 0, -boss.size - 35);
        ctx.fillText('💪 狂暴', 0, -boss.size - 35);
    }
    
    // 冰冻效果
    if (boss.isFrozen) {
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00BFFF';
        ctx.beginPath();
        ctx.arc(0, 0, boss.size + 10, 0, Math.PI * 2);
        ctx.stroke();
        
        // 冰晶效果
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.6)';
        ctx.lineWidth = 3;
        for (let k = 0; k < 8; k++) {
            const angle = (Math.PI * 2 / 8) * k;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * boss.size, Math.sin(angle) * boss.size);
            ctx.stroke();
        }
        
        // 冰冻文字提示
        ctx.fillStyle = '#00BFFF';
        ctx.font = 'bold 16px Arial';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText('❄️ 冰冻中', 0, boss.size + 50);
        ctx.fillText('❄️ 冰冻中', 0, boss.size + 50);
    }
    
    ctx.restore();
}

// 显示BOSS出现提示
function showBossAppearPopup() {
    const popup = document.createElement('div');
    popup.className = 'boss-appear-popup';
    popup.innerHTML = `
        <div class="boss-appear-icon">👑</div>
        <div class="boss-appear-text">泡泡老大出现！</div>
        <div class="boss-appear-hp">HP: 100</div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 3000);
}

// 创建BOSS爆炸效果（超级震撼）
function createBossExplosion(x, y) {
    const canvas = bubbleGame.canvas;
    
    // 第一波：中心大爆炸
    for (let i = 0; i < 50; i++) {
        const angle = (Math.PI * 2 / 50) * i;
        const speed = 3 + Math.random() * 5;
        
        bubbleGame.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 8 + Math.random() * 12,
            color: ['#ff0000', '#ff6b00', '#ffaa00', '#ffd700', '#ffffff'][Math.floor(Math.random() * 5)],
            life: 1,
            decay: 0.01 + Math.random() * 0.01
        });
    }
    
    // 第二波：火花四溅
    setTimeout(() => {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            
            bubbleGame.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                size: 4 + Math.random() * 6,
                color: ['#ffff00', '#ff6b00', '#ff0000'][Math.floor(Math.random() * 3)],
                life: 1,
                decay: 0.015 + Math.random() * 0.015
            });
        }
    }, 100);
    
    // 第三波：冲击波
    setTimeout(() => {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            const speed = 6 + Math.random() * 3;
            
            bubbleGame.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: '#ffffff',
                life: 1,
                decay: 0.02
            });
        }
    }, 200);
    
    // 屏幕震动效果
    if (canvas) {
        let shakeCount = 0;
        const shakeInterval = setInterval(() => {
            canvas.style.transform = `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`;
            shakeCount++;
            if (shakeCount > 15) {
                clearInterval(shakeInterval);
                canvas.style.transform = 'translate(0, 0)';
            }
        }, 50);
    }
}

// 创建终极弹
function createUltimateBullet(startX, startY, vx, vy) {
    // 检查是否已使用
    if (bubbleGame.ultimateUsed) {
        alert('终极弹每局只能使用一次！');
        return;
    }
    
    // 确认使用
    const confirmed = confirm('⚠️ 警告 ⚠️\n\n使用终极弹后积分会清零！\n确定要使用吗？');
    
    if (!confirmed) {
        return;
    }
    
    // 标记已使用
    bubbleGame.ultimateUsed = true;
    
    // 创建终极子弹
    bubbleGame.bullets.push({
        x: startX,
        y: startY,
        vx: vx,
        vy: vy,
        type: 'ultimate',
        size: 40,
        color: '#FF1493',
        isUltimate: true,
        trail: []
    });
}

// 触发终极弹效果
function triggerUltimateEffect(x, y) {
    const canvas = bubbleGame.canvas;
    
    // 清空所有泡泡
    const bubbleCount = bubbleGame.bubbles.length;
    bubbleGame.bubbles = [];
    
    // 对BOSS造成50伤害
    if (bubbleGame.boss) {
        bubbleGame.boss.hp -= 50;
        if (bubbleGame.boss.hp < 0) bubbleGame.boss.hp = 0;
    }
    
    // 超级爆炸效果
    for (let i = 0; i < 200; i++) {
        const angle = (Math.PI * 2 / 200) * i;
        const speed = 5 + Math.random() * 10;
        
        bubbleGame.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 10,
            color: ['#FF0000', '#FF6B00', '#FFAA00', '#FFD700', '#FFFFFF', '#FF1493', '#9B59B6'][Math.floor(Math.random() * 7)],
            life: 1,
            decay: 0.01 + Math.random() * 0.01
        });
    }
    
    // 屏幕震动
    if (canvas) {
        let shakeCount = 0;
        const shakeInterval = setInterval(() => {
            canvas.style.transform = `translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px)`;
            shakeCount++;
            if (shakeCount > 20) {
                clearInterval(shakeInterval);
                canvas.style.transform = 'translate(0, 0)';
            }
        }, 50);
    }
    
    // 积分清零
    bubbleGame.totalScore = 0;
    saveTotalScore(0);
    updateGameTotalScore();
    
    // 显示提示
    showUltimateUsedPopup(bubbleCount);
}

// 显示终极弹使用提示
function showUltimateUsedPopup(bubbleCount) {
    const popup = document.createElement('div');
    popup.className = 'ultimate-used-popup';
    popup.innerHTML = `
        <div class="ultimate-icon">⚡💥</div>
        <div class="ultimate-text">终极弹发动！</div>
        <div class="ultimate-stats">
            <div>消灭泡泡：${bubbleCount}个</div>
            <div>BOSS伤害：-50 HP</div>
            <div>积分清零：0分</div>
        </div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 3000);
}

// 显示BOSS击败提示
function showBossDefeatPopup() {
    const popup = document.createElement('div');
    popup.className = 'boss-defeat-popup';
    popup.innerHTML = `
        <div class="boss-defeat-icon">🎉</div>
        <div class="boss-defeat-text">泡泡老大被击败！</div>
        <div class="boss-defeat-bonus">+1000 积分</div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 3000);
}

// 显示单词掌握提示
function showWordMasteredPopup(english, chinese) {
    const popup = document.createElement('div');
    popup.className = 'word-mastered-popup';
    popup.innerHTML = `
        <div class="word-mastered-icon">✅</div>
        <div class="word-mastered-text">恭喜！你已经掌握了</div>
        <div class="word-mastered-word">${english}</div>
        <div class="word-mastered-chinese">${chinese}</div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 2000);
}

// 显示单词本完成提示
function showWordbookCompletePopup() {
    // 停止游戏
    bubbleGame.isGameRunning = false;
    
    // 计算统计数据
    const totalWords = bubbleGame.words.length;
    const totalAttempts = totalWords * 5;
    
    const popup = document.createElement('div');
    popup.className = 'wordbook-complete-popup';
    popup.innerHTML = `
        <div class="wordbook-complete-icon">🏆</div>
        <div class="wordbook-complete-title">太棒了！</div>
        <div class="wordbook-complete-text">你已经完全掌握了</div>
        <div class="wordbook-complete-name">【${bubbleGame.wordbookName}】</div>
        <div class="wordbook-complete-stats">
            <div class="stat-item">
                <div class="stat-label">掌握单词</div>
                <div class="stat-value">${totalWords} 个</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">总得分</div>
                <div class="stat-value">${bubbleGame.score} 分</div>
            </div>
        </div>
        <div class="wordbook-complete-message">现在选择新的单词本继续冒险吧！</div>
        <button class="wordbook-complete-btn" onclick="backToWordbookSelection()">选择单词本</button>
    `;
    document.body.appendChild(popup);
}

// 返回单词本选择页面
function backToWordbookSelection() {
    // 移除弹窗
    const popup = document.querySelector('.wordbook-complete-popup');
    if (popup) {
        popup.remove();
    }
    
    // 返回单词本选择页面
    showPage('bubble-wordbook-selection');
    loadBubbleWordbookList();
}

// 绘制炮台
function drawCannon(ctx, canvas) {
    const bulletType = getBulletType();
    const cannonType = bubbleGame.selectedCannon || 'cannon1';
    const cannonCount = cannonType === 'cannon3' ? 3 : cannonType === 'cannon2' ? 2 : 1;
    
    // 计算炮台位置
    const cannonPositions = [];
    if (cannonCount === 1) {
        cannonPositions.push({ x: canvas.width / 2, y: canvas.height - 30 });
    } else if (cannonCount === 2) {
        cannonPositions.push({ x: canvas.width / 2 - 40, y: canvas.height - 30 });
        cannonPositions.push({ x: canvas.width / 2 + 40, y: canvas.height - 30 });
    } else {
        cannonPositions.push({ x: canvas.width / 2 - 60, y: canvas.height - 30 });
        cannonPositions.push({ x: canvas.width / 2, y: canvas.height - 30 });
        cannonPositions.push({ x: canvas.width / 2 + 60, y: canvas.height - 30 });
    }
    
    // 绘制每个炮台
    cannonPositions.forEach(pos => {
        drawSingleCannon(ctx, pos.x, pos.y, bulletType);
    });
    
    // 绘制提示文字（仅在游戏开始时显示）
    if (bubbleGame.score === 0 && bubbleGame.bullets.length === 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('移动鼠标瞄准泡泡', canvas.width / 2, 30);
        ctx.restore();
    }
}

// 绘制单个炮台
function drawSingleCannon(ctx, cannonX, cannonY, bulletType) {
    
    ctx.save();
    ctx.translate(cannonX, cannonY);
    
    // 底座
    const baseGradient = ctx.createLinearGradient(-30, 0, 30, 0);
    baseGradient.addColorStop(0, '#7f8c8d');
    baseGradient.addColorStop(1, '#95a5a6');
    
    ctx.fillStyle = baseGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 旋转炮管
    ctx.save();
    ctx.rotate(cannonAngle);
    
    // 炮管颜色和光晕
    let barrelColor;
    if (bulletType === 'mega') {
        barrelColor = ctx.createLinearGradient(0, -8, 0, 8);
        barrelColor.addColorStop(0, '#ff00ff');
        barrelColor.addColorStop(1, '#cc00cc');
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff00ff';
    } else if (bulletType === 'super') {
        barrelColor = ctx.createLinearGradient(0, -8, 0, 8);
        barrelColor.addColorStop(0, '#00ff00');
        barrelColor.addColorStop(1, '#00cc00');
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff00';
    } else {
        barrelColor = ctx.createLinearGradient(0, -8, 0, 8);
        barrelColor.addColorStop(0, '#ffd700');
        barrelColor.addColorStop(1, '#ff6b6b');
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffd700';
    }
    
    // 炮管主体
    ctx.fillStyle = barrelColor;
    ctx.fillRect(0, -8, 35, 16);
    
    // 炮管边框
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -8, 35, 16);
    
    // 炮口
    ctx.beginPath();
    ctx.arc(35, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    ctx.restore();
    
    // 绘制瞄准线（虚线）
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const aimLength = 150;
    ctx.lineTo(Math.cos(cannonAngle) * aimLength, Math.sin(cannonAngle) * aimLength);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    
    ctx.restore();
}

// 游戏主循环
function gameLoop() {
    if (!bubbleGame.isGameRunning) return;
    
    const ctx = bubbleGame.ctx;
    const canvas = bubbleGame.canvas;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制炮台
    drawCannon(ctx, canvas);
    
    // 更新和绘制粒子
    updateParticles(ctx);
    
    // 更新和绘制泡泡老大
    if (bubbleGame.boss) {
        updateBoss(ctx, canvas);
    }
    
    // 更新和绘制泡泡
    for (let i = bubbleGame.bubbles.length - 1; i >= 0; i--) {
        const bubble = bubbleGame.bubbles[i];
        
        // 检查冰冻状态
        if (bubble.isFrozen && Date.now() >= bubble.frozenUntil) {
            bubble.isFrozen = false;
            bubble.vy = bubble.originalVy || bubble.vy;
        }
        
        // 更新位置
        bubble.y += bubble.vy;
        bubble.floatOffset += bubble.floatSpeed;
        const floatX = Math.sin(bubble.floatOffset) * 20;
        
        // 绘制泡泡
        ctx.save();
        ctx.translate(bubble.x + floatX, bubble.y);
        
        // 泡泡主体
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bubble.size);
        gradient.addColorStop(0, bubble.color);
        gradient.addColorStop(0.7, bubble.color);
        gradient.addColorStop(1, 'rgba(255,255,255,0.3)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, bubble.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 高光效果
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(-bubble.size * 0.3, -bubble.size * 0.3, bubble.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // 冰冻效果
        if (bubble.isFrozen) {
            ctx.strokeStyle = '#00BFFF';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00BFFF';
            ctx.beginPath();
            ctx.arc(0, 0, bubble.size + 5, 0, Math.PI * 2);
            ctx.stroke();
            
            // 冰晶效果
            ctx.fillStyle = 'rgba(0, 191, 255, 0.3)';
            for (let k = 0; k < 6; k++) {
                const angle = (Math.PI * 2 / 6) * k;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * bubble.size, Math.sin(angle) * bubble.size);
                ctx.stroke();
            }
        }
        
        ctx.restore();
        
        // 移除超出屏幕的泡泡
        if (bubble.y > canvas.height + 50) {
            bubbleGame.bubbles.splice(i, 1);
            updateBubbleCount();
        }
    }
    
    // 更新和绘制子弹
    for (let i = bubbleGame.bullets.length - 1; i >= 0; i--) {
        const bullet = bubbleGame.bullets[i];
        
        // 保存轨迹
        if (!bullet.trail) bullet.trail = [];
        bullet.trail.push({ x: bullet.x, y: bullet.y });
        
        // 螺旋弹保留更长的轨迹
        const maxTrailLength = bullet.type === 'spiral' ? 15 : 8;
        if (bullet.trail.length > maxTrailLength) bullet.trail.shift();
        
        // 螺旋弹特殊效果：左右摆动
        if (bullet.type === 'spiral') {
            if (!bullet.spiralTime) bullet.spiralTime = 0;
            bullet.spiralTime += 0.2;
            
            // 计算垂直于飞行方向的摆动
            const angle = Math.atan2(bullet.vy, bullet.vx);
            const perpAngle = angle + Math.PI / 2;
            const swingAmount = Math.sin(bullet.spiralTime) * 3; // 摆动幅度
            
            bullet.x += Math.cos(perpAngle) * swingAmount;
            bullet.y += Math.sin(perpAngle) * swingAmount;
        }
        
        // 追踪弹特殊效果：自动追踪
        if (bullet.isHoming) {
            // 找到最近的泡泡或BOSS
            let target = null;
            let minDist = Infinity;
            
            // 检查BOSS
            if (bubbleGame.boss) {
                const dist = Math.hypot(bullet.x - bubbleGame.boss.x, bullet.y - bubbleGame.boss.y);
                if (dist < minDist) {
                    minDist = dist;
                    target = bubbleGame.boss;
                }
            }
            
            // 检查泡泡
            for (const bubble of bubbleGame.bubbles) {
                const dist = Math.hypot(bullet.x - bubble.x, bullet.y - bubble.y);
                if (dist < minDist) {
                    minDist = dist;
                    target = bubble;
                }
            }
            
            // 如果找到目标，调整方向
            if (target) {
                const targetAngle = Math.atan2(target.y - bullet.y, target.x - bullet.x);
                const currentAngle = Math.atan2(bullet.vy, bullet.vx);
                
                // 平滑转向
                let angleDiff = targetAngle - currentAngle;
                // 标准化角度差
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                const turnSpeed = 0.1; // 转向速度
                const newAngle = currentAngle + angleDiff * turnSpeed;
                
                const speed = Math.hypot(bullet.vx, bullet.vy);
                bullet.vx = Math.cos(newAngle) * speed;
                bullet.vy = Math.sin(newAngle) * speed;
            }
        }
        
        // 龙卷弹特殊效果：飞行时显示旋转粒子
        if (bullet.isTornado) {
            // 创建龙卷视觉效果（飞行轨迹）
            if (Math.random() < 0.5) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 20;
                bubbleGame.particles.push({
                    x: bullet.x + Math.cos(angle) * distance,
                    y: bullet.y + Math.sin(angle) * distance,
                    vx: Math.cos(angle + Math.PI / 2) * 5,
                    vy: Math.sin(angle + Math.PI / 2) * 5,
                    life: 0.8,
                    decay: 0.05,
                    size: 8,
                    color: '#87CEEB',
                    type: 'tornado'
                });
            }
        }
        
        // 分身弹特殊效果：分裂
        if (bullet.isMulti && !bullet.hasSplit && Date.now() >= bullet.splitTime) {
            bullet.hasSplit = true;
            
            // 创建5个分身
            const currentAngle = Math.atan2(bullet.vy, bullet.vx);
            const speed = Math.hypot(bullet.vx, bullet.vy);
            
            for (let j = -2; j <= 2; j++) {
                const spreadAngle = currentAngle + (j * 0.15); // 扇形散开
                bubbleGame.bullets.push({
                    x: bullet.x,
                    y: bullet.y,
                    vx: Math.cos(spreadAngle) * speed,
                    vy: Math.sin(spreadAngle) * speed,
                    type: 'multi-split',
                    size: 12,
                    color: '#00CED1',
                    trail: []
                });
            }
            
            // 移除原子弹
            bubbleGame.bullets.splice(i, 1);
            continue;
        }
        
        // 更新位置
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // 弹跳弹碰壁反弹
        if (bullet.type === 'bounce' && bullet.bounceCount < bullet.maxBounces) {
            let bounced = false;
            
            // 左右边界
            if (bullet.x < bullet.size || bullet.x > canvas.width - bullet.size) {
                bullet.vx = -bullet.vx;
                bullet.x = Math.max(bullet.size, Math.min(canvas.width - bullet.size, bullet.x));
                bounced = true;
            }
            
            // 上下边界
            if (bullet.y < bullet.size || bullet.y > canvas.height - bullet.size) {
                bullet.vy = -bullet.vy;
                bullet.y = Math.max(bullet.size, Math.min(canvas.height - bullet.size, bullet.y));
                bounced = true;
            }
            
            if (bounced) {
                bullet.bounceCount++;
                createExplosion(bullet.x, bullet.y, 'bounce');
            }
        }
        
        // 绘制尾迹
        drawBulletTrail(ctx, bullet);
        
        // 绘制子弹
        drawBullet(ctx, bullet);
        
        // 检测与BOSS的碰撞
        if (bubbleGame.boss) {
            const boss = bubbleGame.boss;
            const dx = bullet.x - boss.x;
            const dy = bullet.y - boss.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < bullet.size + boss.size) {
                // 冰冻弹特殊处理：冻结BOSS（检查冰冻免疫）
                if (bullet.isFreeze) {
                    if (boss.traits && boss.traits.includes('freeze_immune')) {
                        // 冰冻免疫
                        showBossTraitPopup('免疫！🧊');
                        bubbleGame.bullets.splice(i, 1);
                        continue;
                    }
                    
                    boss.isFrozen = true;
                    boss.frozenUntil = Date.now() + bullet.freezeDuration;
                    boss.originalVx = boss.vx || 0;
                    boss.originalVy = boss.vy || 0;
                    boss.vx = boss.originalVx * 0.2; // 减速到20%
                    boss.vy = boss.originalVy * 0.2;
                    
                    createFreezeEffect(boss.x, boss.y, boss.size + 50);
                    bubbleGame.bullets.splice(i, 1);
                    continue;
                }
                
                let damage = 5;
                
                // 护盾特征：先打护盾
                if (boss.shield > 0) {
                    boss.shield -= damage;
                    if (boss.shield < 0) {
                        // 护盾破碎，剩余伤害打到HP
                        boss.hp += boss.shield; // shield是负数
                        boss.shield = 0;
                        showBossTraitPopup('护盾破碎！🛡️');
                    }
                } else {
                    // 没有护盾，直接扣血
                    boss.hp -= damage;
                }
                
                // 穿透弹：不消失
                if (bullet.isPierce) {
                    createExplosion(bullet.x, bullet.y, bullet.type);
                    // 不移除子弹
                } else {
                    // 其他子弹：消失
                    bubbleGame.bullets.splice(i, 1);
                    createExplosion(bullet.x, bullet.y, bullet.type);
                }
                
                // BOSS被击败
                if (boss.hp <= 0) {
                    createBossExplosion(boss.x, boss.y);
                    bubbleGame.boss = null;
                    
                    // 奖励积分
                    const bossBonus = 1000;
                    bubbleGame.score += bossBonus;
                    bubbleGame.totalScore += bossBonus;
                    saveTotalScore(bubbleGame.totalScore);
                    
                    showBossDefeatPopup();
                    checkWeaponUnlocks();
                    updateScore();
                    
                    // 3秒后重新生成BOSS
                    setTimeout(() => {
                        if (bubbleGame.isGameRunning) {
                            spawnBoss();
                        }
                    }, 3000);
                }
                
                continue;
            }
        }
        
        // 检测与普通泡泡的碰撞
        for (let j = bubbleGame.bubbles.length - 1; j >= 0; j--) {
            const bubble = bubbleGame.bubbles[j];
            const dx = bullet.x - bubble.x;
            const dy = bullet.y - bubble.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < bullet.size + bubble.size) {
                // 创建爆炸效果
                createExplosion(bubble.x, bubble.y, bullet.type);
                
                // 终极弹特殊处理
                if (bullet.isUltimate) {
                    triggerUltimateEffect(bullet.x, bullet.y);
                    bubbleGame.bullets.splice(i, 1);
                    break;
                }
                
                // 击中主目标
                const hitBubbles = [{ bubble: bubble, index: j }];
                let totalPoints = bullet.type === 'mega' ? 30 : bullet.type === 'super' ? 20 : 10;
                
                // 爆炸弹：范围爆炸（增强版）
                if (bullet.isExplosive) {
                    const explosionBubbles = findExplosionTargets(bubble, bubbleGame.bubbles, bullet.explosionRadius);
                    explosionBubbles.forEach(expBubble => {
                        hitBubbles.push(expBubble);
                        totalPoints += 15;
                    });
                    
                    // 创建超级爆炸效果
                    createMegaExplosion(bubble.x, bubble.y, bullet.explosionRadius);
                    
                    // 屏幕震动
                    shakeScreen(10, 500);
                }
                
                // 连锁弹：连锁反应（超大范围）
                if (bullet.isChain) {
                    const chainBubbles = findChainTargets(bubble, bubbleGame.bubbles, 400, bullet.maxChain);
                    chainBubbles.forEach(chainBubble => {
                        hitBubbles.push(chainBubble);
                        totalPoints += 10;
                        createLightning(bubble.x, bubble.y, chainBubble.bubble.x, chainBubble.bubble.y);
                    });
                }
                
                // 超级子弹：连锁闪电效果（超大范围）
                if (bullet.type === 'super') {
                    const chainBubbles = findChainTargets(bubble, bubbleGame.bubbles, 400, 3);
                    chainBubbles.forEach(chainBubble => {
                        hitBubbles.push(chainBubble);
                        totalPoints += 10;
                        // 创建闪电效果
                        createLightning(bubble.x, bubble.y, chainBubble.bubble.x, chainBubble.bubble.y);
                    });
                }
                
                // 穿透弹：不消失，继续飞行
                if (bullet.isPierce) {
                    bullet.pierceCount++;
                    createExplosion(bubble.x, bubble.y, 'pierce');
                    // 不移除子弹，让它继续穿透
                }
                
                // 冰冻弹：冻结周围泡泡（不打碎）
                if (bullet.isFreeze) {
                    // 冻结击中的泡泡
                    bubble.isFrozen = true;
                    bubble.frozenUntil = Date.now() + bullet.freezeDuration;
                    bubble.originalVy = bubble.vy;
                    bubble.vy *= 0.2; // 减速到20%
                    
                    // 冻结周围的泡泡
                    const freezeBubbles = findExplosionTargets(bubble, bubbleGame.bubbles, bullet.freezeRadius);
                    freezeBubbles.forEach(freezeBubble => {
                        freezeBubble.bubble.isFrozen = true;
                        freezeBubble.bubble.frozenUntil = Date.now() + bullet.freezeDuration;
                        freezeBubble.bubble.originalVy = freezeBubble.bubble.vy;
                        freezeBubble.bubble.vy *= 0.2; // 减速到20%
                    });
                    createFreezeEffect(bubble.x, bubble.y, bullet.freezeRadius);
                    
                    // 冰冻弹不打碎泡泡，从hitBubbles中移除主目标
                    hitBubbles.length = 0;
                }
                
                // 星爆弹：爆炸成8发子弹
                if (bullet.isStarburst) {
                    for (let k = 0; k < bullet.burstCount; k++) {
                        const angle = (Math.PI * 2 / bullet.burstCount) * k;
                        const speed = 12;
                        bubbleGame.bullets.push({
                            x: bubble.x,
                            y: bubble.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            type: 'starburst-mini',
                            size: 10,
                            color: '#FFD700',
                            trail: []
                        });
                    }
                    createStarburstEffect(bubble.x, bubble.y);
                }
                
                // 龙卷弹：吸引并摧毁周围泡泡
                if (bullet.isTornado) {
                    const tornadoBubbles = findExplosionTargets(bubble, bubbleGame.bubbles, bullet.pullRadius);
                    
                    // 先吸引泡泡（动画效果）
                    let pullFrames = 0;
                    const maxPullFrames = 30; // 吸引30帧（约0.5秒）
                    
                    const pullInterval = setInterval(() => {
                        pullFrames++;
                        
                        tornadoBubbles.forEach(tornadoBubble => {
                            if (tornadoBubble.bubble && bubbleGame.bubbles.includes(tornadoBubble.bubble)) {
                                const dx = bubble.x - tornadoBubble.bubble.x;
                                const dy = bubble.y - tornadoBubble.bubble.y;
                                const dist = Math.hypot(dx, dy);
                                
                                if (dist > 5) {
                                    // 吸引力随时间增强
                                    const pullForce = 5 * (pullFrames / maxPullFrames);
                                    tornadoBubble.bubble.x += (dx / dist) * pullForce;
                                    tornadoBubble.bubble.y += (dy / dist) * pullForce;
                                }
                            }
                        });
                        
                        // 创建吸引粒子效果
                        for (let k = 0; k < 3; k++) {
                            const angle = Math.random() * Math.PI * 2;
                            const distance = Math.random() * bullet.pullRadius;
                            bubbleGame.particles.push({
                                x: bubble.x + Math.cos(angle) * distance,
                                y: bubble.y + Math.sin(angle) * distance,
                                vx: -Math.cos(angle) * 8,
                                vy: -Math.sin(angle) * 8,
                                life: 0.5,
                                decay: 0.1,
                                size: 8,
                                color: '#87CEEB',
                                type: 'tornado'
                            });
                        }
                        
                        // 吸引完成后摧毁
                        if (pullFrames >= maxPullFrames) {
                            clearInterval(pullInterval);
                            
                            tornadoBubbles.forEach(tornadoBubble => {
                                if (tornadoBubble.bubble && bubbleGame.bubbles.includes(tornadoBubble.bubble)) {
                                    const idx = bubbleGame.bubbles.indexOf(tornadoBubble.bubble);
                                    if (idx !== -1) {
                                        createExplosion(tornadoBubble.bubble.x, tornadoBubble.bubble.y, 'tornado');
                                        bubbleGame.bubbles.splice(idx, 1);
                                        
                                        // 增加分数
                                        bubbleGame.score += 150;
                                        bubbleGame.totalScore += 150;
                                        saveTotalScore(bubbleGame.totalScore);
                                    }
                                }
                            });
                            
                            updateScore();
                            updateBubbleCount();
                        }
                    }, 16); // 约60fps
                    
                    createTornadoEffect(bubble.x, bubble.y, bullet.pullRadius);
                    
                    // 龙卷弹击中后不立即摧毁主目标，让吸引动画完成
                    // 主目标会在吸引完成后一起摧毁
                }
                
                // 超大子弹：爆炸范围效果
                if (bullet.type === 'mega') {
                    const explosionBubbles = findExplosionTargets(bubble, bubbleGame.bubbles, 100);
                    explosionBubbles.forEach(expBubble => {
                        hitBubbles.push(expBubble);
                        totalPoints += 15;
                    });
                    // 创建冲击波效果
                    createShockwave(bubble.x, bubble.y, 100);
                }
                
                // 移除所有击中的泡泡
                hitBubbles.sort((a, b) => b.index - a.index);
                hitBubbles.forEach(hit => {
                    if (hit.index < bubbleGame.bubbles.length) {
                        createExplosion(hit.bubble.x, hit.bubble.y, bullet.type);
                        bubbleGame.bubbles.splice(hit.index, 1);
                    }
                });
                
                // 移除子弹（弹跳弹、超大子弹、穿透弹除外）
                // 穿透弹不消失，继续穿透
                // 龙卷弹击中后消失（触发吸引动画）
                if (bullet.isPierce) {
                    // 穿透弹不移除，继续飞行
                } else if (bullet.type !== 'bounce' && bullet.type !== 'mega' && bullet.type !== 'homing') {
                    bubbleGame.bullets.splice(i, 1);
                } else if (bullet.type === 'homing') {
                    // 追踪弹击中后也消失
                    bubbleGame.bullets.splice(i, 1);
                }
                
                // 增加分数和连击
                bubbleGame.combo++;
                bubbleGame.bubblesDestroyed += hitBubbles.length; // 增加泡泡计数
                
                if (bubbleGame.combo > bubbleGame.maxCombo) {
                    bubbleGame.maxCombo = bubbleGame.combo;
                }
                
                // 计算得分：基础分 + 连击奖励
                const bubbleCount = hitBubbles.length;
                const basePoints = bubbleCount * 100; // 每个泡泡100分
                const comboBonus = bubbleGame.combo * 50; // 每连击额外50分
                const totalEarned = basePoints + comboBonus;
                
                bubbleGame.score += totalEarned;
                bubbleGame.totalScore += totalEarned;
                saveTotalScore(bubbleGame.totalScore);
                
                // BOSS现在开局就出现，不需要计数触发
                // if (bubbleGame.bubblesDestroyed >= 15 && !bubbleGame.boss) {
                //     spawnBoss();
                // }
                
                // 检查是否解锁新武器
                checkWeaponUnlocks();
                
                updateScore();
                updateBubbleCount();
                
                // 显示连击提示
                if (bubbleGame.combo >= 5 && bubbleGame.combo % 5 === 0) {
                    showComboPopup();
                }
                
                break;
            }
        }
        
        // 移除超出屏幕的子弹（不清零连击）
        // 弹跳弹在反弹次数用完后才移除
        if (bullet.type === 'bounce') {
            if (bullet.bounceCount >= bullet.maxBounces) {
                bubbleGame.bullets.splice(i, 1);
            }
        } else {
            if (bullet.y < -50 || bullet.x < -50 || bullet.x > canvas.width + 50) {
                bubbleGame.bullets.splice(i, 1);
            }
        }
    }
    
    // 最后绘制闪电效果（确保在所有元素之上）
    drawLightningEffects(ctx);
    
    // 检查游戏结束条件
    if (bubbleGame.bubbles.length === 0 && bubbleGame.bullets.length === 0) {
        // 可以继续游戏
    }
    
    bubbleGame.animationId = requestAnimationFrame(gameLoop);
}

// 更新分数显示
function updateScore() {
    document.getElementById('bubble-score').textContent = Math.floor(bubbleGame.score);
    document.getElementById('bubble-combo').textContent = bubbleGame.combo;
    updateGameTotalScore();
}

// 更新升级进度
function updateUpgradeProgress() {
    const combo = bubbleGame.combo;
    const progressFill = document.getElementById('progress-fill');
    const upgradeCombo = document.getElementById('upgrade-combo');
    
    // 计算进度百分比
    let progress = 0;
    let nextLevel = 5;
    let currentLevel = 'normal';
    
    if (combo >= 10) {
        progress = 100;
        nextLevel = 10;
        currentLevel = 'mega';
        upgradeCombo.textContent = `${combo} 连击 - 终极模式！`;
    } else if (combo >= 5) {
        progress = 50 + ((combo - 5) / 5) * 50;
        nextLevel = 10;
        currentLevel = 'super';
        upgradeCombo.textContent = `${combo}/10 连击`;
    } else {
        progress = (combo / 5) * 50;
        nextLevel = 5;
        currentLevel = 'normal';
        upgradeCombo.textContent = `${combo}/5 连击`;
    }
    
    progressFill.style.width = progress + '%';
    progressFill.className = 'progress-fill ' + currentLevel;
    
    // 更新等级标记
    document.querySelectorAll('.level-marker').forEach(marker => {
        const level = parseInt(marker.dataset.level);
        if (combo >= level) {
            marker.classList.add('active');
        } else {
            marker.classList.remove('active');
        }
    });
}

// 更新泡泡数量显示
function updateBubbleCount() {
    document.getElementById('bubble-remaining').textContent = bubbleGame.bubbles.length;
}

// 显示连击提示
function showComboPopup() {
    const popup = document.createElement('div');
    popup.className = 'combo-popup';
    popup.textContent = `${bubbleGame.combo} COMBO!`;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 1000);
}

// 检查武器解锁
function checkWeaponUnlocks() {
    const savedUnlocks = JSON.parse(localStorage.getItem('unlockedWeapons') || '{}');
    let hasNewUnlock = false;
    
    for (const [key, weapon] of Object.entries(weaponUnlocks)) {
        const wasUnlocked = savedUnlocks[key];
        const isNowUnlocked = bubbleGame.totalScore >= weapon.score;
        
        if (isNowUnlocked && !wasUnlocked) {
            // 新解锁
            savedUnlocks[key] = true;
            localStorage.setItem('unlockedWeapons', JSON.stringify(savedUnlocks));
            showWeaponUnlockPopup(weapon);
            hasNewUnlock = true;
        }
    }
    
    // 如果有新解锁，刷新武器选择器
    if (hasNewUnlock) {
        loadGameWeaponSelector();
    }
}

// 显示武器解锁提示
function showWeaponUnlockPopup(weapon) {
    const popup = document.createElement('div');
    popup.className = 'weapon-unlock-popup';
    popup.innerHTML = `
        <div class="unlock-icon">${weapon.icon}</div>
        <div class="unlock-text">解锁新武器！</div>
        <div class="unlock-name">${weapon.name}</div>
        <div class="unlock-desc">${weapon.description}</div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 3000);
}

// 显示升级提示
function showUpgradePopup(name, icon) {
    const popup = document.createElement('div');
    popup.className = 'upgrade-popup';
    popup.innerHTML = `
        <div class="upgrade-icon">${icon}</div>
        <div class="upgrade-text">升级！</div>
        <div class="upgrade-name">${name}</div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 2000);
}

// 退出游戏
function exitBubbleGame() {
    if (confirm('确定要退出游戏吗？')) {
        bubbleGame.isGameRunning = false;
        if (bubbleGame.animationId) {
            cancelAnimationFrame(bubbleGame.animationId);
        }
        
        // 移除事件监听器
        if (bubbleGame.canvas) {
            bubbleGame.canvas.removeEventListener('mousemove', handleCanvasMouseMove);
            bubbleGame.canvas.removeEventListener('click', handleCanvasClick);
            bubbleGame.canvas.removeEventListener('touchmove', handleCanvasTouchMove);
            bubbleGame.canvas.removeEventListener('touchstart', handleCanvasTouchStart);
        }
        
        showBubbleResult();
    }
}

// 显示游戏结果
function showBubbleResult() {
    const resultContent = document.getElementById('bubble-result-content');
    
    resultContent.innerHTML = `
        <div class="score">
            <div>🎮 游戏结束！</div>
            <div>最终得分: ${Math.floor(bubbleGame.score)}</div>
        </div>
        <div class="result-item">
            <div><strong>单词本:</strong> ${bubbleGame.wordbookName}</div>
        </div>
        <div class="result-item">
            <div><strong>最高连击:</strong> ${bubbleGame.maxCombo} 连击</div>
        </div>
        <div class="result-item">
            <div><strong>击破泡泡:</strong> 计算中...</div>
        </div>
    `;
    
    showPage('bubble-result');
}

// 重新开始游戏
function restartBubbleGame() {
    showPage('bubble-wordbook-list');
}

// 加载兵器库
function loadArsenal() {
    bubbleGame.totalScore = loadTotalScore();
    document.getElementById('arsenal-total-score').textContent = bubbleGame.totalScore;
    
    const container = document.getElementById('arsenal-container');
    container.innerHTML = '';
    
    for (const [key, weapon] of Object.entries(weaponUnlocks)) {
        const isUnlocked = bubbleGame.totalScore >= weapon.score;
        const isSelected = bubbleGame.selectedWeapon === key;
        
        const card = document.createElement('div');
        card.className = `weapon-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`;
        
        if (isUnlocked) {
            card.onclick = () => selectWeapon(key);
        }
        
        card.innerHTML = `
            <div class="weapon-status ${isSelected ? 'selected' : isUnlocked ? 'unlocked' : 'locked'}">
                ${isSelected ? '使用中' : isUnlocked ? '已解锁' : '未解锁'}
            </div>
            <div class="weapon-icon">${weapon.icon}</div>
            <div class="weapon-name">${weapon.name}</div>
            <div class="weapon-desc">${weapon.description}</div>
            <div class="weapon-score">${isUnlocked ? '已解锁' : `需要 ${weapon.score} 积分`}</div>
        `;
        
        container.appendChild(card);
    }
}

// 选择武器
function selectWeapon(weaponKey) {
    bubbleGame.selectedWeapon = weaponKey;
    
    // 更新炮台数量
    if (weaponKey === 'cannon3') {
        bubbleGame.cannonCount = 3;
    } else if (weaponKey === 'cannon2') {
        bubbleGame.cannonCount = 2;
    } else {
        bubbleGame.cannonCount = 1;
    }
    
    loadArsenal();
    alert(`已选择: ${weaponUnlocks[weaponKey].name}`);
}

// 加载游戏内武器选择器
function loadGameWeaponSelector() {
    const container = document.getElementById('weapon-selector-content');
    container.innerHTML = '';
    
    for (const [key, weapon] of Object.entries(weaponUnlocks)) {
        const isUnlocked = bubbleGame.totalScore >= weapon.score;
        let isSelected = false;
        
        if (weapon.type === 'bullet') {
            isSelected = bubbleGame.selectedWeapon === key;
        } else if (weapon.type === 'cannon') {
            isSelected = bubbleGame.selectedCannon === key;
        }
        
        const btn = document.createElement('div');
        btn.className = `weapon-btn ${isUnlocked ? '' : 'locked'} ${isSelected ? 'selected' : ''}`;
        
        if (isUnlocked) {
            btn.onclick = () => selectGameWeapon(key);
        }
        
        btn.innerHTML = `
            ${isSelected ? '<div class="weapon-btn-badge">✓</div>' : ''}
            <div class="weapon-btn-icon">${weapon.icon}</div>
            <div class="weapon-btn-name">${weapon.name}</div>
        `;
        
        container.appendChild(btn);
    }
}

// 在游戏中选择武器
function selectGameWeapon(weaponKey) {
    const weapon = weaponUnlocks[weaponKey];
    const isUnlocked = bubbleGame.totalScore >= weapon.score;
    
    if (!isUnlocked) {
        alert(`需要 ${weapon.score} 积分才能解锁此武器！`);
        return;
    }
    
    // 根据类型选择
    if (weapon.type === 'bullet') {
        bubbleGame.selectedWeapon = weaponKey;
    } else if (weapon.type === 'cannon') {
        bubbleGame.selectedCannon = weaponKey;
    }
    
    // 重新加载武器选择器
    loadGameWeaponSelector();
    
    // 更新炮台显示
    updateCannonDisplay();
    
    // 显示提示
    showWeaponChangeNotification(weapon);
}

// 显示武器切换通知
function showWeaponChangeNotification(weapon) {
    const notification = document.createElement('div');
    notification.className = 'weapon-change-notification';
    notification.innerHTML = `
        <span class="notification-icon">${weapon.icon}</span>
        <span class="notification-text">已切换: ${weapon.name}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// 切换武器选择器显示/隐藏
function toggleWeaponSelector() {
    const content = document.getElementById('weapon-selector-content');
    const button = document.querySelector('.toggle-selector');
    
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        button.textContent = '▼';
    } else {
        content.classList.add('open');
        button.textContent = '▲';
    }
}

// 更新游戏中的总积分显示
function updateGameTotalScore() {
    document.getElementById('game-total-score').textContent = bubbleGame.totalScore;
}

// 修改页面切换函数，添加泡泡大战列表加载
const originalShowPage = showPage;
showPage = function(pageId) {
    originalShowPage(pageId);
    
    if (pageId === 'bubble-wordbook-list') {
        loadBubbleWordbookList();
        // 更新总积分显示
        bubbleGame.totalScore = loadTotalScore();
        document.getElementById('total-score-display').textContent = bubbleGame.totalScore;
    } else if (pageId === 'arsenal') {
        loadArsenal();
    }
};
