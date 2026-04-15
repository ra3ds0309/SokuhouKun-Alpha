let settings = {
    clockFont: "'UD Shin Go', sans-serif",
    tickerFont: "'UD Shin Go', sans-serif",
    tickerColor: "#ffffff",
    tickerStrokeColor: "#000000",
    tickerStrokeWidth: 7,
    cameras: []
};

const bc = new BroadcastChannel('sokuho_channel');
let currentPlayer;
let currentCameraIndex = 0;
let isTourActive = true; // 自動巡回のフラグ
let tourInterval; // インターバル保持用

bc.onmessage = (event) => {
    if (event.data.type === 'TEST_SOKUHO') {
        const audio = document.getElementById('sokuho-audio');
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
        showNews(event.data.text);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateStyles();
    updateClock();
    setInterval(updateClock, 1000);

    // キーボードイベントの登録
    window.addEventListener('keydown', handleKeyDown);

    document.body.addEventListener('click', () => {
        const audio = document.getElementById('sokuho-audio');
        audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
    }, { once: true });
});

// キーボード操作の処理
function handleKeyDown(e) {
    // 数字キー 1-9 (keyCode 49-57) と 0 (keyCode 48)
    if (e.keyCode >= 48 && e.keyCode <= 57) {
        // 1-9はそのまま、0は10番目のカメラとして扱う
        let num = e.keyCode - 48;
        let index = num === 0 ? 9 : num - 1; 
        
        switchCameraDirectly(index);
    }
    
    // 「S」キーなどで巡回ON/OFFを切り替えるオプション（任意）
    if (e.key.toLowerCase() === 's') {
        toggleTour();
    }
}

// カメラを直接切り替える
function switchCameraDirectly(index) {
    if (settings.cameras[index] && settings.cameras[index].url) {
        currentCameraIndex = index;
        const nextId = extractVideoId(settings.cameras[index].url);
        if (nextId && currentPlayer && currentPlayer.loadVideoById) {
            currentPlayer.loadVideoById(nextId);
            updateCameraDisplay();
            showInfoMessage(`カメラ ${index + 1}: ${settings.cameras[index].location} に切り替えました`);
        }
    } else {
        showInfoMessage(`キー ${index + 1} にはライブカメラが設定されていません`);
    }
}

// 巡回機能のON/OFF
function toggleTour() {
    isTourActive = !isTourActive;
    const statusLabel = document.getElementById('tour-status');
    
    if (isTourActive) {
        statusLabel.innerText = "巡回: ON";
        statusLabel.classList.remove('tour-off');
        startTour();
        showInfoMessage("自動巡回を開始しました（3分ごと）");
    } else {
        statusLabel.innerText = "巡回: OFF";
        statusLabel.classList.add('tour-off');
        stopTour();
        showInfoMessage("自動巡回を停止しました");
    }
}

function startTour() {
    stopTour();
    tourInterval = setInterval(switchNextCamera, 180000); // 3分
}

function stopTour() {
    clearInterval(tourInterval);
}

// メッセージ表示用（エラーコンテナを汎用的に利用）
function showInfoMessage(text) {
    const container = document.getElementById('error-container');
    const div = document.createElement('div');
    div.className = 'info-msg';
    div.innerText = text;
    container.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

window.onYouTubeIframeAPIReady = function() {
    try {
        const firstCam = settings.cameras[0]?.url ? extractVideoId(settings.cameras[0].url) : 'dfVK7ld38Ys';
        currentPlayer = new YT.Player('player', {
            videoId: firstCam,
            playerVars: { 'autoplay': 1, 'mute': 1, 'controls': 0, 'rel': 0, 'origin': location.origin },
            events: {
                'onReady': (e) => { 
                    e.target.playVideo(); 
                    updateCameraDisplay(); 
                    if (isTourActive) startTour();
                }
            }
        });
    } catch (e) { console.error("YT Init Error"); }
};

// 以降、extractVideoId, updateClock, loadSettings, updateStyles 等は前回と同じ
function switchNextCamera() {
    if (!isTourActive || settings.cameras.length <= 1) return;
    currentCameraIndex = (currentCameraIndex + 1) % settings.cameras.length;
    switchCameraDirectly(currentCameraIndex);
}

function updateClock() {
    const now = new Date();
    document.getElementById('clock-display').innerHTML = 
        `${String(now.getHours()).padStart(2, '0')}<span class="colon">：</span>${String(now.getMinutes()).padStart(2, '0')}`;
}

function loadSettings() {
    const saved = localStorage.getItem('sokuhoSettings');
    if (saved) settings = JSON.parse(saved);
}

function updateStyles() {
    const infoBox = document.getElementById('info-box');
    const tickerContent = document.getElementById('ticker-content');
    infoBox.style.fontFamily = settings.clockFont;
    tickerContent.style.fontFamily = settings.tickerFont;
    tickerContent.style.color = settings.tickerColor;
    tickerContent.style.webkitTextStrokeWidth = settings.tickerStrokeWidth + "px";
    tickerContent.style.webkitTextStrokeColor = settings.tickerStrokeColor;
}

function updateCameraDisplay() {
    const cam = settings.cameras[currentCameraIndex];
    if (cam) {
        document.getElementById('camera-location').innerText = cam.location || "---";
        document.getElementById('camera-url-display').innerText = cam.url;
    }
}

function extractVideoId(url) {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0];
}

function showNews(text) {
    const container = document.getElementById('ticker-container');
    document.getElementById('ticker-content').innerHTML = text;
    container.classList.remove('hidden');
    if (window.sokuhoTimeout) clearTimeout(window.sokuhoTimeout);
    window.sokuhoTimeout = setTimeout(() => { container.classList.add('hidden'); }, 30000);
}
