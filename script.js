/* =========================================
   基本設定・状態管理
   ========================================= */
let settings = {
    clockFont: "'UD Shin Go', sans-serif",
    tickerFont: "'UD Shin Go', sans-serif",
    tickerColor: "#ffffff",
    tickerStrokeColor: "#000000",
    tickerStrokeWidth: 7,
    cameras: [{ url: "https://www.youtube.com/embed/dfVK7ld38Ys", location: "サンプル映像" }]
};

const bc = new BroadcastChannel('sokuho_channel');
let currentPlayer;
let currentCameraIndex = 0;
let isTourActive = true; 
let tourInterval;
let lastSokuhoTitle = ""; // NHK速報の重複チェック用

/* =========================================
   初期化処理
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateStyles();
    updateClock();
    setInterval(updateClock, 1000);

    // キーボードイベントの登録
    window.addEventListener('keydown', handleKeyDown);

    // NHK速報の定期チェック開始 (1分おき)
    fetchNHKSokuho();
    setInterval(fetchNHKSokuho, 60000);

    // ブラウザの音声ブロック解除用
    document.body.addEventListener('click', () => {
        const audio = document.getElementById('sokuho-audio');
        if (audio) {
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
            }).catch(() => {});
        }
    }, { once: true });
});

/* =========================================
   NHKニュース速報 自動取得
   ========================================= */
async function fetchNHKSokuho() {
    const targetUrl = 'https://news.web.nhk/n-data/conf/na/rss/cat0.xml'; 

    try {
        const response = await fetch(targetUrl); 
        if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const item = xmlDoc.querySelector("item");
        if (item) {
            const title = item.querySelector("title").textContent;
            console.log("RSSチェック中...", title);

            if (title !== lastSokuhoTitle) {
                playSokuhoSound();
                showNews(title);
                lastSokuhoTitle = title;
            }
        }
    } catch (error) {
        showInfoMessage(`RSS取得エラー: ${error.message}`);
    }
}

/* =========================================
   操作・イベント処理
   ========================================= */
bc.onmessage = (event) => {
    if (event.data.type === 'TEST_SOKUHO') {
        playSokuhoSound();
        showNews(event.data.text);
    }
};

function handleKeyDown(e) {
    if (e.keyCode >= 48 && e.keyCode <= 57) {
        let num = e.keyCode - 48;
        let index = num === 0 ? 9 : num - 1; 
        switchCameraDirectly(index);
    }
    if (e.key.toLowerCase() === 's') {
        toggleTour();
    }
    // Nキーで下部ニュースを手動表示（テスト用）
    if (e.key.toLowerCase() === 'n') {
        updateBottomNews();
    }
}

/* =========================================
   カメラ制御機能
   ========================================= */
function switchCameraDirectly(index) {
    if (settings.cameras[index] && settings.cameras[index].url) {
        currentCameraIndex = index;
        const nextId = extractVideoId(settings.cameras[index].url);
        if (nextId && currentPlayer && currentPlayer.loadVideoById) {
            currentPlayer.loadVideoById(nextId);
            updateCameraDisplay();
            showInfoMessage(`カメラ ${index + 1}: ${settings.cameras[index].location}`);
        }
    } else {
        showInfoMessage(`キー ${index + 1} にはカメラが設定されていません`);
    }
}

function toggleTour() {
    isTourActive = !isTourActive;
    const statusLabel = document.getElementById('tour-status');
    if (isTourActive) {
        statusLabel.innerText = "巡回: ON";
        statusLabel.classList.remove('tour-off');
        startTour();
        showInfoMessage("自動巡回を開始しました");
    } else {
        statusLabel.innerText = "巡回: OFF";
        statusLabel.classList.add('tour-off');
        stopTour();
        showInfoMessage("自動巡回を停止しました");
    }
}

function startTour() {
    stopTour();
    tourInterval = setInterval(switchNextCamera, 180000); 
}

function stopTour() {
    clearInterval(tourInterval);
}

function switchNextCamera() {
    if (!isTourActive || settings.cameras.length <= 1) return;
    currentCameraIndex = (currentCameraIndex + 1) % settings.cameras.length;
    const nextId = extractVideoId(settings.cameras[currentCameraIndex].url);
    if (nextId && currentPlayer.loadVideoById) {
        currentPlayer.loadVideoById(nextId);
        updateCameraDisplay();
    }
}

/* =========================================
   表示更新・ユーティリティ
   ========================================= */
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock-display').innerHTML = `${h}<span class="colon">：</span>${m}`;
}

function showNews(text) {
    const container = document.getElementById('ticker-container');
    document.getElementById('ticker-content').innerHTML = text;
    container.classList.remove('hidden');
    if (window.sokuhoTimeout) clearTimeout(window.sokuhoTimeout);
    window.sokuhoTimeout = setTimeout(() => { container.classList.add('hidden'); }, 30000);
}

function playSokuhoSound() {
    const audio = document.getElementById('sokuho-audio');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

function showInfoMessage(text) {
    const container = document.getElementById('error-container');
    const div = document.createElement('div');
    div.className = 'info-msg';
    div.innerText = text;
    container.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

function loadSettings() {
    const saved = localStorage.getItem('sokuhoSettings');
    if (saved) settings = JSON.parse(saved);
}

function updateStyles() {
    const infoBox = document.getElementById('info-box');
    const tickerContent = document.getElementById('ticker-content');
    if (!infoBox || !tickerContent) return;
    infoBox.style.fontFamily = settings.clockFont;
    tickerContent.style.fontFamily = settings.tickerFont;
    tickerContent.style.color = settings.tickerColor;
    tickerContent.style.webkitTextStrokeWidth = (settings.tickerStrokeWidth || 7) + "px";
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
    if (url.includes('youtube.com/embed/')) return url.split('embed/')[1].split('?')[0];
    if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0];
}

/* =========================================
   YouTube Player API 連携
   ========================================= */
window.onYouTubeIframeAPIReady = function() {
    try {
        const firstId = settings.cameras[0] ? extractVideoId(settings.cameras[0].url) : 'dfVK7ld38Ys';
        currentPlayer = new YT.Player('player', {
            videoId: firstId,
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

/* =========================================
   ページ読み込み完了時の演出
   ========================================= */
window.addEventListener('load', () => {
    const bootCard = document.getElementById('boot-card');
    if (bootCard) {
        setTimeout(() => {
            bootCard.classList.remove('boot-hidden');
            bootCard.classList.add('boot-visible');
            setTimeout(() => {
                bootCard.classList.remove('boot-visible');
                bootCard.classList.add('boot-hidden');
            }, 3000);
        }, 500);
    }
    
    // 起動から10秒後に自動で「主なニュース」を表示
    setTimeout(updateBottomNews, 10000);
});

/* 緊急地震速報 */
const WOLFX_EEW_API = "https://api.wolfx.jp/jma_eew.json";
let lastEEWEventID = "";
let lastEEWSerial = -1;

const eewAudio = new Audio('assets/audio/earthquake-ad.mp3');

async function checkWolfxEEW() {
    try {
        const response = await fetch(WOLFX_EEW_API);
        const data = await response.json();

        // 1. 取消報のチェック
        if (data.isCancel) {
            showEEWCancel();
            return;
        }

        // 2. 警報かつ新しい更新があるかチェック
        if (data.isWarn && (data.EventID !== lastEEWEventID || data.Serial > lastEEWSerial)) {
            lastEEWEventID = data.EventID;
            lastEEWSerial = data.Serial;
            displayWolfxEEW(data);
        }
    } catch (e) {
        console.error("Wolfx EEW取得エラー:", e);
    }
}

function displayWolfxEEW(data) {
    const superEl = document.getElementById('eew-super');
    const areaEl = document.getElementById('eew-areas-text');

    // 地域名の整形
    areaEl.innerText = data.WarnArea ? data.WarnArea.Chiiki : "調査中";

    // 音声再生
    eewAudio.currentTime = 0;
    eewAudio.play().catch(e => console.log("音声再生ブロック:", e));

    // 表示
    superEl.classList.remove('hidden');

    // 警報は状況が刻々と変わるため、自動で消すのは「最終報」が出てから3分後、
    // または一定時間（例：5分）動きがなかった場合にするのが安全です。
    clearTimeout(window.eewTimer);
    window.eewTimer = setTimeout(() => {
        superEl.classList.add('hidden');
    }, 300000); // 5分保持
}

function showEEWCancel() {
    const cancelEl = document.getElementById('eew-cancel-super');
    const superEl = document.getElementById('eew-super');

    superEl.classList.add('hidden'); // 通常のEEWを隠す
    cancelEl.classList.remove('hidden');

    setTimeout(() => {
        cancelEl.classList.add('hidden');
    }, 10000); // 取消報は10秒で消す
}

// 2秒間隔でチェック
setInterval(checkWolfxEEW, 2000);

/* --- テスト用 --- */
window.testWolfxEEW = function() {
    const dummy = {
        isWarn: true,
        WarnArea: { Chiiki: "愛知東部　愛知西部　静岡西部　長野南部" }
    };
    displayWolfxEEW(dummy);
};

window.testWolfxCancel = function() {
    showEEWCancel();
};
