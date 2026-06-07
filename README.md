# FiguTrack Frontend

SPA desarrollada con `React 19`, `Vite`, `TypeScript` y `React Router` para la gestión visual de colecciones de figuritas, seguimiento de álbumes, matches, importación CSV y listas públicas compartibles.

## Propósito Del Frontend

Este frontend concentra toda la experiencia de usuario de FiguTrack:

- registro e inicio de sesión
- alta de álbumes en la colección personal
- control visual de figuritas con filtros
- carga masiva desde CSV
- búsqueda por código de figurita
- panel de coincidencias
- contacto entre coleccionistas
- panel administrativo
- generación y visualización de enlaces públicos compartibles

## Stack Técnico

- `React 19`
- `Vite 7`
- `TypeScript 5`
- `React Router`
- `Tailwind CSS 4`
- `ESLint`

## Estado Actual De La App

El proyecto ya no usa `Next.js`.

Actualmente el frontend está migrado a una SPA con `Vite`, pensada para:

- desarrollo local rápido
- despliegue en hosting compartido
- publicación en `public_html`
- consumo de la API Laravel bajo `/api`

## Estructura Principal

```text
frontend/
├─ components/
│  ├─ figutrack-app.tsx
│  └─ shared-album-view.tsx
├─ lib/
│  └─ api.ts
├─ src/
│  ├─ App.tsx
│  ├─ globals.css
│  └─ main.tsx
├─ public/
├─ dist/
└─ package.json
```

## Rutas Del Frontend

Las rutas cliente principales son:

- `/`
  - dashboard principal
  - autenticación
  - catálogo
  - control del álbum
  - matches
  - perfil
  - administración

- `/compartir/:shareKey/album/:albumId`
  - vista pública compartida
  - lectura rápida de faltantes y repetidas
  - enlace visible sin autenticación

## Componentes Principales

### `figutrack-app.tsx`

Componente principal de la aplicación privada.

Gestiona:

- sesión del usuario
- carga de catálogo y colección
- tablero del álbum
- filtros y tabs
- búsqueda por código
- importación CSV
- generación de enlaces públicos
- matches
- contacto
- administración

### `shared-album-view.tsx`

Vista pública compartida del álbum.

Incluye:

- cabecera con progreso del usuario
- enlace público compartible
- lectura rápida agrupada de:
  - faltantes
  - repetidas
- agrupación por prefijo de código y banderas/emojis

### `lib/api.ts`

Cliente central para consumo de la API:

- compone la URL base desde `VITE_API_URL`
- soporta `JSON` y `FormData`
- adjunta token bearer cuando corresponde
- valida errores de respuesta
- detecta respuestas HTML inválidas para evitar pantallas en blanco

### `src/App.tsx`

Define el árbol de rutas con `React Router`.

### `src/main.tsx`

Arranque de la aplicación:

- `ReactDOM`
- `BrowserRouter`
- `AppErrorBoundary`

## Funcionalidades Incluidas

### Autenticación

- login por email o celular
- registro de nuevos usuarios
- cierre de sesión
- edición de perfil
- cambio de contraseña
- visibilidad controlada de contraseñas

### Catálogo Y Colección

- listado de álbumes disponibles
- alta del álbum en la colección del usuario
- progreso por álbum
- control visual por categorías

### Registro De Figuritas

- marcar figuritas como obtenidas
- indicar cantidad de repetidas
- actualización inmediata en interfaz
- filtros:
  - todas
  - solo faltantes
  - solo repetidas
- búsqueda por código:
  - `MEX`
  - `BRA`
  - `FWC`
  - `BRA10`

Cuando existe texto de búsqueda, el filtrado se realiza sobre todo el álbum, no solo sobre la categoría activa.

### Importación CSV

- carga de archivo CSV desde la interfaz
- limpieza previa opcional del álbum antes de importar
- descarga de plantilla
- resumen visual de:
  - importadas
  - limpiadas
  - omitidas
  - códigos no encontrados

### Enlaces Públicos

- generación de URL pública compartible
- copia al portapapeles
- enlace abierto sin login
- exportación CSV
- impresión / guardar en PDF
- lectura rápida de faltantes y repetidas

### Matches

- listado de usuarios compatibles para intercambio
- score de relevancia
- resumen de qué ofrece cada parte
- acceso a contacto cuando existe match válido

### Administración

- estadísticas globales
- CRUD de álbumes
- CRUD de figuritas
- generación masiva de figuritas

## Experiencia Responsive

El frontend está ajustado para:

- escritorio
- tablet
- móvil

Se revisaron especialmente:

- grillas de figuritas
- filtros y tabs
- importación CSV
- panel de compartir
- vista pública compartida

## Requisitos

- `Node.js 20+`
- `npm 10+`

## Instalación Local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear entorno local

```bash
copy .env.example .env
```

### 3. Configurar `.env`

El proyecto usa:

```env
VITE_API_URL=/api
```

En local puedes consumir el backend por:

- proxy con la configuración de Vite
- o directamente usando la misma raíz si el hosting local ya reescribe `/api`

### 4. Ejecutar desarrollo

```bash
npm run dev
```

### 5. Abrir en navegador

```text
http://localhost:3000
```

## Scripts Disponibles

### Desarrollo

```bash
npm run dev
```

### Build de producción

```bash
npm run build
```

### Preview local del build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Integración Con El Backend

El frontend espera una API Laravel compatible en:

```text
/api
```

Endpoints consumidos habitualmente:

- `/api/register`
- `/api/login`
- `/api/me`
- `/api/albumes`
- `/api/mis-albumes`
- `/api/mis-albumes/{album}/figuritas`
- `/api/mis-albumes/{album}/importar-csv`
- `/api/mis-albumes/{album}/compartir`
- `/api/figuritas/{sticker}/estado`
- `/api/albumes/{album}/matches`
- `/api/usuarios/{user}/contacto`
- `/api/compartir/{shareKey}/albumes/{album}`

## Despliegue En Hosting Compartido

Este frontend está preparado para publicar archivos estáticos en la raíz del dominio:

```text
public_html/
```

## Proceso De Build

```bash
npm run build
```

El resultado queda en:

```text
frontend/dist/
```

## Qué Subir Al Hosting

Sube a `public_html/` el contenido de `dist/`, no la carpeta `dist` como contenedor:

- `index.html`
- `assets/`
- `.svg` incluidos en el build
- `.htaccess` de la raíz del proyecto

## Estructura Final Recomendada

```text
public_html/
├─ .htaccess
├─ index.html
├─ assets/
├─ file.svg
├─ globe.svg
├─ next.svg
├─ vercel.svg
├─ window.svg
└─ backend/
```

## Consideraciones Importantes De Hosting

### No mezclar builds

Cuando publiques una nueva versión:

1. borra `index.html` viejo
2. borra la carpeta `assets/` vieja
3. sube juntos el nuevo `index.html` y la nueva carpeta `assets/`

Esto evita errores como:

- `Failed to load module script`
- `MIME type of text/html`

que ocurren cuando el `index.html` apunta a un bundle JS que ya no existe.

### Caché

El proyecto está preparado para:

- no cachear agresivamente `index.html`
- cachear assets versionados con hash

## Variables De Entorno De Producción

Compila producción con:

```env
VITE_API_URL=/api
```

## Validaciones Recomendadas Tras Publicar

### Probar frontend

- `https://figuritas.store/`
- `https://figuritas.store/compartir/...`

### Probar assets

Abre directamente un archivo del build:

```text
https://figuritas.store/assets/index-XXXXXXXX.js
```

Debe devolver JavaScript, no HTML.

### Probar API

```text
https://figuritas.store/api/albumes
```

Debe responder JSON si la sesión/token son válidos o al menos una respuesta API consistente.

## Calidad Y Verificación

Antes de subir cambios se recomienda ejecutar:

```bash
npm run lint
npm run build
```

## Detalles Visuales Relevantes

La app incluye:

- interfaz de registro/login cuidada
- control visual por tarjetas
- estado de figurita con colores:
  - falta
  - tengo
  - repetida
- vista pública resumida para compartir rápido
- experiencia responsive para móvil y escritorio

## Relación Con El README General

Este README documenta exclusivamente la SPA del frontend.

Para:

- entorno completo local
- base de datos
- hosting conjunto
- flujo global del proyecto

consulta también:

- `../README.md`
- `../backend/README.md`
