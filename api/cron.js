import { Telegraf } from 'telegraf';
import { createClient } from '@sanity/client';

const bot = new Telegraf(process.env.BOT_TOKEN);

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2024-03-01'
});

export default async function handler(req, res) {
    // Basic security check (Vercel Cron automatically adds an Authorization header)
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
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
                            `Descárgalo gratis y ayúdanos visitando la web:\n` +
                            `🔗 https://tutelopezmusic.com/recursos/${randomResource.slug}`;
            
            await bot.telegram.sendMessage('@tutelopezmusic', message, { parse_mode: 'Markdown', disable_web_page_preview: false });
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
