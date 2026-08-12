document.addEventListener("DOMContentLoaded", () => {
    // Elementos DOM Principales
    const audio = document.getElementById("radioAudio");
    const playBtn = document.getElementById("playBtn");
    const playIcon = document.getElementById("playIcon");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const stationSelect = document.getElementById("stationSelect");
    const volumeSlider = document.getElementById("volumeSlider");
    const muteBtn = document.getElementById("muteBtn");
    const volumeIcon = document.getElementById("volumeIcon");
    
    const albumArt = document.getElementById("albumArt");
    const playerBg = document.getElementById("playerBg");
    const songTitle = document.getElementById("songTitle");
    const artistName = document.getElementById("artistName");
    const stationTitle = document.getElementById("stationTitle");
    const playerContainer = document.getElementById("player");

    // Elementos Historial
    const historyToggleBtn = document.getElementById("historyToggleBtn");
    const closeHistoryBtn = document.getElementById("closeHistoryBtn");
    const historyPanel = document.getElementById("historyPanel");
    const historyList = document.getElementById("historyList");

    // Elementos Visualizador Web Audio API
    const canvas = document.getElementById("audioVisualizer");
    const canvasCtx = canvas.getContext("2d");

    let currentStationIndex = 0;
    let isPlaying = false;
    let metaInterval = null;
    let lastVolume = 0.8;
    
    // Web Audio API
    let audioCtx = null;
    let analyser = null;
    let source = null;
    let animFrameId = null;

    // Historial
    let songHistory = [];
    const MAX_HISTORY_ITEMS = 15;

    // 1. Inicializar Selector de Emisoras
    function initStations() {
        stationSelect.innerHTML = "";
        RADIO_CONFIG.stations.forEach((station, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = `${station.name} - ${station.subtitle}`;
            stationSelect.appendChild(option);
        });
        
        loadStation(0);
    }

    // 2. Cargar Emisora
    function loadStation(index) {
        currentStationIndex = index;
        stationSelect.value = index;
        const station = RADIO_CONFIG.stations[index];

        stationTitle.textContent = station.name;
        audio.src = station.streamUrl;
        
        updateMetadataDisplay("Cargando información...", station.name, RADIO_CONFIG.defaultCover);

        fetchMetadata();

        if (metaInterval) clearInterval(metaInterval);
        metaInterval = setInterval(fetchMetadata, RADIO_CONFIG.apiUpdateInterval);

        if (isPlaying) {
            audio.play().catch(err => console.error("Error al reproducir:", err));
        }
    }

    // 3. Web Audio API Setup
    function setupAudioContext() {
        if (audioCtx) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; // Cantidad de barras en el visualizador

            source = audioCtx.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
        } catch (e) {
            console.warn("Web Audio API con restricción CORS o no soportada:", e);
        }
    }

    // 4. Dibujar Visualizador
    function drawVisualizer() {
        const bufferLength = analyser ? analyser.frequencyBinCount : 0;
        const dataArray = analyser ? new Uint8Array(bufferLength) : [];

        function renderFrame() {
            animFrameId = requestAnimationFrame(renderFrame);

            // Ajuste dinámico de dimensiones canvas
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;

            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

            if (analyser && isPlaying) {
                analyser.getByteFrequencyData(dataArray);
            }

            const barWidth = (canvas.width / 24) - 3;
            let barHeight;
            let x = 0;

            for (let i = 0; i < 24; i++) {
                if (analyser && isPlaying && dataArray[i]) {
                    barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
                } else if (isPlaying) {
                    // Animación fallback si hay bloqueo CORS en la fuente
                    barHeight = Math.sin(Date.now() * 0.005 + i) * 12 + 15;
                } else {
                    barHeight = 4; // Modo reposo
                }

                // Gradiente Neón
                const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, "#00d2ff");
                gradient.addColorStop(1, "#3a7bd5");

                canvasCtx.fillStyle = gradient;
                canvasCtx.beginPath();
                canvasCtx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
                canvasCtx.fill();

                x += barWidth + 3;
            }
        }

        renderFrame();
    }

    // 5. Reproducir / Pausar
    function togglePlay() {
        setupAudioContext();

        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (isPlaying) {
            audio.pause();
            audio.src = "";
            isPlaying = false;
            playIcon.className = "fa-solid fa-play";
            playerContainer.classList.remove("playing");
        } else {
            const station = RADIO_CONFIG.stations[currentStationIndex];
            audio.src = station.streamUrl;
            audio.play().then(() => {
                isPlaying = true;
                playIcon.className = "fa-solid fa-pause";
                playerContainer.classList.add("playing");
            }).catch(err => console.error("Error al iniciar audio:", err));
        }
    }

    // 6. Controles Navegación y Volumen
    function nextStation() { loadStation((currentStationIndex + 1) % RADIO_CONFIG.stations.length); }
    function prevStation() { loadStation((currentStationIndex - 1 + RADIO_CONFIG.stations.length) % RADIO_CONFIG.stations.length); }

    function setVolume(value) {
        audio.volume = value;
        updateVolumeIcon(value);
    }

    function updateVolumeIcon(val) {
        if (val == 0) volumeIcon.className = "fa-solid fa-volume-xmark";
        else if (val < 0.5) volumeIcon.className = "fa-solid fa-volume-low";
        else volumeIcon.className = "fa-solid fa-volume-high";
    }

    function toggleMute() {
        if (audio.volume > 0) {
            lastVolume = audio.volume;
            audio.volume = 0;
            volumeSlider.value = 0;
        } else {
            audio.volume = lastVolume;
            volumeSlider.value = lastVolume;
        }
        updateVolumeIcon(audio.volume);
    }

    // 7. API Metadatos & iTunes Covers
    async function fetchMetadata() {
        const station = RADIO_CONFIG.stations[currentStationIndex];
        if (!station.apiUrl) {
            updateMetadataDisplay("En Vivo", station.name, RADIO_CONFIG.defaultCover);
            return;
        }

        try {
            const response = await fetch(station.apiUrl);
            if (!response.ok) throw new Error("Error en la API");

            const data = await response.json();
            let rawTitle = "";

            if (station.apiType === "zeno" && data.streamTitle) {
                rawTitle = data.streamTitle;
            } else if (data.title) {
                rawTitle = data.title;
            }

            if (rawTitle) {
                parseSongAndArtist(rawTitle);
            } else {
                updateMetadataDisplay("Transmisión en directo", station.name, RADIO_CONFIG.defaultCover);
            }
        } catch (error) {
            updateMetadataDisplay("Transmisión en directo", station.name, RADIO_CONFIG.defaultCover);
        }
    }

    function parseSongAndArtist(fullTitle) {
        const parts = fullTitle.split(" - ");
        let artist = "Desconocido";
        let title = fullTitle;

        if (parts.length >= 2) {
            artist = parts[0].trim();
            title = parts.slice(1).join(" - ").trim();
        }

        fetchAlbumCover(artist, title);
    }

    async function fetchAlbumCover(artist, title) {
        try {
            const query = encodeURIComponent(`${artist} ${title}`);
            const url = `https://itunes.apple.com/search?term=${query}&media=music&limit=1`;
            const res = await fetch(url);
            const data = await res.json();

            let coverUrl = RADIO_CONFIG.defaultCover;
            if (data.results && data.results.length > 0) {
                coverUrl = data.results[0].artworkUrl100.replace("100x100bb", "600x600bb");
            }

            updateMetadataDisplay(title, artist, coverUrl);
        } catch (e) {
            updateMetadataDisplay(title, artist, RADIO_CONFIG.defaultCover);
        }
    }

    function updateMetadataDisplay(song, artist, cover) {
        songTitle.textContent = song;
        artistName.textContent = artist;
        albumArt.src = cover;
        playerBg.style.backgroundImage = `url('${cover}')`;

        if (song !== "Cargando información..." && song !== "Transmisión en directo" && song !== "En Vivo") {
            addToHistory(song, artist, cover);
        }
    }

    // 8. Historial
    function addToHistory(song, artist, cover) {
        if (songHistory.length > 0) {
            if (songHistory[0].song === song && songHistory[0].artist === artist) return;
        }

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        songHistory.unshift({ song, artist, cover, time: timeStr });

        if (songHistory.length > MAX_HISTORY_ITEMS) songHistory.pop();

        renderHistory();
    }

    function renderHistory() {
        if (songHistory.length === 0) {
            historyList.innerHTML = `<li class="history-empty">Aún no hay canciones registradas</li>`;
            return;
        }

        historyList.innerHTML = songHistory.map(item => `
            <li class="history-item">
                <img src="${item.cover}" class="history-thumb" alt="Portada">
                <div class="history-info">
                    <div class="history-song">${item.song}</div>
                    <div class="history-artist">${item.artist}</div>
                </div>
                <div class="history-time">${item.time}</div>
            </li>
        `).join('');
    }

    // Listeners Panel Historial
    historyToggleBtn.addEventListener("click", () => historyPanel.classList.add("active"));
    closeHistoryBtn.addEventListener("click", () => historyPanel.classList.remove("active"));

    // Listeners Player
    playBtn.addEventListener("click", togglePlay);
    nextBtn.addEventListener("click", nextStation);
    prevBtn.addEventListener("click", prevStation);
    stationSelect.addEventListener("change", (e) => loadStation(parseInt(e.target.value)));
    volumeSlider.addEventListener("input", (e) => setVolume(parseFloat(e.target.value)));
    muteBtn.addEventListener("click", toggleMute);

    // Inicialización
    initStations();
    drawVisualizer();
    renderHistory();
});
