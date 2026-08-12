const RADIO_CONFIG = {
    // Intervalo de actualización de la API de metadatos (milisegundos)
    apiUpdateInterval: 10000, 
    
    // Imagen predeterminada si no hay portada disponible
    defaultCover: "https://imgur.com/YsjJ3V6",

    // Lista de Emisoras Disponibles
    stations: [
        {
            id: "radio_tiempo_final",
            name: "Radio Tiempo Final",
            subtitle: "Palabras de Vida a tu Corazón",
            streamUrl: "https://sonic.mediacp.eu:8126/stream",
            apiUrl: "https://sonic.mediacp.eu/cp/get_info.php?p=8126",
            apiType: "zeno" // Tipos soportados: "zeno", "shoutcast", "icecast", "generic"
        },
        {
            id: "tiempo final",
            name: "Tiempo Final",
            subtitle: "Música con Vida",
            streamUrl: "https://stream.zeno.fm/f832qdc7uv8uv",
            apiUrl: "https://zenoplay.zenomedia.com/api/zenofm/nowplaying/f832qdc7uv8uv",
            apiType: "generic"
        },
       
    ]
};
