# Reel Finder

Dashboard en español para **encontrar → revisar → guardar → reaccionar → marcar como usado** videos públicos de TikTok, Instagram y Facebook. React, Vite, TypeScript, Tailwind CSS y un servidor Express pequeño. Sin base de datos ni cuentas de usuario.

## Inicio

Recomendado Node.js 22 (versión configurada para hosting).

```bash
npm install
cp .env.example .env
# Edita .env y agrega tu clave TAVILY_API_KEY
npm run dev
```

Abre http://localhost:3000. Sin clave, la interfaz explica cómo configurarla; biblioteca, historial y configuración funcionan, sin resultados ficticios. Reinicia el servidor después de cambiar `.env`.

## Producción

```bash
npm run build
npm start
```

El mismo servidor entrega `dist/` y `/api/search`. Configura `TAVILY_API_KEY` y opcionalmente `PORT` en tu servicio de hosting Node. En hosting Node se usa este servidor. Netlify y Vercel usan los endpoints serverless incluidos; no requieren `npm start`. Mantén el servicio privado si lo usas personalmente; un despliegue público comparte el consumo de la clave. El endpoint limita a 12 búsquedas/minuto por IP; detrás de un proxy, configura `trust proxy` únicamente para proxies conocidos. Este límite está en memoria y corresponde a una sola instancia.

## Búsqueda y datos reales

Frontend → `POST /api/search` → `https://api.tavily.com/search`.

La clave solo se lee en el servidor desde `process.env.TAVILY_API_KEY`. No uses `VITE_TAVILY_API_KEY`. El backend utiliza `fetch` contra la [API oficial de Tavily](https://docs.tavily.com/documentation/api-reference/endpoint/search), consultada al implementar. Cada búsqueda envía dos consultas cortas, una de escenas concretas y otra de videoreacciones, una en español y otra con términos relacionados en inglés por plataforma: más consultas por las referencias configuradas: hasta nueve solicitudes Tavily. Ajusta el diccionario en `src/data/search_terms.ts` y escenarios/cuentas en `src/data/content_references.ts`. Las cuentas `christianrenaudn` y `elson_olivei` proceden de referencias del usuario; UPSOMEDIA se identifica por la marca del video aportado. Son pistas de búsqueda, no autenticación del autor ni garantía de que todos sus videos encajen. Los enlaces compartidos de Facebook no resueltos no se inventan como cuentas. Cada solicitud básica puede consumir créditos; el máximo solicitado no garantiza esa cantidad de videos.

- Solo se aceptan URLs reconocibles de TikTok video, Instagram Reel y Facebook Reel/video/watch. Se excluyen perfiles y resultados de otros dominios.
- Se deduplican enlaces normalizados, conservando parámetros funcionales como `v` de Facebook y quitando tracking conocido. Enlaces cortos o redirecciones no se resuelven; no se realiza scraping.
- Se exige una coincidencia textual con el tema o sus variantes; se excluyen enlaces sin texto útil o explícitamente ajenos al tema. Los contadores de reacciones de Facebook no cuentan como videoreacciones.
- Se excluyen señales explícitas de podcasts, consejos y dramatizaciones; reacción, escena, tema y reflexión dan prioridad, pero no se exigen simultáneamente. Descripciones incompletas se conservan como candidatos por confirmar, con un aviso. Estas reglas analizan texto indexado, no verifican el video. Abre el original para confirmar. Ajusta las reglas en `src/lib/reaction_match.ts`.
- Se incluyen escenas originales sin narrador, reacción o reflexión. El ranking da más peso a una escena concreta que a un comentario general.
- Ranking prioriza el formato solicitado, coincidencia textual, URL de video, score de Tavily y completitud de metadata.
- La respuesta de Search no garantiza duración verificada ni miniatura del video. Ambas quedan `null`; no se usan imágenes globales de búsqueda ni números extraídos de snippets como metadata.
- El filtro 30–60s incluye duración desconocida y prioriza duración conocida en ese rango; excluye únicamente duraciones conocidas fuera del rango.
- Resultados parciales tienen avisos. Sin resultados se ofrecen sugerencias. Timeout, clave faltante/inválida, límites y errores se muestran en español.
- Búsquedas nuevas cancelan las anteriores, se evita enviar simultáneamente una consulta idéntica y existe cancelación manual.

## Organización

```text
api/                     Endpoints serverless Vercel
backend/                 Motor Tavily, adaptador HTTP y servidor local
netlify/functions/       Endpoints serverless Netlify
src/components/          Cards, placeholders y estados compartidos
src/pages/               Buscar, guardados, historial y configuración
src/hooks/               Persistencia de guardados, historial y debounce
src/lib/                 Cliente API, localStorage y normalización de URLs
src/data/search_terms.ts Diccionario configurable español → inglés
src/types/video.ts       Tipos compartidos
```

Los datos se guardan exclusivamente en localStorage de este navegador y origen. No se sincronizan entre dispositivos. Si eliminas datos del navegador se pierde la biblioteca. Se valida la estructura de datos almacenados y se informa si el navegador impide escribir.

Guarda un video con el corazón o botón. En **Guardados**, asigna Pendiente, Usado o Descartado y las cuentas donde lo usaste. Marcar una cuenta establece el estado Usado; desmarcarla conserva el estado para que tú decidas si vuelve a Pendiente. Los IDs de cuentas son estables aunque cambies sus nombres. Las búsquedas completadas se guardan (máximo 50) con plataformas, fecha y número de resultados. Puedes repetirlas o borrar el historial.

La app abre contenido original en pestaña nueva; no descarga, copia ni reproduce videos dentro del dashboard.

## Verificación

```bash
npm test
npm run build
```

Los tests comprueban normalización, validación de dominios/URLs de video, expansiones de términos, metadata desconocida, ranking, respuestas inesperadas, deduplicación y fallas parciales/rate limits con fetch simulado. No consumen créditos Tavily. Para verificar resultados en vivo agrega una clave válida y realiza una búsqueda desde el dashboard.

## Desplegar desde GitHub

Sube el repositorio sin `.env` (ya está ignorado). `TAVILY_API_KEY` nunca se escribe en `netlify.toml`, `vercel.json` ni en variables con prefijo `VITE_`.

### Vercel

1. Importa el repositorio en **New Project**.
2. Framework **Vite**, directorio raíz del proyecto, build `npm run build`, output `dist`, Node.js **22.x**. `vercel.json` ya declara framework y build.
3. En **Settings → Environment Variables**, agrega `TAVILY_API_KEY` para los entornos donde usarás la búsqueda (Production y, si procede, Preview/Development).
4. Despliega o vuelve a desplegar después de cambiar la variable.
5. Comprueba `/api/health`: debe devolver `{"configured":true}`. Después busca desde la aplicación.

`api/search.ts` y `api/health.ts` exportan funciones Node `(req, res)` que adaptan los handlers Web Standard compartidos para el runtime Node de [Vercel Functions](https://vercel.com/docs/functions/runtimes/node-js). La función de búsqueda dispone de un máximo configurado de 30s y las llamadas Tavily tienen timeout de 18s. El servidor local vive en `backend/local_server.ts` para evitar confundirlo con un servidor raíz autodetectado.

### Netlify

1. Usa **Add new project → Import an existing project** y selecciona el repositorio.
2. `netlify.toml` configura build `npm run build`, publicación `dist`, Node 22, bundler esbuild y las funciones en `netlify/functions`.
3. Agrega `TAVILY_API_KEY` en las variables de entorno del proyecto; debe estar disponible para **Functions** y para el contexto de despliegue que uses. No la declares en el archivo TOML.
4. Despliega o vuelve a desplegar después de cambiar la variable.
5. Verifica `/api/health` y realiza una búsqueda.

Las rutas `/api/search` y `/api/health` se reescriben a las funciones antes de la regla de SPA. Los handlers usan la [API moderna de Netlify Functions](https://docs.netlify.com/build/functions/get-started/), y la clave se lee en runtime según la [documentación de variables de entorno](https://docs.netlify.com/build/functions/environment-variables/).

En ambas plataformas, el límite de 12 búsquedas/minuto es una protección básica por instancia caliente, no un límite global entre instancias. Si publicas el servicio, configura también las reglas de protección y consumo de tu plataforma/Tavily según tu uso. Los datos de localStorage pertenecen a cada dominio: los guardados locales no aparecen automáticamente en Netlify, Vercel ni en otro dispositivo.

Los imports del backend incluyen `.js` para que los archivos TypeScript emitidos funcionen como ESM nativo en Vercel; la verificación incluye cargar esos archivos con Node sin bundling ni tsx.
