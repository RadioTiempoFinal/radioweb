const RADIO_CONFIG = {
    // Actualiza la metadata cada 10 segundos.
    apiUpdateInterval: 10000,

    // Imagen local/base si la API no entrega portada.
    defaultCover:
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
                <rect width="100%" height="100%" fill="#0b1120"/>
                <circle cx="300" cy="300" r="190" fill="#111d35"/>
                <text x="300" y="285" text-anchor="middle" fill="#00d2ff"
                      font-family="Arial" font-size="48" font-weight="700">TIEMPO</text>
                <text x="300" y="340" text-anchor="middle" fill="#ffffff"
                      font-family="Arial" font-size="42" font-weight="700">FINAL</text>
            </svg>
        `),

    stations: [
        {
            id: "radio_tiempo_final",
            name: "Radio Tiempo Final",
            subtitle: "Palabras de Vida a tu Corazón",
            streamUrl: "https://sonic.mediacp.eu:8126/stream",
            apiUrl: "api/metadata.php?station=radio_tiempo_final",
            apiType: "sonic"
        },
        {
            id: "tiempo_final",
            name: "Tiempo Final",
            subtitle: "Música con Vida",
            streamUrl: "https://stream.zeno.fm/f832qdc7uv8uv",
            apiUrl: "api/metadata.php?station=tiempo_final",
            apiType: "zeno"
        }
    ]
};
