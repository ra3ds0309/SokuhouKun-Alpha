// --- 初期設定 ---
let settings = {
    font: "'UD Shin Go', sans-serif",
    textColor: "#ffffff",
    strokeColor: "#000000",
    strokeWidth: "4",
    cameras: [
        { url: "https://www.youtube.com/embed/dQw4w9WgXcQ", location: "サンプル" }
    ]
};

let currentPlayer;
let currentCameraIndex = 0;
let keysPressed = {};

// --- 1. 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    createCameraInputs();
    updateStyles();
    
    // キー入力判定 (s + t)
    document.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;
        if (keysPressed['s'] && keysPressed['t']) {
            document.getElementById('settings-modal').classList.remove('modal-hidden');
        }
    });
    document.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    // テスト送信ボタン
    document.getElementById('btn-test').addEventListener('click', () => {
        const text = document.getElementById('test-text').value;
        if(text) showNews(text);
    });

    fetchNHK();
    setInterval(fetchNHK, 300000);
});

// --- 2. YouTube Iframe API ---
function onYouTubeIframeAPIReady() {
    const firstCam = settings.cameras[0] || {url: ""};
    const videoId = extractVideoIdFromEmbed(firstCam.url) || 'dQw4w9WgXcQ';
    
    currentPlayer = new YT.Player('player', {
        videoId: videoId,
        playerVars: {
            'autoplay': 1, 'mute': 1, 'controls': 0,
            'rel': 0, 'modestbranding': 1, 'iv_load_policy': 3
        },
        events: { 'onReady': onPlayerReady }
    });
}

function onPlayerReady(event) {
    event.target.playVideo();
    updateCameraDisplay();
    setInterval(switchNextCamera, 180000); // 3分おき
}

function switchNextCamera() {
    if (settings.cameras.length === 0) return;
    currentCameraIndex = (currentCameraIndex + 1) % settings.cameras.length;
    const nextCam = settings.cameras[currentCameraIndex];
    const nextId = extractVideoIdFromEmbed(nextCam.url);
    if (nextId) {
        currentPlayer.loadVideoById(nextId);
        updateCameraDisplay();
    }
}

// --- 3. 速報表示ロジック ---
async function fetchNHK() {
    try {
        const response = await fetch('https://api.web.nhk/sokuho/news/sokuho_news.xml');
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const item = xmlDoc.getElementsByTagName("item")[0];
        if (item) {
            showNews(item.getElementsByTagName("title")[0].textContent);
        }
    } catch (e) {
        console.log("NHK速報の自動取得制限中");
    }
}

function showNews(text) {
    const container = document.getElementById('ticker-container');
    const content = document.getElementById('ticker-content');
    content.innerText = text;
    container.classList.remove('hidden');
    // 30秒後に隠す
    setTimeout(() => { container.classList.add('hidden'); }, 30000);
}

// --- 4. 設定管理 ---
function createCameraInputs() {
    const container = document.getElementById('camera-inputs');
    container.innerHTML = "";
    for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        const cam = settings.cameras[i] || { url: "", location: "" };
        div.style.marginBottom = "8px";
        div.innerHTML = `
            <input type="text" placeholder="場所" class="cam-loc" value="${cam.location}" style="width: 80px;">
            <input type="text" placeholder="埋め込みURLを入力" class="cam-url" value="${cam.url}" style="width: 250px;">
        `;
        container.appendChild(div);
    }
}

document.getElementById('save-settings').addEventListener('click', () => {
    keysPressed = {}; 
    settings.font = document.getElementById('font-select').value;
    settings.textColor = document.getElementById('text-color').value;
    settings.strokeColor = document.getElementById('stroke-color').value;
    settings.strokeWidth = document.getElementById('stroke-width').value;

    const urls = document.getElementsByClassName('cam-url');
    const locs = document.getElementsByClassName('cam-loc');
    settings.cameras = [];
    for (let i = 0; i < urls.length; i++) {
        if (urls[i].value.trim() !== "") {
            settings.cameras.push({ url: urls[i].value, location: locs[i].value });
        }
    }

    localStorage.setItem('sokuhoSettings', JSON.stringify(settings));
    location.reload(); 
});

function loadSettings() {
    const saved = localStorage.getItem('sokuhoSettings');
    if (saved) {
        settings = JSON.parse(saved);
        document.getElementById('font-select').value = settings.font;
        document.getElementById('text-color').value = settings.textColor;
        document.getElementById('stroke-color').value = settings.strokeColor;
        document.getElementById('stroke-width').value = settings.strokeWidth;
    }
}

function updateStyles() {
    const ticker = document.getElementById('ticker-content');
    ticker.style.fontFamily = settings.font;
    ticker.style.color = settings.textColor;
    ticker.style.webkitTextStroke = `${settings.strokeWidth}px ${settings.strokeColor}`;
}

function updateCameraDisplay() {
    const cam = settings.cameras[currentCameraIndex];
    if (cam) {
        document.getElementById('camera-location').innerText = cam.location || "---";
        document.getElementById('camera-url-display').innerText = cam.url;
    }
}

// 埋め込み用URL (https://www.youtube.com/embed/VIDEO_ID) からIDを抽出
function extractVideoIdFromEmbed(url) {
    if (!url) return null;
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    // クエリパラメータ (?enablejsapi=1 等) がある場合を除去
    return lastPart.split('?')[0];
}
