<?php
declare(strict_types=1);

/*
 * Proxy de metadata para Tiempo Final.
 *
 * Ventajas:
 * - El navegador consulta TU servidor, no directamente el servidor de radio.
 * - Evita el problema habitual de CORS al consultar metadata.
 * - No expone URLs de las APIs de metadata al navegador.
 *
 * Requiere PHP con cURL habilitado.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$stations = [
    'radio_tiempo_final' => [
        'url' => 'https://sonic.mediacp.eu/cp/get_info.php?p=8126',
        'type' => 'sonic'
    ],
    'tiempo_final' => [
        'url' => 'https://zenoplay.zenomedia.com/api/zenofm/nowplaying/f832qdc7uv8uv',
        'type' => 'zeno'
    ]
];

$stationId = $_GET['station'] ?? '';

if (!isset($stations[$stationId])) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Emisora no válida'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'PHP cURL no está habilitado en el servidor'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$target = $stations[$stationId];

$ch = curl_init($target['url']);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json, text/plain, */*',
        'User-Agent: TiempoFinalPlayer/1.0'
    ]
]);

$body = curl_exec($ch);
$curlError = curl_error($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

curl_close($ch);

if ($body === false || $curlError !== '') {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'No se pudo consultar la API de metadata',
        'details' => $curlError
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'La API de metadata respondió con HTTP ' . $status
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
 * Si la respuesta ya es JSON válido, la devolvemos como JSON.
 * Si no lo es, la envolvemos como texto para que el frontend
 * pueda intentar interpretarla.
 */
$decoded = json_decode($body, true);

if (json_last_error() === JSON_ERROR_NONE) {
    echo json_encode([
        'ok' => true,
        'station' => $stationId,
        'apiType' => $target['type'],
        'data' => $decoded
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} else {
    echo json_encode([
        'ok' => true,
        'station' => $stationId,
        'apiType' => $target['type'],
        'data' => $body,
        'contentType' => $contentType
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
?>
