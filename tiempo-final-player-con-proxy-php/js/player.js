document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    // Player
    const audio = $("radioAudio");
    const playBtn = $("playBtn");
    const playIcon = $("playIcon");
    const prevBtn = $("prevBtn");
    const nextBtn = $("nextBtn");
    const stationSelect = $("stationSelect");
    const volumeSlider = $("volumeSlider");
    const muteBtn = $("muteBtn");
    const volumeIcon = $("volumeIcon");

    // UI
    const albumArt = $("albumArt");
    const playerBg = $("playerBg");
    const songTitle = $("songTitle");
    const artistName = $("artistName");
    const stationTitle = $("stationTitle");
    const playerContainer = $("player");

    // Metadata UI
    const metadataStatus = $("metadataStatus");
    const metaSong = $("metaSong");
    const metaArtist = $("metaArtist");
    const metaAlbum = $("metaAlbum");
    const metaGenre = $("metaGenre");
    const metaListeners = $("metaListeners");
    const metaBitrate = $("metaBitrate");
    const metadataExtra = $("metadataExtra");
    const metadataUpdated = $("metadataUpdated");

    // Historial
    const historyToggleBtn = $("historyToggleBtn");
    const closeHistoryBtn = $("closeHistoryBtn");
    const historyPanel = $("historyPanel");
    const historyList = $("historyList");

    // Visualizador
    const canvas = $("audioVisualizer");
    const canvasCtx = canvas.getContext("2d");

    let currentStationIndex = 0;
    let isPlaying = false;
    let metaInterval = null;
    let lastVolume = 0.8;
    let lastMetadataKey = "";

    let audioCtx = null;
    let analyser = null;
    let source = null;

    let songHistory = [];
    const MAX_HISTORY_ITEMS = 15;

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

    function loadStation(index) {
        currentStationIndex = index;
        stationSelect.value = index;

        const station = RADIO_CONFIG.stations[index];

        stationTitle.textContent = station.name;
        audio.src = station.streamUrl;

        resetMetadata();
        setMetadataStatus("Consultando metadata...", "loading");
        fetchMetadata();

        if (metaInterval) clearInterval(metaInterval);
        metaInterval = setInterval(fetchMetadata, RADIO_CONFIG.apiUpdateInterval);

        if (isPlaying) {
            audio.play().catch((err) => {
                console.error("Error al reproducir:", err);
                setPlayingState(false);
            });
        }
    }

    function setupAudioContext() {
        if (audioCtx) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            audioCtx = new AudioContext();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;

            source = audioCtx.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
        } catch (error) {
            console.warn("Visualizador Web Audio no disponible:", error);
        }
    }

    function drawVisualizer() {
        function renderFrame() {
            requestAnimationFrame(renderFrame);

            canvas.width = canvas.clientWidth || 300;
            canvas.height = canvas.clientHeight || 45;

            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

            const barCount = 24;
            const barWidth = Math.max(2, (canvas.width / barCount) - 3);

            let dataArray = null;
            if (analyser) {
                dataArray = new Uint8Array(analyser.frequencyBinCount);
                if (isPlaying) analyser.getByteFrequencyData(dataArray);
            }

            for (let i = 0; i < barCount; i++) {
                let barHeight;

                if (analyser && isPlaying && dataArray[i]) {
                    barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
                } else if (isPlaying) {
                    barHeight = Math.max(
                        4,
                        Math.sin(Date.now() * 0.005 + i) * 12 + 15
                    );
                } else {
                    barHeight = 4;
                }

                const x = i * (barWidth + 3);
                const gradient = canvasCtx.createLinearGradient(
                    0, canvas.height, 0, 0
                );
                gradient.addColorStop(0, "#00d2ff");
                gradient.addColorStop(1, "#3a7bd5");

                canvasCtx.fillStyle = gradient;
                canvasCtx.beginPath();

                if (canvasCtx.roundRect) {
                    canvasCtx.roundRect(
                        x,
                        canvas.height - barHeight,
                        barWidth,
                        barHeight,
                        4
                    );
                } else {
                    canvasCtx.rect(
                        x,
                        canvas.height - barHeight,
                        barWidth,
                        barHeight
                    );
                }

                canvasCtx.fill();
            }
        }

        renderFrame();
    }

    async function togglePlay() {
        setupAudioContext();

        if (audioCtx && audioCtx.state === "suspended") {
            await audioCtx.resume();
        }

        if (isPlaying) {
            audio.pause();
            setPlayingState(false);
            return;
        }

        const station = RADIO_CONFIG.stations[currentStationIndex];
        audio.src = station.streamUrl;

        try {
            await audio.play();
            setPlayingState(true);
        } catch (error) {
            console.error("No se pudo iniciar el audio:", error);
            setMetadataStatus("No se pudo reproducir el audio", "error");
        }
    }

    function setPlayingState(value) {
        isPlaying = value;
        playIcon.className = value
            ? "fa-solid fa-pause"
            : "fa-solid fa-play";

        playerContainer.classList.toggle("playing", value);
    }

    function nextStation() {
        loadStation((currentStationIndex + 1) % RADIO_CONFIG.stations.length);
    }

    function prevStation() {
        loadStation(
            (currentStationIndex - 1 + RADIO_CONFIG.stations.length) %
            RADIO_CONFIG.stations.length
        );
    }

    function setVolume(value) {
        audio.volume = value;
        updateVolumeIcon(value);
    }

    function updateVolumeIcon(value) {
        if (value === 0) {
            volumeIcon.className = "fa-solid fa-volume-xmark";
        } else if (value < 0.5) {
            volumeIcon.className = "fa-solid fa-volume-low";
        } else {
            volumeIcon.className = "fa-solid fa-volume-high";
        }
    }

    function toggleMute() {
        if (audio.volume > 0) {
            lastVolume = audio.volume;
            audio.volume = 0;
            volumeSlider.value = 0;
        } else {
            audio.volume = lastVolume || 0.8;
            volumeSlider.value = audio.volume;
        }

        updateVolumeIcon(audio.volume);
    }

    // -----------------------------
    // METADATA
    // -----------------------------

    async function fetchMetadata() {
        const station = RADIO_CONFIG.stations[currentStationIndex];

        if (!station.apiUrl) {
            showMetadata({
                title: "En vivo",
                artist: station.name
            });
            return;
        }

        try {
            setMetadataStatus("Actualizando...", "loading");

            const response = await fetch(
                station.apiUrl,
                {
                    method: "GET",
                    cache: "no-store",
                    headers: { Accept: "application/json, text/plain, */*" }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get("content-type") || "";
            const rawText = await response.text();

            let data = rawText;

            // La consulta pasa por api/metadata.php, que devuelve:
            // { ok: true, station: "...", apiType: "...", data: ... }
            if (
                contentType.includes("application/json") ||
                rawText.trim().startsWith("{") ||
                rawText.trim().startsWith("[")
            ) {
                try {
                    data = JSON.parse(rawText);
                } catch {
                    data = rawText;
                }
            }

            if (data && data.ok === false) {
                throw new Error(data.error || "Error del proxy de metadata");
            }

            // Si viene desde nuestro proxy, analizar solamente "data".
            const sourceData =
                data &&
                typeof data === "object" &&
                Object.prototype.hasOwnProperty.call(data, "data")
                    ? data.data
                    : data;

            const metadata = normalizeMetadata(sourceData, station);

            if (!metadata.title && !metadata.artist) {
                throw new Error("La API respondió, pero no contiene metadata reconocible.");
            }

            showMetadata(metadata);
            setMetadataStatus("Metadata actualizada", "ok");
        } catch (error) {
            console.warn(`Metadata de ${station.name}:`, error);

            setMetadataStatus(
                "Sin metadata (revisar CORS/API)",
                "error"
            );

            // No borramos la canción anterior si la API falla momentáneamente.
            if (!lastMetadataKey) {
                showMetadata({
                    title: "Transmisión en directo",
                    artist: station.name
                });
            }
        }
    }

    function normalizeMetadata(data, station) {
        const flat = flattenObject(data);
        const lower = {};

        Object.entries(flat).forEach(([key, value]) => {
            lower[key.toLowerCase()] = value;
        });

        // Texto principal de canción.
        let rawTitle =
            firstValue(lower, [
                "streamtitle",
                "song",
                "songtitle",
                "nowplaying",
                "current_song",
                "current_song.title",
                "title"
            ]) || "";

        let artist =
            firstValue(lower, [
                "artist",
                "songartist",
                "current_song.artist",
                "current_song_artist"
            ]) || "";

        let title =
            firstValue(lower, [
                "track",
                "tracktitle",
                "songtitle",
                "current_song.title"
            ]) || "";

        // Zeno normalmente puede entregar un título compuesto.
        if (!title && rawTitle) title = rawTitle;

        // Si la API entrega "Artista - Canción", separar.
        if ((!artist || !title) && rawTitle) {
            const parsed = parseSongAndArtist(String(rawTitle));
            artist = artist || parsed.artist;
            title = title || parsed.title;
        }

        if (title && !artist) {
            const parsed = parseSongAndArtist(String(title));
            if (parsed.artist !== "Desconocido") {
                artist = parsed.artist;
                title = parsed.title;
            }
        }

        const metadata = {
            title: cleanValue(title) || "Transmisión en directo",
            artist: cleanValue(artist) || station.name,
            album: cleanValue(
                firstValue(lower, [
                    "album",
                    "albumname",
                    "current_song.album"
                ])
            ),
            genre: cleanValue(
                firstValue(lower, [
                    "genre",
                    "genres",
                    "station.genre"
                ])
            ),
            listeners: formatNumber(
                firstValue(lower, [
                    "listeners",
                    "currentlisteners",
                    "listener_count",
                    "numlisteners"
                ])
            ),
            bitrate: formatBitrate(
                firstValue(lower, [
                    "bitrate",
                    "bit_rate",
                    "stream.bitrate"
                ])
            ),
            cover: cleanValue(
                firstValue(lower, [
                    "artwork",
                    "artwork_url",
                    "album_art",
                    "albumart",
                    "cover",
                    "coverurl",
                    "image",
                    "imageurl"
                ])
            ),
            extra: collectExtraMetadata(lower)
        };

        return metadata;
    }

    function flattenObject(value, prefix = "", output = {}) {
        if (value === null || value === undefined) return output;

        if (typeof value !== "object") {
            output[prefix] = value;
            return output;
        }

        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                flattenObject(item, `${prefix}[${index}]`, output);
            });
            return output;
        }

        Object.entries(value).forEach(([key, item]) => {
            const nextKey = prefix ? `${prefix}.${key}` : key;
            if (item && typeof item === "object") {
                flattenObject(item, nextKey, output);
            } else {
                output[nextKey] = item;
            }
        });

        return output;
    }

    function firstValue(object, keys) {
        for (const wanted of keys) {
            const exact = Object.keys(object).find(
                (key) =>
                    key === wanted ||
                    key.endsWith(`.${wanted}`) ||
                    key.endsWith(`.${wanted.toLowerCase()}`)
            );

            if (exact && object[exact] !== null && object[exact] !== "") {
                return object[exact];
            }
        }

        return "";
    }

    function parseSongAndArtist(value) {
        const text = String(value || "").trim();
        const parts = text.split(/\s+-\s+/);

        if (parts.length >= 2) {
            return {
                artist: parts.shift().trim(),
                title: parts.join(" - ").trim()
            };
        }

        return {
            artist: "Desconocido",
            title: text
        };
    }

    function cleanValue(value) {
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return "";
        return String(value).trim();
    }

    function formatNumber(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return cleanValue(value) || "—";
        return new Intl.NumberFormat("es-CR").format(number);
    }

    function formatBitrate(value) {
        if (value === null || value === undefined || value === "") return "—";
        const text = String(value).trim();
        return /^\d+$/.test(text) ? `${text} kbps` : text;
    }

    function collectExtraMetadata(flat) {
        const important = [
            "title", "artist", "song", "songtitle", "streamtitle",
            "album", "genre", "listeners", "currentlisteners",
            "listener_count", "numlisteners", "bitrate", "bit_rate",
            "artwork", "artwork_url", "album_art", "albumart",
            "cover", "coverurl", "image", "imageurl"
        ];

        const result = [];

        Object.entries(flat).forEach(([key, value]) => {
            if (value === null || value === "" || typeof value === "object") return;

            const simpleKey = key.toLowerCase().split(".").pop();

            if (
                important.includes(simpleKey) ||
                key.includes("[")
            ) {
                return;
            }

            const text = String(value).trim();
            if (!text || text.length > 120) return;

            result.push({
                key: key.split(".").pop(),
                value: text
            });
        });

        return result.slice(0, 6);
    }

    async function showMetadata(metadata) {
        const station = RADIO_CONFIG.stations[currentStationIndex];

        songTitle.textContent = metadata.title;
        artistName.textContent = metadata.artist;

        metaSong.textContent = metadata.title || "—";
        metaArtist.textContent = metadata.artist || "—";
        metaAlbum.textContent = metadata.album || "—";
        metaGenre.textContent = metadata.genre || "—";
        metaListeners.textContent = metadata.listeners || "—";
        metaBitrate.textContent = metadata.bitrate || "—";

        metadataUpdated.textContent =
            `Última actualización: ${new Date().toLocaleTimeString("es-CR")}`;

        renderExtraMetadata(metadata.extra);

        const key = `${station.id}|${metadata.artist}|${metadata.title}`;

        if (key !== lastMetadataKey && metadata.title !== "Transmisión en directo") {
            lastMetadataKey = key;

            const cover = await resolveCover(
                metadata.cover,
                metadata.artist,
                metadata.title
            );

            albumArt.src = cover;
            playerBg.style.backgroundImage = `url("${cover}")`;

            addToHistory(
                metadata.title,
                metadata.artist,
                cover
            );
        } else if (metadata.cover) {
            albumArt.src = metadata.cover;
            playerBg.style.backgroundImage =
                `url("${metadata.cover}")`;
        }
    }

    async function resolveCover(apiCover, artist, title) {
        if (apiCover) return apiCover;

        try {
            const query = encodeURIComponent(`${artist} ${title}`);
            const url =
                `https://itunes.apple.com/search?term=${query}&media=music&limit=1`;

            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) throw new Error("iTunes HTTP error");

            const data = await response.json();

            if (data.results?.length) {
                return data.results[0].artworkUrl100
                    .replace("100x100bb", "600x600bb");
            }
        } catch (error) {
            console.warn("No se pudo obtener portada:", error);
        }

        return RADIO_CONFIG.defaultCover;
    }

    function resetMetadata() {
        lastMetadataKey = "";
        songTitle.textContent = "Cargando canción...";
        artistName.textContent = "Cargando artista...";

        metaSong.textContent = "—";
        metaArtist.textContent = "—";
        metaAlbum.textContent = "—";
        metaGenre.textContent = "—";
        metaListeners.textContent = "—";
        metaBitrate.textContent = "—";
        metadataExtra.innerHTML = "";
        metadataUpdated.textContent = "Última actualización: —";

        albumArt.src = RADIO_CONFIG.defaultCover;
        playerBg.style.backgroundImage =
            `url("${RADIO_CONFIG.defaultCover}")`;
    }

    function setMetadataStatus(text, state) {
        metadataStatus.textContent = text;
        metadataStatus.className = `metadata-status ${state}`;
    }

    function renderExtraMetadata(items) {
        metadataExtra.innerHTML = "";

        if (!items?.length) return;

        items.forEach((item) => {
            const row = document.createElement("div");
            row.className = "metadata-extra-row";

            const key = document.createElement("span");
            key.textContent = item.key;

            const value = document.createElement("strong");
            value.textContent = item.value;

            row.append(key, value);
            metadataExtra.appendChild(row);
        });
    }

    // -----------------------------
    // HISTORIAL
    // -----------------------------

    function addToHistory(song, artist, cover) {
        if (
            songHistory.length &&
            songHistory[0].song === song &&
            songHistory[0].artist === artist
        ) {
            return;
        }

        const time = new Date().toLocaleTimeString("es-CR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        songHistory.unshift({ song, artist, cover, time });

        if (songHistory.length > MAX_HISTORY_ITEMS) {
            songHistory.pop();
        }

        renderHistory();
    }

    function renderHistory() {
        if (!songHistory.length) {
            historyList.innerHTML =
                `<li class="history-empty">Aún no hay canciones registradas</li>`;
            return;
        }

        historyList.innerHTML = songHistory
            .map(
                (item) => `
                <li class="history-item">
                    <img src="${escapeHtml(item.cover)}"
                         class="history-thumb"
                         alt="Portada">
                    <div class="history-info">
                        <div class="history-song">${escapeHtml(item.song)}</div>
                        <div class="history-artist">${escapeHtml(item.artist)}</div>
                    </div>
                    <div class="history-time">${escapeHtml(item.time)}</div>
                </li>
            `
            )
            .join("");
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // Eventos
    historyToggleBtn.addEventListener("click", () =>
        historyPanel.classList.add("active")
    );

    closeHistoryBtn.addEventListener("click", () =>
        historyPanel.classList.remove("active")
    );

    playBtn.addEventListener("click", togglePlay);
    nextBtn.addEventListener("click", nextStation);
    prevBtn.addEventListener("click", prevStation);

    stationSelect.addEventListener("change", (event) => {
        loadStation(Number.parseInt(event.target.value, 10));
    });

    volumeSlider.addEventListener("input", (event) => {
        setVolume(Number.parseFloat(event.target.value));
    });

    muteBtn.addEventListener("click", toggleMute);

    audio.addEventListener("play", () => setPlayingState(true));
    audio.addEventListener("pause", () => setPlayingState(false));
    audio.addEventListener("error", () => {
        setMetadataStatus("Error con el stream de audio", "error");
    });

    // Inicio
    audio.volume = lastVolume;
    albumArt.src = RADIO_CONFIG.defaultCover;
    playerBg.style.backgroundImage =
        `url("${RADIO_CONFIG.defaultCover}")`;

    initStations();
    drawVisualizer();
    renderHistory();
});
