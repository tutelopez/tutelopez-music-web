import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@sanity/client';

const bot = new Telegraf(process.env.BOT_TOKEN);
const COMMUNITY_LINK = 'https://t.me/+O4dufR129f4yZWE5';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2024-03-01',
  token: process.env.SANITY_EDITOR_TOKEN
});

export default async function handler(req, res) {
    // Basic security check (Vercel Cron automatically adds an Authorization header)
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('Verificando estado de mensajes diarios...');
        
        // Verificar si las publicaciones diarias están pausadas
        const settings = await client.fetch(`*[_id == "bot_settings"][0]`);
        if (settings && settings.dailyCronPaused === true) {
            console.log('Mensajes automáticos diarios pausados desde Telegram. Omitiendo envío.');
            return res.status(200).json({ status: 'paused', message: 'Mensajes automáticos diarios pausados desde el bot' });
        }

        console.log('Ejecutando post automático diario...');
        
        const sanityQuery = `*[_type == "resource"]{
            title,
            "slug": slug.current,
            category
        }`;
        const resources = await client.fetch(sanityQuery);
        
        if (resources.length > 0) {
            const randomResource = resources[Math.floor(Math.random() * resources.length)];
            
            const message = `🎹 *¡Recurso Recomendado del Día!*\n\n` +
                            `🔥 *${randomResource.title}*\n` +
                            `📂 Categoría: ${randomResource.category.toUpperCase()}\n\n` +
                            `Descárgalo gratis y ayúdanos visitando la web:`;
            
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('📥 Descargar en la Web', `https://tutelopezmusic.com/recursos/${randomResource.slug}`)],
                [Markup.button.url('💬 Grupo de la Comunidad', COMMUNITY_LINK)]
            ]);

            await bot.telegram.sendMessage('@tutelopezmusic', message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: false,
                ...keyboard
            });
            console.log('Post enviado al canal con éxito.');
            
            return res.status(200).json({ status: 'Post sent', title: randomResource.title });
        } else {
            return res.status(200).json({ status: 'No resources found' });
        }
    } catch (error) {
        console.error('Error en post automático diario:', error);
        return res.status(500).json({ error: 'Failed to send post' });
    }
}
