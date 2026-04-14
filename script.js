let settings = {
    font: "'UD Shin Go', sans-serif",
    cameras: [{ url: "https://www.youtube.com/embed/dfVK7ld38Ys", location: "サンプル映像" }]
};

let currentPlayer;
let currentCameraIndex = 0;

function showError(code, message) {
    const container = document.getElementById('error-container');
    const div = document.createElement('div');
    div.className = 'error-msg';
    div.innerHTML = `<strong>[ERROR:${code}]</strong><br>${message}`;
    container.appendChild(div);
    setTimeout(() => div.remove(), 6000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateStyles();
    updateClock();
    setInterval(updateClock, 1000);
});

function updateClock() {
    const now = new Date();
    document.getElementById('clock-display').innerText = 
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

window.onYouTubeIframeAPIReady = function() {
    try {
        const videoId = extractVideoId(settings.cameras[0]?.url);
        currentPlayer = new YT.Player('player', {
            videoId: videoId || 'dfVK7ld38Ys',
            playerVars: { 'autoplay': 1, 'mute': 1, 'controls': 0, 'origin': location.origin },
            events: {
                'onReady': (e) => { 
                    e.target.playVideo(); 
                    updateCameraDisplay(); 
                    setInterval(switchNextCamera, 180000); 
                },
                'onError': (e) => showError("YT_PLAY_" + e.data, "動画の再生に失敗しました。URLを確認してください。")
            }
        });
    } catch (e) {
        showError("YT_INIT", "YouTubeプレイヤーの起動に失敗しました。");
    }
};

function switchNextCamera() {
    if (settings.cameras.length <= 1) return;
    currentCameraIndex = (currentCameraIndex + 1) % settings.cameras.length;
    const nextId = extractVideoId(settings.cameras[currentCameraIndex].url);
    if (nextId && currentPlayer && currentPlayer.loadVideoById) {
        currentPlayer.loadVideoById(nextId);
        updateCameraDisplay();
    }
}

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
