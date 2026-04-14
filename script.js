let settings = {
    font: "'UD Shin Go', sans-serif",
    cameras: [{ url: "https://www.youtube.com/embed/dfVK7ld38Ys", location: "サンプル映像" }]
};

let currentPlayer;
let currentCameraIndex = 0;

// --- エラー通知機能 ---
function showError(code, message) {
    const container = document.getElementById('error-container');
    const div = document.createElement('div');
    div.className = 'error-msg';
    div.innerHTML = `<strong>[ERROR:${code}]</strong><br>${message}<br><small>このコードをGeminiに伝えてください</small>`;
    container.appendChild(div);
    // 5.5秒後に要素を削除
    setTimeout(() => div.remove(), 5500);
}

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        loadSettings();
        createCameraInputs();
        updateStyles();
        updateClock();
        setInterval(updateClock, 1000);
        
        const modal = document.getElementById('settings-modal');

        // キーボード「s」で設定を開く
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.key.toLowerCase() === 's') modal.classList.remove('modal-hidden');
        });

        // 設定ボタン（⚙）で設定を開く
        document.getElementById('fixed-settings-trigger').onclick = () => {
            modal.classList.remove('modal-hidden');
        };

        // 閉じるボタン
        document.getElementById('btn-close-modal').onclick = () => {
            modal.classList.add('modal-hidden');
        };

        // テスト送信
        document.getElementById('btn-test').onclick = () => {
            const text = document.getElementById('test-text').value;
            if(text) showNews(text);
        };
    } catch (e) {
        showError("INIT_FAIL", "初期化中にエラーが発生しました: " + e.message);
    }
});

function updateClock() {
    const now = new Date();
    document.getElementById('clock-display').innerText = 
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// --- YouTube API ---
window.onYouTubeIframeAPIReady = function() {
    try {
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
                    setInterval(switchNextCamera, 180000); // 3分おき
                },
                'onStateChange': (event) => {
                    // 停止状態になったら自動で再生を再開
                    if (event.data === YT.PlayerState.UNSTARTED || event.data === YT.PlayerState.PAUSED) {
                        event.target.playVideo();
                    }
                },
                'onError': (event) => {
                    showError("YT_API_" + event.data, "YouTubeの読み込みに失敗しました（動画が非公開か削除されている可能性があります）");
                }
            }
        });
    } catch (e) {
        showError("YT_INIT_ERR", "プレイヤーの作成に失敗しました: " + e.message);
    }
};

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
        const cam = settings.cameras[i] || { url: "", location: "" };
        const div = document.createElement('div');
        div.style.display = "flex"; div.style.gap = "10px"; div.style.marginBottom = "5px";
        div.innerHTML = `
            <input type="text" class="cam-loc" value="${cam.location}" placeholder="場所" style="width: 120px;">
            <input type="text" class="cam-url" value="${cam.url}" placeholder="iframeタグを貼り付け" style="flex-grow: 1;">
        `;
        container.appendChild(div);
    }
}

document.getElementById('save-settings').onclick = () => {
    try {
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
    } catch (e) {
        showError("SAVE_FAIL", "保存に失敗しました: " + e.message);
    }
};

function loadSettings() {
    const saved = localStorage.getItem('sokuhoSettings');
    if (saved) settings = JSON.parse(saved);
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
    const lastPart = parts[parts.length - 1];
    return lastPart.split('?')[0];
}
