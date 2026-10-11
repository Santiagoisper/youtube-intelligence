# YouTube Radar VPS: guía rápida

## Abrir

En el escritorio de Windows, abrí **YouTube Radar VPS**. El acceso inicia una conexión SSH privada al VPS y abre la página de Canales en el navegador. Dejá abierta esa ventana mientras uses la app.

## Extraer una transcripción

1. Pegá la URL de un video o canal de YouTube en el cuadro.
2. Elegí **Analizar**.
3. Para un canal, marcá los videos que querés y elegí **Traer transcripción**. Para un video, la app lo procesa directamente.
4. La app guarda el resultado en su base de datos y en el almacenamiento persistente del VPS. El navegador muestra el resultado y su ubicación.

La app intenta obtener primero los subtítulos publicados por YouTube. Si no hay subtítulos, puede transcribir el audio con Groq cuando la clave esté configurada. En este VPS, YouTube pide verificar que el usuario no sea un bot; para habilitar la extracción hace falta configurar un archivo de cookies de YouTube dentro del directorio privado `secrets` del servicio. Ese archivo equivale a una sesión iniciada y no debe compartirse públicamente. Aun con cookies, YouTube puede aplicar límites temporales.

## Cerrar

El acceso directo deja abierta una ventana de SSH minimizada en la barra de tareas. Cerrala cuando termines para cortar el túnel. El servicio y los datos quedan guardados en el VPS.

## Dónde quedan los datos

- Base de datos: volumen Docker persistente `youtube-radar-db`.
- Archivos de transcripción: `/home/companyos/apps/youtube-radar/data/transcripts` en el VPS.
- La carpeta `YouTube Radar/data` del ejecutable anterior se conserva aparte; no se sobrescribe ni se importa automáticamente porque pertenece a otra aplicación.
