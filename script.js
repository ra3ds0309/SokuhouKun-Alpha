let settings = {
    font: "'UD Shin Go', sans-serif",
    cameras: [{ url: "https://www.youtube.com/embed/dfVK7ld38Ys", location: "サンプル映像" }]
};

let currentPlayer;
let currentCameraIndex = 0;
let keysPressed = {};

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    createCameraInputs();
    updateStyles();
    updateClock();
    setInterval(updateClock, 1000);
    
    // 設定を開く判定（確実に動くよう再構築）
    window.addEventListener('keydown', (e) => {
        // 設定画面がすでに開いている時は何もしない
        if (!document.getElementById('settings-modal').classList.contains('modal-hidden')) return;
        
        const key = e.key.toLowerCase();
        keysPressed[key] = true;

        if (keysPressed['s'] && keysPressed['t']) {
            document.getElementById('settings-modal').classList.remove('modal-hidden');
            keysPressed = {}; // 判定をリセット
        }
    });

    window.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    document.getElementById('btn-test').addEventListener('click', () => {
        const text = document.getElementById('test-text').value;
        if(text) showNews(text);
    });

    fetchNHK();
    setInterval(fetchNHK, 300000);
});

function updateClock() {
    const now = new Date();
    document.getElementById('clock-display').innerText = 
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function onYouTubeIframeAPIReady() {
    const firstCam = settings.cameras[0] || {url: ""};
    const videoId = extractVideoId(firstCam.url);
    
    currentPlayer = new YT.Player('player', {
        videoId: videoId || 'dfVK7ld38Ys',
        playerVars: {
            'autoplay': 1, 'mute': 1, 'controls': 0,
            'rel': 0, 'modestbranding': 1, 'iv_load_policy': 3,
            'origin': window.location.origin
        },
        events: {
            'onReady': (event) => {
                event.target.mute();
                event.target.playVideo();
                updateCameraDisplay();
                setInterval(switchNextCamera, 180000);
            },
            'onStateChange': (event) => {
                if (event.data === YT.PlayerState.UNSTARTED) event.target.playVideo();
            }
        }
    });
}

function switchNextCamera() {
    if (settings.cameras.length <= 1) return;
    currentCameraIndex = (currentCameraIndex + 1) % settings.cameras.length;
    const nextCam = settings.cameras[currentCameraIndex];
    const nextId = extractVideoId(nextCam.url);
    if (nextId) {
        currentPlayer.loadVideoById(nextId);
        updateCameraDisplay();
    }
}

async function fetchNHK() {
    // NHK取得ロジック（実際にはCORS制限のためテストボタンを推奨）
}

function showNews(text) {
    const container = document.getElementById('ticker-container');
    const content = document.getElementById('ticker-content');
    content.innerHTML = text;
    container.classList.remove('hidden');
    if (window.sokuhoTimeout) clearTimeout(window.sokuhoTimeout);
    window.sokuhoTimeout = setTimeout(() => { container.classList.add('hidden'); }, 30000);
}

function createCameraInputs() {
    const container = document.getElementById('camera-inputs');
    container.innerHTML = "";
    for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.className = "cam-input-row";
        const cam = settings.cameras[i] || { url: "", location: "" };
        div.innerHTML = `
            <input type="text" placeholder="場所名" class="cam-loc" value="${cam.location}" style="width: 120px; background: #333; color: white; border: 1px solid #555;">
            <input type="text" placeholder='<iframe>タグをコピペ' class="cam-url" value='${cam.url}' style="flex-grow: 1; background: #333; color: white; border: 1px solid #555;">
        `;
        container.appendChild(div);
    }
}

document.getElementById('save-settings').addEventListener('click', () => {
    settings.font = document.getElementById('font-select').value;
    const urls = document.getElementsByClassName('cam-url');
    const locs = document.getElementsByClassName('cam-loc');
    settings.cameras = [];
    for (let i = 0; i < urls.length; i++) {
        let val = urls[i].value.trim();
        if (val !== "") {
            if (val.includes("<iframe")) {
                const match = val.match(/src=["'](.+?)["']/);
                if (match) val = match[1];
            }
            settings.cameras.push({ url: val, location: locs[i].value });
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
    }
}

function updateStyles() {
    document.getElementById('info-box').style.fontFamily = settings.font;
    const ticker = document.getElementById('ticker-content');
    ticker.style.fontFamily = settings.font;
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
