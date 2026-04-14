let settings = {
    font: "'UD Shin Go', sans-serif",
    cameras: [{ url: "https://www.youtube.com/embed/dfVK7ld38Ys", location: "サンプル映像" }]
};

let currentPlayer;
let currentCameraIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    createCameraInputs();
    updateStyles();
    updateClock();
    setInterval(updateClock, 1000);
    
    const modal = document.getElementById('settings-modal');

    // 「s」キー判定
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.key.toLowerCase() === 's') modal.classList.remove('modal-hidden');
    });

    // 設定ボタンクリック
    document.getElementById('btn-open-settings').addEventListener('click', () => {
        modal.classList.remove('modal-hidden');
    });

    // 閉じるボタン
    document.getElementById('btn-close-modal').addEventListener('click', () => {
        modal.classList.add('modal-hidden');
    });

    // テスト送信
    document.getElementById('btn-test').addEventListener('click', () => {
        const text = document.getElementById('test-text').value;
        if(text) showNews(text);
    });
});

function updateClock() {
    const now = new Date();
    document.getElementById('clock-display').innerText = 
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// --- YouTube API 制御 ---
window.onYouTubeIframeAPIReady = function() {
    initPlayer();
};

function initPlayer() {
    const firstCam = settings.cameras[0] || {url: ""};
    const videoId = extractVideoId(firstCam.url);
    
    currentPlayer = new YT.Player('player', {
        videoId: videoId || 'dfVK7ld38Ys',
        playerVars: {
            'autoplay': 1, 'mute': 1, 'controls': 0,
            'rel': 0, 'modestbranding': 1, 'iv_load_policy': 3,
            'origin': location.origin
        },
        events: {
            'onReady': (event) => {
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
    if (nextId && currentPlayer && currentPlayer.loadVideoById) {
        currentPlayer.loadVideoById(nextId);
        updateCameraDisplay();
    }
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
        div.style.marginBottom = "8px";
        div.style.display = "flex";
        div.style.gap = "10px";
        const cam = settings.cameras[i] || { url: "", location: "" };
        div.innerHTML = `
            <input type="text" placeholder="場所名" class="cam-loc" value="${cam.location}" style="width: 120px;">
            <input type="text" placeholder='<iframe>タグ' class="cam-url" value='${cam.url}' style="flex-grow: 1;">
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
    document.getElementById('ticker-content').style.fontFamily = settings.font;
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
    const last = parts[parts.length - 1];
    return last.split('?')[0];
}
