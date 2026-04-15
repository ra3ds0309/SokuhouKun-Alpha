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

bc.onmessage = (event) => {
    if (event.data.type === 'TEST_SOKUHO') {
        const audio = document.getElementById('sokuho-audio');
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audio.play().catch(e => console.warn("音声を再生するには画面を一度クリックしてください"));
        }
        showNews(event.data.text);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateStyles();
    updateClock();
    setInterval(updateClock, 1000);

    // 音声ブロック解除用
    document.body.addEventListener('click', () => {
        const audio = document.getElementById('sokuho-audio');
        audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
    }, { once: true });
});

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock-display').innerHTML = `${h}<span class="colon">：</span>${m}`;
}

window.onYouTubeIframeAPIReady = function() {
    try {
        const videoId = extractVideoId(settings.cameras[0]?.url);
        currentPlayer = new YT.Player('player', {
            videoId: videoId || 'dfVK7ld38Ys',
            playerVars: { 
                'autoplay': 1, 
                'mute': 1, 
                'controls': 0, 
                'rel': 0,
                'modestbranding': 1,
                'origin': location.origin 
            },
            events: {
                'onReady': (e) => { 
                    e.target.playVideo(); 
                    updateCameraDisplay(); 
                    setInterval(switchNextCamera, 180000); 
                }
            }
        });
    } catch (e) {
        console.error("YT Init Error");
    }
};

function showNews(text) {
    const container = document.getElementById('ticker-container');
    document.getElementById('ticker-content').innerHTML = text;
    container.classList.remove('hidden');
    if (window.sokuhoTimeout) clearTimeout(window.sokuhoTimeout);
    window.sokuhoTimeout = setTimeout(() => { container.classList.add('hidden'); }, 30000);
}

function loadSettings() {
    const saved = localStorage.getItem('sokuhoSettings');
    if (saved) settings = JSON.parse(saved);
}

function updateStyles() {
    const infoBox = document.getElementById('info-box');
    const tickerContent = document.getElementById('ticker-content');
    infoBox.style.fontFamily = settings.clockFont || settings.font;
    tickerContent.style.fontFamily = settings.tickerFont || settings.font;
    tickerContent.style.color = settings.tickerColor || "#ffffff";
    tickerContent.style.webkitTextStrokeWidth = (settings.tickerStrokeWidth || 7) + "px";
    tickerContent.style.webkitTextStrokeColor = settings.tickerStrokeColor || "#000000";
}

function switchNextCamera() {
    if (settings.cameras.length <= 1) return;
    currentCameraIndex = (currentCameraIndex + 1) % settings.cameras.length;
    const nextId = extractVideoId(settings.cameras[currentCameraIndex].url);
    if (nextId && currentPlayer.loadVideoById) {
        currentPlayer.loadVideoById(nextId);
        updateCameraDisplay();
    }
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
