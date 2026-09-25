import { Telegraf } from 'telegraf';
import { createClient } from '@sanity/client';

const bot = new Telegraf(process.env.BOT_TOKEN);

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2024-03-01',
  token: process.env.SANITY_EDITOR_TOKEN
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).json({ status: 'Sanity Webhook Endpoint' });
    }

    try {
        const body = req.body || {};
        const secret = process.env.SANITY_WEBHOOK_SECRET;

        // Validación de secreto opcional
        if (secret) {
            const authHeader = req.headers['authorization'] || req.headers['sanity-webhook-secret'];
            if (authHeader !== secret && authHeader !== `Bearer ${secret}`) {
                return res.status(401).json({ error: 'Unauthorized secret' });
            }
        }

        console.log('Sanity Webhook recibido para:', body._type, body._id, body.title);

        const docType = body._type;
        const docId = body._id || '';
        const isDraft = docId.startsWith('drafts.');
        const slug = body.slug?.current || body.slug || '';
        const title = body.title || 'Nuevo Recurso';
        const category = (body.category || 'Recurso').toUpperCase();

        let deployTriggered = false;
        let subscribersNotified = 0;

        // 1. DISPARAR VERCEL DEPLOY HOOK
        // Si hay una URL de Deploy Hook configurada en Vercel
        const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
        if (deployHookUrl && !isDraft) {
            try {
                console.log('Disparando Vercel Deploy Hook...');
                const deployRes = await fetch(deployHookUrl, { method: 'POST' });
                deployTriggered = deployRes.ok;
                console.log('Deploy Hook respuesta:', deployRes.status);
            } catch (deployErr) {
                console.error('Error disparando Vercel Deploy Hook:', deployErr);
            }
        }

        // 2. DIFUSIÓN AUTOMÁTICA A SUSCRIPTORES VIP EN TELEGRAM
        // Solo notificar si es un recurso o tutorial publicado (no borrador)
        if (!isDraft && (docType === 'resource' || docType === 'tutorial') && slug) {
            try {
                const subscribers = await client.fetch(`*[_type == "subscriber"].userId`);
                const pagePath = docType === 'tutorial' ? 'tutoriales' : 'recursos';
                const resourceUrl = `https://tutelopezmusic.com/${pagePath}/${slug}`;

                const alertMessage = 
                    `🎹 *¡Nuevo recurso disponible en TuteLopez Music!* 🎉\n\n` +
                    `🔥 *${title}*\n` +
                    `📂 Categoría: *${category}*\n\n` +
                    `${body.description ? `${body.description.slice(0, 180)}...\n\n` : ''}` +
                    `Descárgalo gratis ahora en nuestra web oficial:\n` +
                    `🔗 ${resourceUrl}`;

                const sendPromises = subscribers.map(userId =>
                    bot.telegram.sendMessage(userId, alertMessage, {
                        parse_mode: 'Markdown',
                        disable_web_page_preview: false
                    })
                    .then(() => { subscribersNotified++; })
                    .catch(err => console.log(`No se pudo enviar alerta a ${userId}:`, err.message))
                );

                await Promise.allSettled(sendPromises);
                console.log(`Alertas enviadas a ${subscribersNotified} suscriptores.`);
            } catch (notifyErr) {
                console.error('Error enviando broadcast a suscriptores:', notifyErr);
            }
        }

        // 3. AVISAR AL ADMINISTRADOR
        const adminId = process.env.ADMIN_ID || process.env.TELEGRAM_ADMIN_ID;
        if (adminId && !isDraft) {
            try {
                await bot.telegram.sendMessage(
                    adminId,
                    `🚀 *Publicación procesada desde Sanity*\n\n` +
                    `🎹 *${title}*\n` +
                    `⚙️ Rebuild Vercel: ${deployTriggered ? '✅ Disparado' : 'ℹ️ No configurado'}\n` +
                    `👥 Suscriptores notificados: ${subscribersNotified}\n\n` +
                    `🔗 https://tutelopezmusic.com/recursos/${slug}`,
                    { parse_mode: 'Markdown' }
                );
            } catch (adminErr) {}
        }

        return res.status(200).json({
            status: 'ok',
            docId,
            deployTriggered,
            subscribersNotified
        });

    } catch (error) {
        console.error('Error en Sanity Webhook handler:', error);
        return res.status(500).json({ error: error.message });
    }
}
