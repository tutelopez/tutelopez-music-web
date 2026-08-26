import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@sanity/client';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Sanity Client
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2024-03-01',
  token: process.env.SANITY_EDITOR_TOKEN, // Required for writing
});

// Commands
bot.start((ctx) => {
    ctx.reply(
        `¡Hola ${ctx.from.first_name}! Bienvenido al asistente de TuteLopez Music 🎹\n\n` +
        `Aquí tienes lo que puedo hacer por ti:\n` +
        `🔍 /buscar [recurso] - Busca librerías y plantillas.\n` +
        `❓ /ayuda - Respuestas rápidas y tutoriales.\n` +
        `📩 /pedir [recurso] - Pide una librería que no encuentres.\n` +
        `🔔 /suscribirme - Recibe alertas de nuevos recursos VIP.`,
        Markup.keyboard([
            ['🔍 Buscar', '❓ Ayuda'],
            ['📩 Pedir recurso', '🔔 Suscribirme']
        ]).resize()
    );
});

// Mensaje de Bienvenida a nuevos miembros del grupo
bot.on('new_chat_members', (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    for (const member of newMembers) {
        // Evitar que el bot se salude a sí mismo
        if (member.id === ctx.botInfo.id) continue;
        
        ctx.reply(
            `¡Bienvenido/a ${member.first_name} a la comunidad de TuteLopez Music! 🎉\n\n` +
            `Aquí compartimos librerías, plantillas y recursos para tecladistas.\n\n` +
            `🔹 Visita nuestra web oficial para descargas directas:\nhttps://tutelopezmusic.com\n\n` +
            `🔹 Usa el comando /ayuda para ver tutoriales o búscame por mensaje privado para descargar recursos.`,
            { disable_web_page_preview: true }
        );
    }
});

// Auto-respuesta rápida para la contraseña
bot.hears(/(contraseña|password|clave|pass)/i, (ctx) => {
    // Solo responder si no es un comando y si estamos en un grupo/canal o el bot fue etiquetado/respondido
    if (ctx.message.text && ctx.message.text.startsWith('/')) return;
    ctx.reply('🔑 Recuerda que la contraseña para descomprimir todos nuestros archivos es:\n\n`tutelopezmusic`', { parse_mode: 'Markdown' });
});

// Ayuda y Tutoriales
bot.command('ayuda', (ctx) => showHelpMenu(ctx));
bot.hears('❓ Ayuda', (ctx) => showHelpMenu(ctx));

function showHelpMenu(ctx) {
    ctx.reply('¿En qué te puedo ayudar hoy?', Markup.inlineKeyboard([
        [Markup.button.callback('🔑 Clave de Archivos RAR/ZIP', 'faq_password')],
        [Markup.button.callback('🍏 Optimizar Mac / MainStage', 'faq_mainstage')],
        [Markup.button.callback('🎹 Abrir librerías en Kontakt', 'faq_kontakt')],
        [Markup.button.callback('⚠️ Error límite en Terabox', 'faq_terabox')]
    ]));
}

bot.action('faq_password', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🔑 La contraseña para descomprimir todos nuestros archivos es:\n\n`tutelopezmusic`', { parse_mode: 'Markdown' });
});

bot.action('faq_mainstage', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🍏 ¿MainStage se corta o consume mucha RAM? Tenemos dos tutoriales para ti:\n\n1. Optimizar Mac para en vivo: https://tutelopezmusic.com/tutoriales/como-optimizar-tu-mac-para-usar-mainstage-en-vivo-sin-cortes\n\n2. Optimizar con Alias: https://tutelopezmusic.com/tutoriales/optimizar-mainstage-alias-memoria-ram');
});

bot.action('faq_kontakt', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🎹 Aprende a agregar e instalar cualquier instrumento o librería en Kontakt usando MainStage aquí:\n\nhttps://tutelopezmusic.com/tutoriales/abrir-librerias-kontakt-mainstage');
});

bot.action('faq_terabox', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('⚠️ Si Terabox te dice que excediste el límite, solo debes crearte una cuenta gratuita en Terabox e iniciar sesión. ¡O puedes descargar la app móvil y guardar el archivo en tu cuenta para bajarlo a la PC luego!');
});

// Suscripción
bot.command('suscribirme', (ctx) => subscribeUser(ctx));
bot.hears('🔔 Suscribirme', (ctx) => subscribeUser(ctx));

async function subscribeUser(ctx) {
    const userId = ctx.from.id;
    try {
        const existing = await client.fetch(`*[_type == "subscriber" && userId == $userId][0]`, { userId });
        if (existing) {
            return ctx.reply('Ya estabas suscrito a las alertas. 😉');
        }
        
        await client.create({
            _type: 'subscriber',
            userId: userId,
            joinedAt: new Date().toISOString()
        });
        
        ctx.reply('✅ ¡Te has suscrito correctamente! Serás de los primeros en enterarte cuando subamos recursos VIP.');
    } catch (error) {
        console.error("Error en suscripción:", error);
        ctx.reply('Hubo un error al suscribirte. Inténtalo más tarde.');
    }
}

// Búsqueda
bot.command('buscar', async (ctx) => {
    const query = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!query) return ctx.reply('Por favor, escribe lo que quieres buscar. Ejemplo: `/buscar piano`', { parse_mode: 'Markdown' });
    await handleSearch(ctx, query);
});
bot.hears('🔍 Buscar', (ctx) => {
    ctx.reply('Por favor, dime qué recurso quieres buscar usando el comando:\n`/buscar [nombre]`', { parse_mode: 'Markdown' });
});

async function handleSearch(ctx, query) {
    try {
        ctx.reply('🔍 Buscando en nuestra base de datos...');
        const sanityQuery = `*[_type in ["resource", "tutorial"] && (title match $query || category match $query || tags[] match $query)][0...5]{
            title,
            _type,
            "slug": slug.current,
            category
        }`;
        
        const results = await client.fetch(sanityQuery, { query: `*${query}*` });
        
        if (results.length === 0) {
            return ctx.reply(`😔 No encontré nada con ese nombre. ¡Puedes pedirlo usando el comando \`/pedir ${query}\`!`, { parse_mode: 'Markdown' });
        }

        let response = `Encontré estos resultados para "*${query}*":\n\n`;
        results.forEach(item => {
            const baseUrl = item._type === 'tutorial' ? 'https://tutelopezmusic.com/tutoriales' : 'https://tutelopezmusic.com/recursos';
            response += `🎹 *${item.title}*\n🔗 ${baseUrl}/${item.slug}\n\n`;
        });
        
        ctx.reply(response, { parse_mode: 'Markdown', disable_web_page_preview: true });

    } catch (error) {
        console.error(error);
        ctx.reply('Hubo un error al buscar. Intenta de nuevo más tarde.');
    }
}

// Pedir recurso
bot.command('pedir', async (ctx) => {
    const peticion = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!peticion) return ctx.reply('Escribe lo que quieres pedir. Ejemplo: `/pedir Nord Stage 4`', { parse_mode: 'Markdown' });
    
    try {
        await client.create({
            _type: 'request',
            user: ctx.from.first_name || 'Usuario',
            username: ctx.from.username || 'N/A',
            text: peticion,
            date: new Date().toISOString()
        });
        
        ctx.reply(`✅ ¡Anotado! He guardado tu petición de: "${peticion}". TuteLopez la verá pronto.`);
    } catch (error) {
        console.error("Error al guardar petición:", error);
        ctx.reply('Hubo un error al guardar tu petición.');
    }
});
bot.hears('📩 Pedir recurso', (ctx) => {
    ctx.reply('Dime qué recurso te gustaría que subamos usando el comando:\n`/pedir [nombre del recurso]`', { parse_mode: 'Markdown' });
});

// Admin commands
bot.command('ver_peticiones', async (ctx) => {
    try {
        const requests = await client.fetch(`*[_type == "request"] | order(date desc)[0...15]`);
        if (requests.length === 0) return ctx.reply('No hay peticiones nuevas.');
        
        let msg = '📋 *Últimas peticiones:*\n\n';
        requests.forEach((r, i) => {
            msg += `${i+1}. ${r.text} (por ${r.user})\n`;
        });
        ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error("Error fetching requests:", error);
    }
});

bot.command('broadcast', async (ctx) => {
    const message = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!message) return ctx.reply('Escribe el mensaje. Ejemplo: `/broadcast ¡Nuevo piano disponible!`', { parse_mode: 'Markdown' });
    
    try {
        const subscribers = await client.fetch(`*[_type == "subscriber"].userId`);
        let sent = 0;
        
        const sendPromises = subscribers.map(userId => 
            bot.telegram.sendMessage(userId, `📢 *Anuncio TuteLopez Music:*\n\n${message}`, { parse_mode: 'Markdown' })
                .then(() => { sent++; })
                .catch(e => console.log(`Failed to send to ${userId}`))
        );
        
        await Promise.allSettled(sendPromises);
        ctx.reply(`✅ Mensaje enviado a ${sent} suscriptores.`);
    } catch (error) {
        console.error("Broadcast error:", error);
        ctx.reply("Error enviando el broadcast.");
    }
});

// Entrypoint para Vercel (Serverless Function)
export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).json({ status: 'ok' });
        } catch (error) {
            console.error('Error handling update:', error);
            res.status(500).json({ error: 'Failed to process update' });
        }
    } else {
        res.status(200).json({ status: 'Bot Webhook Endpoint' });
    }
}
