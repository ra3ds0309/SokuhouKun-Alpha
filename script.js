// --- 設定の初期値 ---
let settings = {
    font: "'UD Shin Go', sans-serif",
    textColor: "#ffffff",
    strokeColor: "#000000",
    strokeWidth: "4",
    cameras: [
        { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", location: "サンプルカメラ" }
    ]
};

let currentPlayer;
let currentCameraIndex = 0;
let keysPressed = {};

// --- 1. 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    createCameraInputs();
    updateStyles();
    
    // キー判定
    document.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;
        // s と t が押されたら設定画面を表示
        if (keysPressed['s'] && keysPressed['t']) {
            document.getElementById('settings-modal').classList.remove('modal-hidden');
        }
    });

    document.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    fetchNHK();
    setInterval(fetchNHK, 300000);
});

// --- 2. YouTube Iframe API 制御 ---
function onYouTubeIframeAPIReady() {
    const firstCam = settings.cameras[0] || {url: ""};
    const videoId = extractVideoId(firstCam.url);
    
    currentPlayer = new YT.Player('player', {
        videoId: videoId || 'dQw4w9WgXcQ',
        playerVars: {
            'autoplay': 1,
            'mute': 1,
            'controls': 0,
            'rel': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    event.target.playVideo();
    updateCameraDisplay();
    setInterval(switchNextCamera, 180000); // 3分切り替え
}

function switchNextCamera() {
    if (settings.cameras.length === 0) return;
    currentCameraIndex = (currentCameraIndex + 1) % settings.cameras.length;
    const nextUrl = settings.cameras[currentCameraIndex].url;
    const nextId = extractVideoId(nextUrl);
    if (nextId) {
        currentPlayer.loadVideoById(nextId);
        updateCameraDisplay();
    }
}

// --- 3. NHK速報取得 ---
async function fetchNHK() {
    try {
        const response = await fetch('https://api.web.nhk/sokuho/news/sokuho_news.xml');
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        const item = xmlDoc.getElementsByTagName("item")[0];
        if (item) {
            const title = item.getElementsByTagName("title")[0].textContent;
            document.getElementById('ticker-content').innerText = title;
            document.getElementById('ticker-container').classList.remove('hidden');
        }
    } catch (error) {
        console.error("NHK速報取得失敗(CORS制限の可能性があります):", error);
    }
}

// --- 4. 設定管理 ---
function createCameraInputs() {
    const container = document.getElementById('camera-inputs');
    container.innerHTML = ""; 
    for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        const cam = settings.cameras[i] || { url: "", location: "" };
        div.style.marginBottom = "5px";
        div.innerHTML = `
            <input type="text" placeholder="場所名" class="cam-loc" value="${cam.location}" style="width: 100px;">
            <input type="text" placeholder="YouTube URL" class="cam-url" value="${cam.url}" style="width: 250px;">
        `;
        container.appendChild(div);
    }
}

document.getElementById('save-settings').addEventListener('click', () => {
    // 保存前にキーの状態をクリア（リロード後の誤作動防止）
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
    
    // 設定画面を隠してからリロード
    document.getElementById('settings-modal').classList.add('modal-hidden');
    location.reload(); 
});

function loadSettings() {
    const saved = localStorage.getItem('sokuhoSettings');
    if (saved) {
        settings = JSON.parse(saved);
        // フォームに値を反映
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
        document.getElementById('camera-location').innerText = cam.location || "名称未設定";
        document.getElementById('camera-url-display').innerText = cam.url;
    }
}

function extractVideoId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
