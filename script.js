// --- 初期設定 ---
let settings = {
    font: "'UD Shin Go', sans-serif",
    textColor: "#ffffff",
    strokeColor: "#000000",
    strokeWidth: "6", // 画像に合わせて太く
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
    updateClock(); // 時計を開始
    setInterval(updateClock, 1000); // 1秒ごとに更新
    
    // キー入力判定 (s + t)
    document.addEventListener('keydown', (e) => {
        // 入力欄にフォーカスがある時は判定しない
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

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
    setInterval(fetchNHK, 300000); // 5分おき
});

// --- 2. 時計機能 ---
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock-display').innerText = `${hours}:${minutes}`;
}

// --- 3. YouTube Iframe API ---
function onYouTubeIframeAPIReady() {
    const firstCam = settings.cameras[0] || {url: ""};
    const videoId = extractVideoId(firstCam.url);
    
    currentPlayer = new YT.Player('player', {
        videoId: videoId || 'dfVK7ld38Ys',
        playerVars: {
            'autoplay': 1,
            'mute': 1, // ★自動再生には必須
            'controls': 0,
            'rel': 0,
            'modestbranding': 1,
            'iv_load_policy': 3,
            'origin': window.location.origin // セキュリティ対策
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    // ミュート状態で再生を開始（ブラウザの自動再生ポリシー対策）
    event.target.mute();
    event.target.playVideo();
    updateCameraDisplay();
    setInterval(switchNextCamera, 180000); // 3分おき
}

function onPlayerStateChange(event) {
    // 再生が停止したり未開始の場合、再度再生を試みる
    if (event.data === YT.PlayerState.UNSTARTED || event.data === YT.PlayerState.PAUSED) {
        event.target.playVideo();
    }
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

// --- 4. 速報表示 ---
async function fetchNHK() {
    try {
        // ※実際にはCORS制限で取得できない可能性が高いです
        const response = await fetch('https://api.web.nhk/sokuho/news/sokuho_news.xml');
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const item = xmlDoc.getElementsByTagName("item")[0];
        if (item) {
            // XML内の改行を <br> に変換するなどが必要な場合があります
            showNews(item.getElementsByTagName("title")[0].textContent);
        }
    } catch (e) {
        console.log("NHK速報の自動取得はCORSにより制限されています。テスト送信を使用してください。");
    }
}

function showNews(text) {
    const container = document.getElementById('ticker-container');
    const content = document.getElementById('ticker-content');
    content.innerHTML = text; // <br> を有効にするため innerHTML
    container.classList.remove('hidden');
    // 30秒後に隠す演出
    if (window.sokuhoTimeout) clearTimeout(window.sokuhoTimeout);
    window.sokuhoTimeout = setTimeout(() => { container.classList.add('hidden'); }, 30000);
}

// --- 5. 設定管理 ---
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
    // 保存前にキーの状態を強制リセット
    keysPressed = {};

    settings.font = document.getElementById('font-select').value;
    // 色と太さは固定にするため、取得しない（初期値を使用）

    const urls = document.getElementsByClassName('cam-url');
    const locs = document.getElementsByClassName('cam-loc');
    settings.cameras = [];
    for (let i = 0; i < urls.length; i++) {
        let rawValue = urls[i].value.trim();
        if (rawValue !== "") {
            // iframeタグからsrc属性だけを抜き出すロジック
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
        // hidden input の値も更新（テスト送信機能のため）
        document.getElementById('text-color').value = settings.textColor || "#ffffff";
        document.getElementById('stroke-color').value = settings.strokeColor || "#000000";
        document.getElementById('stroke-width').value = settings.strokeWidth || "6";
    }
}

function updateStyles() {
    // 時計ボックスのフォントも設定に合わせる
    document.getElementById('info-box').style.fontFamily = settings.font;

    // 速報テキストのスタイル（画像固定：白文字・極太黒縁）
    const ticker = document.getElementById('ticker-content');
    ticker.style.fontFamily = settings.font;
    ticker.style.color = "#ffffff";
    ticker.style.webkitTextStroke = `6px #000000`; // 6pxで固定
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
    // クエリパラメータがある場合を除去
    return lastPart.split('?')[0];
}
