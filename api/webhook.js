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

// Helper de Administrador
function isAdmin(ctx) {
    const adminId = process.env.ADMIN_ID || process.env.TELEGRAM_ADMIN_ID;
    const adminUser = (process.env.ADMIN_USERNAME || process.env.TELEGRAM_ADMIN_USERNAME || '').replace('@', '').toLowerCase();
    
    // Si no hay variables de admin configuradas, se permite en chat privado para no bloquear al dueño
    if (!adminId && !adminUser) {
        return ctx.chat && ctx.chat.type === 'private';
    }
    
    const isIdMatch = adminId && ctx.from && String(ctx.from.id) === String(adminId);
    const isUserMatch = adminUser && ctx.from && ctx.from.username && ctx.from.username.toLowerCase() === adminUser;
    
    return Boolean(isIdMatch || isUserMatch);
}

// Helpers para Estado de Mensajes Diarios en Sanity
async function getBotSettings() {
    try {
        const settings = await client.fetch(`*[_id == "bot_settings"][0]`);
        return settings || { dailyCronPaused: false };
    } catch (e) {
        console.error('Error fetching bot_settings:', e);
        return { dailyCronPaused: false };
    }
}

async function setDailyCronPaused(paused, user) {
    const doc = {
        _id: 'bot_settings',
        _type: 'botSettings',
        dailyCronPaused: paused,
        updatedAt: new Date().toISOString(),
        updatedBy: user || 'Admin'
    };
    return await client.createOrReplace(doc);
}

// Commands
bot.start((ctx) => {
    let msg = `¡Hola ${ctx.from.first_name}! Bienvenido al asistente de TuteLopez Music 🎹\n\n` +
        `Aquí tienes lo que puedo hacer por ti:\n` +
        `🔍 /buscar [recurso] - Busca librerías y plantillas.\n` +
        `❓ /ayuda - Respuestas rápidas y tutoriales.\n` +
        `📩 /pedir [recurso] - Pide una librería que no encuentres.\n` +
        `🔔 /suscribirme - Recibe alertas de nuevos recursos VIP.`;
        
    const keyboardRows = [
        ['🔍 Buscar', '❓ Ayuda'],
        ['📩 Pedir recurso', '🔔 Suscribirme']
    ];

    if (isAdmin(ctx)) {
        msg += `\n\n🛠 *Comandos de Control / Admin:*\n` +
               `⚙️ /panel - Control de mensajes diarios (Pausar/Reanudar)\n` +
               `⏸ /pausar - Pausar mensajes automáticos diarios\n` +
               `▶️ /despausar - Reanudar mensajes automáticos diarios\n` +
               `📊 /estado - Ver estado actual de mensajes\n` +
               `📢 /enviar_ahora - Publicar un recurso ahora al canal\n` +
               `📋 /ver_peticiones - Ver peticiones de usuarios\n` +
               `💬 /broadcast - Enviar anuncio a suscriptores\n` +
               `🆔 /mi_id - Ver tu ID de Telegram\n\n` +
               `📥 *Crear borradores en Sanity:* Reenvíame aquí cualquier post del canal con foto y enlaces, y lo convertiré automáticamente en borrador en Sanity.`;
        keyboardRows.push(['⚙️ Panel de Control', '📊 Estado']);
    }

    ctx.reply(msg, {
        parse_mode: 'Markdown',
        ...Markup.keyboard(keyboardRows).resize()
    });
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
    if (!isAdmin(ctx)) return ctx.reply('⛔ No tienes permisos para usar este comando.');
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
    if (!isAdmin(ctx)) return ctx.reply('⛔ No tienes permisos para usar este comando.');
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

// Control de publicaciones automáticas
async function sendControlPanel(ctx, isEdit = false) {
    if (!isAdmin(ctx)) {
        return ctx.reply('⛔ No tienes permisos para ver el panel de control.');
    }
    try {
        const settings = await getBotSettings();
        const isPaused = settings.dailyCronPaused === true;
        const statusIcon = isPaused ? '⏸' : '✅';
        const statusText = isPaused ? '*PAUSADOS*' : '*ACTIVOS*';
        const dateStr = settings.updatedAt ? new Date(settings.updatedAt).toLocaleString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' }) : 'N/A';
        const userStr = settings.updatedBy || 'N/A';

        const text = `⚙️ *Panel de Control - Mensajes Automáticos Diarios*\n\n` +
                     `📡 Estado actual: ${statusIcon} ${statusText}\n` +
                     `⏰ Horario programado: 18:00 UTC (diario)\n` +
                     `👤 Modificado por: ${userStr}\n` +
                     `📅 Último cambio: ${dateStr}\n\n` +
                     `¿Qué deseas hacer? Elige una opción abajo:`;

        const keyboard = Markup.inlineKeyboard([
            [
                isPaused 
                    ? Markup.button.callback('▶️ Reactivar Mensajes Diarios', 'cron_resume')
                    : Markup.button.callback('⏸ Pausar Mensajes Diarios', 'cron_pause')
            ],
            [
                Markup.button.callback('🔄 Actualizar Estado', 'cron_status'),
                Markup.button.callback('📢 Publicar Recurso Ahora', 'cron_trigger_now')
            ]
        ]);

        if (isEdit) {
            try {
                await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
            } catch (err) {
                // Ignore if content hasn't changed
            }
        } else {
            await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
        }
    } catch (e) {
        console.error('Error al generar panel de control:', e);
        ctx.reply('❌ Error al consultar la configuración en Sanity.');
    }
}

async function sendDailyPostNow(ctx) {
    try {
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
            ctx.reply(`✅ Post enviado con éxito al canal @tutelopezmusic:\n\n*${randomResource.title}*`, { parse_mode: 'Markdown' });
        } else {
            ctx.reply('⚠️ No se encontraron recursos en Sanity.');
        }
    } catch (error) {
        console.error('Error al forzar post:', error);
        ctx.reply(`❌ Error al enviar post: ${error.message}`);
    }
}

// Comandos de control
bot.command(['panel', 'control'], (ctx) => sendControlPanel(ctx));
bot.hears('⚙️ Panel de Control', (ctx) => sendControlPanel(ctx));

bot.command(['estado', 'estado_diario'], (ctx) => sendControlPanel(ctx));
bot.hears('📊 Estado', (ctx) => sendControlPanel(ctx));

bot.command(['pausar', 'pausar_diario'], async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ No tienes permisos para usar este comando.');
    try {
        const userTag = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || 'Admin');
        await setDailyCronPaused(true, userTag);
        ctx.reply('⏸ *Mensajes automáticos diarios PAUSADOS.*\n\nEl bot no enviará el recurso automático diario a las 18:00 UTC al canal hasta que los reactives con /despausar.', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('▶️ Reactivar Mensajes', 'cron_resume')],
                [Markup.button.callback('⚙️ Panel de Control', 'cron_status')]
            ])
        });
    } catch (e) {
        console.error('Error al pausar:', e);
        ctx.reply('❌ Error al actualizar la configuración en Sanity.');
    }
});

bot.command(['despausar', 'reanudar', 'activar', 'activar_diario'], async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ No tienes permisos para usar este comando.');
    try {
        const userTag = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || 'Admin');
        await setDailyCronPaused(false, userTag);
        ctx.reply('▶️ *Mensajes automáticos diarios ACTIVADOS.*\n\nEl bot continuará enviando el recurso diario al canal a las 18:00 UTC con normalidad.', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⏸ Pausar Mensajes', 'cron_pause')],
                [Markup.button.callback('⚙️ Panel de Control', 'cron_status')]
            ])
        });
    } catch (e) {
        console.error('Error al despausar:', e);
        ctx.reply('❌ Error al actualizar la configuración en Sanity.');
    }
});

bot.command(['enviar_ahora', 'post_diario'], async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ No tienes permisos para usar este comando.');
    await sendDailyPostNow(ctx);
});

bot.command('mi_id', (ctx) => {
    ctx.reply(`🆔 Tu Telegram ID es: \`${ctx.from.id}\`\n👤 Tu usuario: @${ctx.from.username || 'sin_username'}`, { parse_mode: 'Markdown' });
});

// Callbacks de los botones del panel
bot.action('cron_pause', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos.');
    await ctx.answerCbQuery('Pausando publicaciones...');
    const userTag = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || 'Admin');
    await setDailyCronPaused(true, userTag);
    await sendControlPanel(ctx, true);
});

bot.action('cron_resume', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos.');
    await ctx.answerCbQuery('Reactivando publicaciones...');
    const userTag = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || 'Admin');
    await setDailyCronPaused(false, userTag);
    await sendControlPanel(ctx, true);
});

bot.action('cron_status', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos.');
    await ctx.answerCbQuery('Actualizado');
    await sendControlPanel(ctx, true);
});

bot.action('cron_trigger_now', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos.');
    await ctx.answerCbQuery('Enviando publicación al canal...');
    await sendDailyPostNow(ctx);
});

// ==========================================
// PARSERS Y PROCESADOR DE POSTS A SANITY
// ==========================================

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 90) || ('recurso-' + Date.now());
}

function extractTitle(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return 'Nuevo Recurso';
    let firstLine = lines[0];
    firstLine = firstLine.replace(/[*_`~#]/g, '');
    firstLine = firstLine.replace(/^[\p{Emoji}\p{Symbol}\s\-:|]+/gu, '').trim();
    if (firstLine.length < 3 && lines.length > 1) {
        firstLine = lines[1].replace(/[*_`~#]/g, '').replace(/^[\p{Emoji}\p{Symbol}\s\-:|]+/gu, '').trim();
    }
    return firstLine || 'Nuevo Recurso';
}

function detectCategory(text) {
    const lower = (text || '').toLowerCase();
    if (lower.includes('kontakt') || lower.includes('.nki') || lower.includes('nicnt')) return 'kontakt';
    if (lower.includes('mainstage') || lower.includes('.concert') || lower.includes('.patch')) return 'mainstage';
    if (lower.includes('sf2') || lower.includes('soundfont')) return 'sf2';
    if (lower.includes('ipad') || lower.includes('iphone') || lower.includes('garageband') || lower.includes('cubasis')) return 'appsmoviles';
    if (lower.includes('synth') || lower.includes('sintetizador') || lower.includes('serum') || lower.includes('vital') || lower.includes('nord') || lower.includes('yamaha') || lower.includes('korg') || lower.includes('roland')) return 'sintetizadores';
    if (lower.includes('sample') || lower.includes('pad') || lower.includes('loops') || lower.includes('secuencias')) return 'samplesmoviles';
    if (lower.includes('tutorial') || lower.includes('guía') || lower.includes('guia')) return 'tutoriales';
    if (lower.includes('software') || lower.includes('daw') || lower.includes('vst') || lower.includes('plugin')) return 'software';
    return 'mainstage';
}

function extractDescription(text, title) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const filtered = lines.filter(line => {
        const l = line.toLowerCase();
        if (l.includes('http://') || l.includes('https://') || l.includes('t.me/')) return false;
        if (l.includes('contraseña') || l.includes('password') || l.includes('clave')) return false;
        return true;
    });

    if (filtered.length > 0 && filtered[0].toLowerCase().includes(title.toLowerCase().slice(0, 15))) {
        filtered.shift();
    }

    const desc = filtered.join('\n\n').trim();
    return desc || `Recurso ${title} listo para descargar y usar en tus proyectos de adoración en vivo.`;
}

function extractLinks(msg, text) {
    let teraboxLink = null;
    let telegramLink = null;

    // 1. Regex para Terabox
    const teraboxRegex = /https?:\/\/(?:www\.)?(?:terabox\.com|1024tera\.com|teraboxapp\.com|freeterabox\.com|terasharelink\.com|nephobox\.com|mirrobox\.com)\S+/i;
    const match = text.match(teraboxRegex);
    if (match) {
        teraboxLink = match[0].replace(/[)\]>,.]+$/, '');
    }

    // 2. Entidades de texto
    const entities = msg.caption_entities || msg.entities || [];
    for (const entity of entities) {
        if (entity.type === 'text_link' && entity.url) {
            if (/terabox|1024tera|nephobox|mirrobox|freeterabox/i.test(entity.url)) {
                teraboxLink = entity.url;
            } else if (/t\.me\//i.test(entity.url)) {
                telegramLink = entity.url;
            }
        }
    }

    // 3. Enlace de Telegram
    if (!telegramLink) {
        if (msg.forward_origin && msg.forward_origin.type === 'channel' && msg.forward_origin.chat?.username) {
            telegramLink = `https://t.me/${msg.forward_origin.chat.username}/${msg.forward_origin.message_id}`;
        } else if (msg.forward_from_chat?.username && msg.forward_from_message_id) {
            telegramLink = `https://t.me/${msg.forward_from_chat.username}/${msg.forward_from_message_id}`;
        } else if (msg.chat?.username && msg.message_id) {
            telegramLink = `https://t.me/${msg.chat.username}/${msg.message_id}`;
        }
    }

    return { teraboxLink, telegramLink };
}

async function processAndCreateDraft(msg) {
    const text = msg.caption || msg.text || '';

    // Buscar foto
    let photoFileId = null;
    if (msg.photo && msg.photo.length > 0) {
        photoFileId = msg.photo[msg.photo.length - 1].file_id;
    } else if (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith('image/')) {
        photoFileId = msg.document.file_id;
    }

    if (!photoFileId) {
        throw new Error('El mensaje no contiene una foto de portada. En Sanity la imagen es obligatoria.');
    }

    // 1. Descargar imagen y subir a Sanity Assets
    const fileLink = await bot.telegram.getFileLink(photoFileId);
    const res = await fetch(fileLink.href);
    if (!res.ok) throw new Error(`No se pudo descargar la imagen desde Telegram: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const asset = await client.assets.upload('image', buffer, {
        filename: `tg_${Date.now()}.jpg`,
        contentType: res.headers.get('content-type') || 'image/jpeg'
    });

    // 2. Extraer metadatos
    const title = extractTitle(text);
    const slugCurrent = slugify(title);
    const category = detectCategory(text);
    const description = extractDescription(text, title);
    const { teraboxLink, telegramLink } = extractLinks(msg, text);

    const rawTags = (text.match(/#(\w+)/g) || []).map(t => t.replace('#', '').toLowerCase());
    const tags = [...new Set([category, ...rawTags])];

    // 3. Comprobar si ya existe
    const existing = await client.fetch(`*[_type == "resource" && (slug.current == $slug || title == $title)][0]`, {
        slug: slugCurrent,
        title: title
    });

    // 4. Crear documento en borrador (Draft)
    const draftId = `drafts.${slugCurrent}`;
    const doc = {
        _id: draftId,
        _type: 'resource',
        title: title,
        slug: {
            _type: 'slug',
            current: slugCurrent
        },
        category: category,
        description: description,
        tags: tags,
        mainImage: {
            _type: 'image',
            asset: {
                _type: 'reference',
                _ref: asset._id
            }
        },
        downloadLink: telegramLink || undefined,
        teraboxLink: teraboxLink || undefined
    };

    await client.createOrReplace(doc);

    return {
        title,
        category,
        slug: slugCurrent,
        teraboxLink,
        telegramLink,
        tags,
        isExisting: Boolean(existing)
    };
}

// Manejador cuando el admin reenvía o envía fotos en chat privado
bot.on(['photo', 'document'], async (ctx, next) => {
    if (ctx.chat && ctx.chat.type === 'private') {
        if (!isAdmin(ctx)) return next();

        try {
            await ctx.reply('⏳ Procesando publicación... Descargando portada y subiendo a Sanity.');
            const result = await processAndCreateDraft(ctx.message);

            let msg = `✅ *¡Borrador creado en Sanity!*\n\n` +
                      `🎹 *Título:* ${result.title}\n` +
                      `📂 *Categoría:* \`${result.category}\`\n` +
                      `📝 *Slug:* \`${result.slug}\`\n` +
                      `📦 *Terabox:* ${result.teraboxLink ? `[Detectado](${result.teraboxLink})` : '⚠️ No detectado'}\n` +
                      `✈️ *Telegram:* ${result.telegramLink ? `[Detectado](${result.telegramLink})` : '⚠️ No detectado'}\n` +
                      `🏷 *Tags:* #${result.tags.join(' #')}\n\n` +
                      `📌 *Estado:* Guardado como Borrador (Draft).\n` +
                      `Ya puedes entrar a Sanity Studio para revisarlo y publicarlo cuando quieras:`;

            if (result.isExisting) {
                msg += `\n\n⚠️ *Nota:* Ya existía un recurso similar en Sanity. Se actualizó el borrador de trabajo.`;
            }

            await ctx.reply(msg, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                ...Markup.inlineKeyboard([
                    [Markup.button.url('📝 Abrir Sanity Studio', 'https://tutelopezmusic.com/admin')]
                ])
            });
        } catch (error) {
            console.error('Error al procesar reenvío en privado:', error);
            await ctx.reply(`❌ No se pudo procesar la publicación: ${error.message}`);
        }
        return;
    }
    return next();
});

// Advertencia si reenvían un mensaje de solo texto sin foto
bot.on('message', async (ctx, next) => {
    if (ctx.chat && ctx.chat.type === 'private' && isAdmin(ctx)) {
        const isForwarded = Boolean(ctx.message.forward_origin || ctx.message.forward_from_chat || ctx.message.forward_date);
        if (isForwarded && !ctx.message.photo && !ctx.message.document) {
            return ctx.reply('⚠️ Has reenviado un mensaje de solo texto sin imagen.\n\nEn Sanity la imagen de portada es obligatoria. Por favor reenvía la publicación que contiene la foto de portada del recurso.');
        }
    }
    return next();
});

// Manejador en tiempo real para publicaciones directas en el canal
bot.on('channel_post', async (ctx) => {
    try {
        const msg = ctx.channelPost;
        const text = msg.caption || msg.text || '';
        
        // Solo procesar si tiene foto
        if (!msg.photo && (!msg.document || !msg.document.mime_type?.startsWith('image/'))) {
            return;
        }

        const isResource = /terabox|1024tera|descarga|download|kontakt|mainstage|librer|patch|piano|synth/i.test(text);
        if (!isResource) return;

        const result = await processAndCreateDraft(msg);
        console.log(`Borrador creado automáticamente desde canal para: ${result.title}`);

        const adminId = process.env.ADMIN_ID || process.env.TELEGRAM_ADMIN_ID;
        if (adminId) {
            await bot.telegram.sendMessage(
                adminId,
                `📢 *Nuevo recurso detectado en el canal y guardado como borrador:*\n\n` +
                `🎹 *${result.title}*\n` +
                `📂 Categoría: \`${result.category}\`\n\n` +
                `🔗 Revisa y publica aquí: https://tutelopezmusic.com/admin`,
                { parse_mode: 'Markdown' }
            );
        }
    } catch (e) {
        console.error('Error procesando channel_post automático:', e);
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
