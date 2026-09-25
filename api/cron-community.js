import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@sanity/client';

const bot = new Telegraf(process.env.BOT_TOKEN);

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2024-03-01',
  token: process.env.SANITY_EDITOR_TOKEN
});

export const COMMUNITY_LINK = 'https://t.me/+O4dufR129f4yZWE5';

export const COMMUNITY_TEMPLATES = [
    {
        title: "💬 ¡Únete a nuestra Comunidad de Músicos & Tecladistas! 🎹",
        body: "En este canal compartimos los recursos para descargar, pero en nuestro **Grupo Oficial** charlamos todos los días.\n\n" +
              "🔥 *¿Qué hacemos en el grupo?*\n" +
              "• 🎹 Resolver dudas de MainStage, Kontakt, iPad y sintes\n" +
              "• 📂 Compartir patches, presets y librerías entre colegas\n" +
              "• 💡 Ayudarnos mutuamente con configuraciones en vivo\n" +
              "• 🤝 Conectar con otros tecladistas y productores\n\n" +
              "¡No te quedes afuera y súmate a la conversación!",
        btn: "💬 Entrar al Grupo de la Comunidad"
    },
    {
        title: "👥 ¡No toques solo! Haz parte de la Comunidad 🎹🔥",
        body: "¿Tienes dudas con tus configuraciones en vivo o quieres recomendar una librería que te encanta?\n\n" +
              "En el canal no se puede escribir para no saturar con notificaciones, ¡pero creamos este **Grupo Especial** para que todos podamos interactuar!\n\n" +
              "✨ Pasa a saludar, presenta tu setup o comparte tus archivos.",
        btn: "🚀 Unirme al Grupo Oficial"
    },
    {
        title: "🎹 ¿Buscabas un espacio para charlar de música y sintes? 💬",
        body: "¡Nuestra comunidad en Telegram sigue creciendo!\n\n" +
              "Únete a nuestro grupo para:\n" +
              "✅ Charlar de teclados, controladores y equipo\n" +
              "✅ Pedir y compartir presets de worship\n" +
              "✅ Recibir consejos para optimizar tu sonido en vivo\n\n" +
              "¡Toca el botón abajo para ingresar gratis!",
        btn: "👥 Unirse a la Charla"
    }
];

export function getRandomCommunityPost() {
    const template = COMMUNITY_TEMPLATES[Math.floor(Math.random() * COMMUNITY_TEMPLATES.length)];
    const text = `*${template.title}*\n\n${template.body}`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url(template.btn, COMMUNITY_LINK)],
        [Markup.button.url('🌐 Explorar la Web', 'https://tutelopezmusic.com')]
    ]);
    return { text, keyboard, title: template.title };
}

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('Verificando estado de publicaciones automáticas...');
        
        const settings = await client.fetch(`*[_id == "bot_settings"][0]`);
        if (settings && settings.dailyCronPaused === true) {
            console.log('Mensajes automáticos pausados desde Telegram. Omitiendo envío de comunidad.');
            return res.status(200).json({ status: 'paused', message: 'Mensajes pausados desde el bot' });
        }

        console.log('Enviando mensaje de comunidad al canal...');
        const { text, keyboard, title } = getRandomCommunityPost();

        await bot.telegram.sendMessage('@tutelopezmusic', text, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            ...keyboard
        });

        console.log('Invitación a la comunidad enviada con éxito al canal.');
        return res.status(200).json({ status: 'Community post sent', title });
    } catch (error) {
        console.error('Error en post automático de comunidad:', error);
        return res.status(500).json({ error: 'Failed to send community post' });
    }
}
