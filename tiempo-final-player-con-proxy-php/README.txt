# Tiempo Final - Player

El reproductor ahora:
- reproduce las dos emisoras configuradas;
- consulta periódicamente la API de cada emisora;
- muestra canción, artista, álbum, género, oyentes y bitrate cuando esos campos vienen en la respuesta;
- muestra otros campos adicionales detectados en la respuesta;
- obtiene portada desde la metadata o, si no existe, intenta iTunes;
- mantiene historial de canciones;
- conserva un fallback visual si una API no responde.

IMPORTANTE:
La metadata depende de que las APIs permitan solicitudes CORS desde el dominio donde alojes el reproductor.
Si el navegador muestra "Sin metadata (revisar CORS/API)", el stream puede seguir funcionando pero la API está bloqueando la lectura desde JavaScript.

Estructura:
index.html
css/style.css
js/config.js
js/player.js


PROXY PHP:
Se agregó api/metadata.php. Sube la carpeta "api" al mismo servidor
donde está index.html.

Requisitos:
- Servidor web con PHP.
- Extensión PHP cURL habilitada.
- HTTPS recomendado.

Las URLs de metadata se consultan desde PHP, por lo que el navegador
ya no necesita acceder directamente a esas APIs y se reduce el problema
de CORS.

Los streams de audio siguen siendo:
- https://sonic.mediacp.eu:8126/stream
- https://stream.zeno.fm/f832qdc7uv8uv

Si el servidor usa Apache/Nginx con PHP, no hay que ejecutar el PHP
desde el navegador como archivo local: debe estar alojado en el servidor.
