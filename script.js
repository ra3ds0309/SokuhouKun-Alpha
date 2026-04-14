// --- 初期設定 ---
let settings = {
    font: "'UD Shin Go', sans-serif",
    textColor: "#ffffff",
    strokeColor: "#000000",
    strokeWidth: "4",
    cameras: [
        { url: "https://www.youtube.com/embed/dfVK7ld38Ys", location: "サンプル映像" }
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
    const videoId = extractVideoId(firstCam.url);
    
    currentPlayer = new YT.Player('player', {
        videoId: videoId || 'dfVK7ld38Ys',
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
    const nextId = extractVideoId(nextCam.url);
    if (nextId) {
        currentPlayer.loadVideoById(nextId);
        updateCameraDisplay();
    }
}

// --- 3. 速報表示 ---
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
        console.log("NHK速報取得エラー");
    }
}

function showNews(text) {
    const container = document.getElementById('ticker-container');
    const content = document.getElementById('ticker-content');
    content.innerText = text;
    container.classList.remove('hidden');
    setTimeout(() => { container.classList.add('hidden'); }, 30000);
}

// --- 4. 設定管理 ---
function createCameraInputs() {
    const container = document.getElementById('camera-inputs');
    container.innerHTML = "";
    for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.className = "cam-input-row";
        const cam = settings.cameras[i] || { url: "", location: "" };
        div.innerHTML = `
            <input type="text" placeholder="場所名" class="cam-loc" value="${cam.location}" style="width: 120px;">
            <input type="text" placeholder='<iframe>タグをここに貼り付け' class="cam-url" value='${cam.url}' style="flex-grow: 1;">
        `;
        container.appendChild(div);
    }
}

document.getElementById('save-settings').addEventListener('click', () => {
    // 保存前にキーの状態を強制リセット（リロード後の即再表示を防ぐ）
    keysPressed = {};
    localStorage.removeItem('keysPressed'); 

    settings.font = document.getElementById('font-select').value;
    settings.textColor = document.getElementById('text-color').value;
    settings.strokeColor = document.getElementById('stroke-color').value;
    settings.strokeWidth = document.getElementById('stroke-width').value;

    const urls = document.getElementsByClassName('cam-url');
    const locs = document.getElementsByClassName('cam-loc');
    settings.cameras = [];
    for (let i = 0; i < urls.length; i++) {
        let rawValue = urls[i].value.trim();
        if (rawValue !== "") {
            // iframeタグからsrc属性だけを抜き出す
            if (rawValue.includes("<iframe")) {
                const match = rawValue.match(/src=["'](.+?)["']/);
                if (match) rawValue = match[1];
            }
            settings.cameras.push({ url: rawValue, location: locs[i].value });
        }
    }

    localStorage.setItem('sokuhoSettings', JSON.stringify(settings));
    
    // 設定を保存したら必ずリロードして初期化
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

// 埋め込みURLからIDを抽出
function extractVideoId(url) {
    if (!url) return null;
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.split('?')[0];
}
