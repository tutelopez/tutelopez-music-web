# TuteLopez Music Web 🎹

Sitio web oficial de TuteLopez Music, creado para proveer recursos, plantillas, tutoriales y sonidos de alta calidad para tecladistas y músicos cristianos. 

Esta plataforma está desarrollada con **Astro** y **Tailwind CSS**, y conectada a **Sanity CMS** para una fácil gestión de contenidos sin necesidad de tocar el código una vez en producción.

## 🚀 Características

- **Catálogo de Recursos Dinámico**: Las plantillas y librerías se obtienen directamente de Sanity CMS.
- **Filtro de Categorías Inteligente**: Los botones de filtrado (MainStage, Kontakt, Sintetizadores) se generan automáticamente basándose en tu base de datos y filtran los recursos sin recargar la página.
- **Diseño Moderno (Glassmorphism)**: Interfaz oscura premium con efectos translúcidos (efecto cristal) y animaciones fluidas al hacer hover.
- **Súper Veloz y SEO Friendly**: Desarrollado estáticamente con Astro, lo que garantiza una puntuación perfecta en rendimiento y generación de Sitemap nativo para Google.
- **Integración de PayPal**: Página dedicada `/apoyo` para recibir donaciones directas internacionales.
- **Espacios para AdSense**: Zonas estratégicamente reservadas a lo largo de las páginas para colocar banners publicitarios una vez se monetice.

## 🛠️ Tecnologías

- **Framework**: [Astro](https://astro.build/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/) con el plugin oficial de Tipografía.
- **Base de Datos / CMS**: [Sanity](https://www.sanity.io/)
- **Procesador de Texto Enriquecido**: `@portabletext/react`

## 💻 Instalación y Desarrollo Local

Sigue estos pasos para correr y modificar el proyecto en tu propia computadora:

1. **Clonar el repositorio**
   Abre tu terminal y descarga el código:
   ```bash
   git clone https://github.com/tutelopez/tutelopez-music-web.git
   cd tutelopez-music-web
   ```

2. **Instalar dependencias**
   Instala todas las librerías necesarias ejecutando:
   ```bash
   npm install
   ```

3. **Iniciar el servidor local de desarrollo**
   Una vez instalado todo, enciende el servidor con:
   ```bash
   npm run dev
   ```
   *¡Listo! Abre `http://localhost:4321` en tu navegador para ver y editar la página en tiempo real.*

## 📦 Despliegue a Producción

### En Servidor VPS (Nginx / Apache)
Para compilar la página y generar los archivos finales optimizados para producción:

```bash
npm run build
```

Esto generará una carpeta llamada `dist/` en la raíz de tu proyecto. Simplemente copia el contenido de esta carpeta hacia la ruta pública de tu servidor (ej. `/var/www/html/tutelopez`) y configura Nginx para que sirva esos archivos.

### En Vercel o Netlify
Si prefieres un entorno sin servidores, simplemente conecta este repositorio de GitHub a tu cuenta de Vercel y se desplegará automáticamente.

## 📝 Gestión de Contenido (Sanity CMS)

Para publicar un nuevo recurso en la web no hace falta tocar el código:
1. Accede a tu [Panel de Control en Sanity](https://sanity.io).
2. Crea un nuevo **Resource**.
3. Completa los campos solicitados:
   - **Title**: El nombre de la plantilla.
   - **Slug**: La URL (toca "Generate" para que se llene solo).
   - **Category**: Mainstage, Kontakt, Sintetizadores, etc.
   - **Description**: Texto corto para la tarjeta.
   - **Main Image**: La miniatura del post.
   - **Content**: El cuerpo de texto detallado del recurso.
   - **YouTube Video ID**: Por ejemplo, si el link es `youtube.com/watch?v=dQw4w9WgXcQ`, pon solo `dQw4w9WgXcQ`.
   - **Download Link**: Tu link hacia Telegram o tu acortador.
4. Toca **Publish**.
