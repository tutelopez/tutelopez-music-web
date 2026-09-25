import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@sanity/client';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Captura global de errores para que nunca muera en silencio
bot.catch((err, ctx) => {
    console.error('Error en Telegraf update:', err);
    try {
        ctx.reply(`❌ Ocurrió un error en el bot: ${err.message}`);
    } catch (e) {}
});

// Sanity Client
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2024-03-01',
  token: process.env.SANITY_EDITOR_TOKEN,
});

const COMMUNITY_LINK = 'https://t.me/+O4dufR129f4yZWE5';

const COMMUNITY_TEMPLATES = [
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

function getRandomCommunityPost() {
    const template = COMMUNITY_TEMPLATES[Math.floor(Math.random() * COMMUNITY_TEMPLATES.length)];
    const text = `*${template.title}*\n\n${template.body}`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.url(template.btn, COMMUNITY_LINK)],
        [Markup.button.url('🌐 Explorar la Web', 'https://tutelopezmusic.com')]
    ]);
    return { text, keyboard, title: template.title };
}

// Helper de Administrador
function isAdmin(ctx) {
    const adminId = process.env.ADMIN_ID || process.env.TELEGRAM_ADMIN_ID;
    const adminUser = (process.env.ADMIN_USERNAME || process.env.TELEGRAM_ADMIN_USERNAME || '').replace('@', '').trim().toLowerCase();
    
    // Si no hay variables de admin configuradas, se permite en chat privado para no bloquear al dueño
    if (!adminId && !adminUser) {
        return Boolean(ctx.chat && ctx.chat.type === 'private');
    }
    
    const isIdMatch = Boolean(adminId && ctx.from && String(ctx.from.id).trim() === String(adminId).trim());
    const isUserMatch = Boolean(adminUser && ctx.from && ctx.from.username && ctx.from.username.trim().toLowerCase() === adminUser);
    
    return isIdMatch || isUserMatch;
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

// Analizador inteligente con IA (Gemini) o Heurístico avanzado
async function analyzeResourceContent(text) {
    if (!text || typeof text !== 'string') {
        return {
            title: 'Nuevo Recurso',
            category: 'mainstage',
            description: 'Recurso listo para descargar.',
            tags: ['recursos', 'worship']
        };
    }

    // 1. Intentar con Gemini API si está configurada la clave
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
            const prompt = `Actúa como editor musical. Analiza esta publicación de Telegram y extrae un JSON estricto con:
- "title": Nombre o título limpio del recurso (máximo 4 a 6 palabras, ej: "Korg Gadget 2 para iPad", "Nord Stage 3 Pianos", "Moog Model 15"). Nunca devuelvas un párrafo entero como título.
- "category": una de ["mainstage", "kontakt", "sintetizadores", "tutoriales", "software", "appsmoviles", "sf2", "samplesmoviles"].
- "description": Resumen conciso y profesional de 1 a 2 oraciones para la página web (sin links ni contraseñas).
- "tags": Array de 3 a 5 tags relevantes en minúsculas.

Texto:
"${text.slice(0, 1500)}"`;

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.1
                    }
                })
            });

            if (res.ok) {
                const data = await res.json();
                const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (jsonText) {
                    const parsed = JSON.parse(jsonText);
                    if (parsed.title) {
                        return {
                            title: parsed.title.trim(),
                            category: parsed.category || detectCategory(text),
                            description: parsed.description || extractDescription(text, parsed.title),
                            tags: Array.isArray(parsed.tags) ? parsed.tags : [parsed.category || 'recursos']
                        };
                    }
                }
            }
        } catch (aiErr) {
            console.error('Fallo en Gemini API, usando analizador heurístico:', aiErr);
        }
    }

    // 2. Analizador Heurístico Avanzado (Fallback inteligente)
    const title = extractSmartTitle(text);
    const category = detectCategory(text);
    const description = extractDescription(text, title);
    const rawTags = (text.match(/#(\w+)/g) || []).map(t => t.replace('#', '').toLowerCase());
    const tags = [...new Set([category, ...rawTags])];

    return { title, category, description, tags };
}

function extractSmartTitle(text) {
    if (!text || typeof text !== 'string') return 'Nuevo Recurso';

    // A. Si la primera línea ya es un título corto y claro
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
        let firstLine = lines[0].replace(/[*_`~#]/g, '').trim();
        firstLine = firstLine.replace(/^[\p{Emoji}\p{Symbol}\s\-:|]+/gu, '').trim();
        const words = firstLine.split(/\s+/).filter(Boolean);
        if (words.length >= 2 && words.length <= 6 && !firstLine.endsWith('.') && !/^(hoy|les|para|esta|este|un|una)\b/i.test(firstLine)) {
            return firstLine;
        }
    }

    let raw = text.replace(/[*_`~#]/g, ' ').trim();
    raw = raw.replace(/^[\p{Emoji}\p{Symbol}\s\-:|]+/gu, '').trim();

    // B. Quitar intros típicas de saludo o anuncios
    const introRegex = /^(?:hola a todos,?|buen d[ií]a,?|buenas tardes,?|amigos,?|familia,?|hoy les (?:traigo|comparto|dejo|muestro)|les (?:traigo|comparto|dejo|muestro)|aqu[ií] tienen?|les presento|miren esta|conozcan esta|nueva (?:app|librer[ií]a|plantilla)|nuevo (?:recurso|preset|plugin)|descarga gratis|descarga ya|incre[ií]ble (?:app|librer[ií]a|plantilla))\s*(?:llamada?|de)?\s*[:,-]?\s*/i;
    raw = raw.replace(introRegex, '').trim();

    // C. Si hay comillas "Nombre del Recurso"
    const quoteMatch = raw.match(/["“«]([^"”»]{3,40})["”»]/);
    if (quoteMatch) return quoteMatch[1].trim();

    // D. Patrón "app llamada X", "librería X", "plugin X"
    const pattern = /(?:(?:app|librer[ií]a|plantilla|plugin|sintetizador|preset)\s+(?:llamada?\s+)?)([A-Z0-9][a-zA-Z0-9\s\.\-\+]{2,30}?)(?:\s+(?:que|para|de|con|es|en|\.|\,)|$)/i;
    const match = raw.match(pattern);
    if (match && match[1] && match[1].trim().length >= 3) {
        return match[1].trim();
    }

    // E. Buscar marcas e instrumentos reconocidos en el texto
    const brandMatch = raw.match(/\b(Korg|Yamaha|Roland|Nord|Moog|Arturia|MainStage|Kontakt|GarageBand|Cubasis|Serum|Vital|Spire|Omnisphere|Casio|Kurzweil|Novation|Behringer|Steinberg|Native Instruments)\b[^\.\,\n\!\?]{0,25}/i);
    if (brandMatch) {
        const cleanBrand = brandMatch[0].replace(/\s+(?:con|para|de|en|y|que|es)\b.*$/i, '').trim();
        if (cleanBrand.length >= 3) return cleanBrand;
    }

    // F. Primera frase / primeras 4-5 palabras clave
    const firstSentence = raw.split(/[\n\.\,\!\?]/)[0].trim();
    const words = firstSentence.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 6) {
        return words.join(' ');
    }

    return words.slice(0, 5).join(' ') || 'Nuevo Recurso';
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

    const teraboxRegex = /https?:\/\/(?:www\.)?(?:terabox\.com|1024tera\.com|teraboxapp\.com|freeterabox\.com|terasharelink\.com|nephobox\.com|mirrobox\.com)\S+/i;
    const match = text.match(teraboxRegex);
    if (match) {
        teraboxLink = match[0].replace(/[)\]>,.]+$/, '');
    }

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

// ==========================================
// SESIÓN DE IMPORTACIÓN Y COMBINACIÓN
// ==========================================

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutos

async function getImportSession(key) {
    try {
        const doc = await client.fetch(`*[_id == $id][0]`, { id: `import_session_${key}` });
        return doc || null;
    } catch (e) {
        console.error('Error fetching import session:', e);
        return null;
    }
}

async function saveImportSession(key, data) {
    try {
        const doc = {
            _id: `import_session_${key}`,
            _type: 'importSession',
            ...data
        };
        await client.createOrReplace(doc);
    } catch (e) {
        console.error('Error saving import session:', e);
    }
}

async function clearImportSession(key) {
    try {
        await client.delete(`import_session_${key}`);
    } catch (e) {
        console.error('Error clearing import session:', e);
    }
}

async function handlePrivateImport(ctx) {
    const msg = ctx.message;
    const userId = ctx.from.id;
    const text = msg.caption || msg.text || '';

    let session = await getImportSession(userId);
    const isSessionRecent = session && (Date.now() - new Date(session.updatedAt).getTime() < SESSION_TTL_MS);
    if (!isSessionRecent) {
        session = null;
    }

    let photoFileId = null;
    if (msg.photo && msg.photo.length > 0) {
        photoFileId = msg.photo[msg.photo.length - 1].file_id;
    } else if (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith('image/')) {
        photoFileId = msg.document.file_id;
    }

    const isDownloadableFile = Boolean(msg.document && (!msg.document.mime_type || !msg.document.mime_type.startsWith('image/')));
    const { teraboxLink, telegramLink } = extractLinks(msg, text);

    // CASO 1: Archivo descargable (.rar, .zip, etc.)
    if (isDownloadableFile) {
        const fileLink = telegramLink || (msg.chat && msg.chat.username ? `https://t.me/${msg.chat.username}/${msg.message_id}` : null);
        const fileName = msg.document.file_name || 'Archivo descargable';

        if (session && session.draftId) {
            const patchObj = { downloadLink: fileLink || undefined };
            if (teraboxLink) patchObj.teraboxLink = teraboxLink;

            await client.patch(session.draftId).set(patchObj).commit();

            session.fileTelegramLink = fileLink;
            session.updatedAt = new Date().toISOString();
            await saveImportSession(userId, session);

            return ctx.reply(
                `📎 *¡Enlace directo al archivo vinculado con éxito!*\n\n` +
                `📦 *Archivo:* \`${fileName}\`\n` +
                `🎯 *Link directo al post del archivo:* ${fileLink ? `[${fileLink}](${fileLink})` : 'Guardado'}\n\n` +
                `El borrador *${session.title || 'actual'}* en Sanity ahora apunta exactamente a este archivo.`,
                {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    ...Markup.inlineKeyboard([
                        [Markup.button.url('📝 Abrir Sanity Studio', 'https://tutelopezmusic.com/admin')]
                    ])
                }
            );
        }

        session = session || {};
        session.fileTelegramLink = fileLink;
        session.fileName = fileName;
        if (teraboxLink) session.teraboxLink = teraboxLink;
        if (text) {
            const aiData = await analyzeResourceContent(text);
            session.title = session.title || aiData.title;
            session.category = session.category || aiData.category;
            session.description = session.description || aiData.description;
            session.tags = aiData.tags;
        } else if (!session.title && fileName) {
            session.title = fileName.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ');
        }
        session.updatedAt = new Date().toISOString();
        await saveImportSession(userId, session);

        return ctx.reply(
            `📦 *Archivo detectado:* \`${fileName}\`\n` +
            `🎯 *Link directo guardado:* ${fileLink ? `[${fileLink}](${fileLink})` : 'Registrado'}\n\n` +
            `📸 *Ahora reenvía el mensaje con la FOTO de portada* para completar el recurso y generar el borrador en Sanity.`,
            { parse_mode: 'Markdown', disable_web_page_preview: true }
        );
    }

    // CASO 2: Foto de portada
    if (photoFileId) {
        await ctx.reply('⏳ Procesando portada... Analizando contenido y subiendo imagen a Sanity.');
        
        const fileLink = await bot.telegram.getFileLink(photoFileId);
        const res = await fetch(fileLink.href);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const asset = await client.assets.upload('image', buffer, {
            filename: `tg_${Date.now()}.jpg`,
            contentType: res.headers.get('content-type') || 'image/jpeg'
        });

        // Analizar texto con IA / heurística avanzada para obtener el mejor título
        const aiData = await analyzeResourceContent(text || session?.fileName || '');
        const title = (text ? aiData.title : (session?.title || aiData.title || 'Nuevo Recurso'));
        const slugCurrent = slugify(title);
        const category = (text ? aiData.category : (session?.category || aiData.category || 'mainstage'));
        const description = (text ? aiData.description : (session?.description || aiData.description || `Recurso ${title} listo para descargar.`));
        const finalTerabox = teraboxLink || session?.teraboxLink || undefined;
        const finalDownloadLink = session?.fileTelegramLink || telegramLink || undefined;
        const tags = aiData.tags || [category, 'worship'];

        const draftId = `drafts.${slugCurrent}`;
        const doc = {
            _id: draftId,
            _type: 'resource',
            title: title,
            slug: { _type: 'slug', current: slugCurrent },
            category: category,
            description: description,
            tags: tags,
            mainImage: {
                _type: 'image',
                asset: { _type: 'reference', _ref: asset._id }
            },
            downloadLink: finalDownloadLink,
            teraboxLink: finalTerabox
        };

        await client.createOrReplace(doc);

        session = {
            draftId,
            title,
            slug: slugCurrent,
            category,
            imageAssetId: asset._id,
            fileTelegramLink: finalDownloadLink,
            teraboxLink: finalTerabox,
            updatedAt: new Date().toISOString()
        };
        await saveImportSession(userId, session);

        let replyMsg = `✅ *¡Borrador creado en Sanity!*\n\n` +
                       `🎹 *Título identificado:* *${title}*\n` +
                       `📂 *Categoría:* \`${category}\`\n` +
                       `📝 *Slug:* \`${slugCurrent}\`\n` +
                       `🖼 *Portada:* ✅ Subida con éxito\n` +
                       `📦 *Descarga Telegram:* ${finalDownloadLink ? `[${finalDownloadLink}](${finalDownloadLink})` : '⚠️ No asignado aún'}\n` +
                       `☁️ *Terabox:* ${finalTerabox ? `[Detectado](${finalTerabox})` : '⚠️ No detectado'}\n` +
                       `🏷 *Tags:* #${tags.join(' #')}\n\n`;

        if (!session.fileTelegramLink || session.fileTelegramLink === telegramLink) {
            replyMsg += `💡 *Tip:* Si el archivo \`.rar\` está en un mensaje separado, **reenvíamelo ahora** y actualizaré automáticamente el enlace para que apunte directo al archivo.\n\n`;
        }

        replyMsg += `👉 Revisa y publica cuando gustes en Sanity Studio:`;

        return ctx.reply(replyMsg, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            ...Markup.inlineKeyboard([
                [Markup.button.url('📝 Abrir Sanity Studio', 'https://tutelopezmusic.com/admin')]
            ])
        });
    }

    // CASO 3: Solo texto
    if (text) {
        if (session && session.draftId) {
            const patchData = {};
            if (teraboxLink) patchData.teraboxLink = teraboxLink;
            if (telegramLink && !session.fileTelegramLink) patchData.downloadLink = telegramLink;

            const aiData = await analyzeResourceContent(text);
            if (aiData.description && aiData.description.length > 15) patchData.description = aiData.description;
            if (aiData.title && (!session.title || session.title === 'Nuevo Recurso')) patchData.title = aiData.title;

            if (Object.keys(patchData).length > 0) {
                await client.patch(session.draftId).set(patchData).commit();
                session.updatedAt = new Date().toISOString();
                if (aiData.title) session.title = aiData.title;
                if (teraboxLink) session.teraboxLink = teraboxLink;
                await saveImportSession(userId, session);

                return ctx.reply(
                    `📝 *¡Datos adicionales vinculados al borrador!*\n\n` +
                    `🎹 *Recurso:* ${session.title}\n` +
                    `${teraboxLink ? `☁️ *Terabox añadido:* [Ver link](${teraboxLink})\n` : ''}` +
                    `\nEl borrador se actualizó correctamente en Sanity.`,
                    { parse_mode: 'Markdown', disable_web_page_preview: true }
                );
            }
        }

        return ctx.reply(
            '⚠️ Has enviado un mensaje de texto sin foto ni archivo.\n\n' +
            '📸 Para crear un nuevo recurso, por favor reenvía la **foto de portada** o el **archivo .rar**. Si ya creaste uno recientemente, este texto no contenía datos nuevos.'
        );
    }
}

// ==========================================
// MIDDLEWARE PRIORITARIO PARA CHATS PRIVADOS
// ==========================================
bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.type === 'private' && ctx.message) {
        const msg = ctx.message;
        const text = msg.caption || msg.text || '';
        
        // Si es un comando con barra "/", dejar que lo procese el manejador de comandos
        if (text.startsWith('/')) {
            return next();
        }
        
        const isForwarded = Boolean(msg.forward_origin || msg.forward_from_chat || msg.forward_date || msg.forward_from);
        const hasMedia = Boolean(msg.photo || msg.document);
        
        // Si el mensaje es reenviado o tiene foto o archivo, capturarlo prioritariamente
        if (isForwarded || hasMedia) {
            if (!isAdmin(ctx)) {
                return ctx.reply(
                    `⛔ *Acceso de Administrador requerido*\n\n` +
                    `Tu cuenta no tiene permisos para crear borradores en Sanity.\n\n` +
                    `🆔 Tu Telegram ID: \`${ctx.from.id}\`\n` +
                    `👤 Tu @usuario: @${ctx.from.username || 'sin_username'}\n\n` +
                    `Para autorizarte, agrega en Vercel (Environment Variables):\n` +
                    `\`ADMIN_ID=${ctx.from.id}\``,
                    { parse_mode: 'Markdown' }
                );
            }

            try {
                return await handlePrivateImport(ctx);
            } catch (err) {
                console.error('Error en handlePrivateImport:', err);
                return ctx.reply(`❌ Error al procesar el mensaje: ${err.message}`);
            }
        }
    }
    return next();
});

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
               `📊 /stats - Métricas y estadísticas en tiempo real\n` +
               `💬 /comunidad - Enviar invitación al grupo de la comunidad\n` +
               `⏸ /pausar - Pausar mensajes automáticos diarios\n` +
               `▶️ /despausar - Reanudar mensajes automáticos diarios\n` +
               `📢 /enviar_ahora - Publicar un recurso ahora al canal\n` +
               `🧹 /nuevo - Reiniciar sesión de importación\n` +
               `📋 /ver_peticiones - Ver peticiones de usuarios\n` +
               `💬 /broadcast - Enviar anuncio a suscriptores\n` +
               `🆔 /mi_id - Ver tu ID de Telegram\n\n` +
               `📥 *Crear borradores en Sanity:* Reenvíame aquí cualquier post del canal con foto y enlaces, y lo convertiré automáticamente en borrador en Sanity.`;
        keyboardRows.push(['⚙️ Panel de Control', '📊 Estadísticas']);
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

// Auto-respuesta rápida para la contraseña (solo si preguntan directamente)
bot.hears(/(contraseña|password|clave|pass)/i, (ctx, next) => {
    if (ctx.message.text && ctx.message.text.startsWith('/')) return next();
    if (ctx.message.forward_origin || ctx.message.forward_from_chat || ctx.message.photo || ctx.message.document) return next();
    ctx.reply('🔑 Recuerda que la contraseña para descomprimir todos nuestros archivos es:\n\n`tutelopezmusic`', { parse_mode: 'Markdown' });
});

// Auto-respuesta rápida para el grupo / comunidad
bot.hears(/(grupo|comunidad|chat)/i, (ctx, next) => {
    if (ctx.message.text && ctx.message.text.startsWith('/')) return next();
    if (ctx.message.forward_origin || ctx.message.forward_from_chat || ctx.message.photo || ctx.message.document) return next();
    ctx.reply(
        `💬 *Grupo Oficial de la Comunidad TuteLopez Music*\n\n` +
        `¡En nuestro grupo todos los tecladistas y músicos charlamos, compartimos librerías, configuraciones y resolvemos dudas!\n\n` +
        `👉 [Toca aquí para unirte al Grupo](${COMMUNITY_LINK})`,
        {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            ...Markup.inlineKeyboard([
                [Markup.button.url('💬 Entrar al Grupo', COMMUNITY_LINK)]
            ])
        }
    );
});

// Ayuda y Tutoriales
bot.command('ayuda', (ctx) => showHelpMenu(ctx));
bot.hears('❓ Ayuda', (ctx) => showHelpMenu(ctx));

function showHelpMenu(ctx) {
    ctx.reply('¿En qué te puedo ayudar hoy?', Markup.inlineKeyboard([
        [Markup.button.callback('🔑 Clave de Archivos RAR/ZIP', 'faq_password')],
        [Markup.button.callback('🍏 Optimizar Mac / MainStage', 'faq_mainstage')],
        [Markup.button.callback('🎹 Abrir librerías en Kontakt', 'faq_kontakt')],
        [Markup.button.callback('⚠️ Error límite en Terabox', 'faq_terabox')],
        [Markup.button.url('💬 Grupo de la Comunidad', COMMUNITY_LINK)]
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
                Markup.button.callback('📢 Publicar Recurso', 'cron_trigger_now'),
                Markup.button.callback('💬 Invitar Comunidad', 'cron_community_now')
            ],
            [
                Markup.button.callback('📊 Ver Estadísticas', 'open_stats'),
                Markup.button.callback('🔄 Actualizar Panel', 'cron_status')
            ]
        ]);

        if (isEdit) {
            try {
                await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
            } catch (err) {}
        } else {
            await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
        }
    } catch (e) {
        console.error('Error al generar panel de control:', e);
        ctx.reply('❌ Error al consultar la configuración en Sanity.');
    }
}

// Estadísticas en tiempo real
async function sendStatsReport(ctx, isEdit = false) {
    if (!isAdmin(ctx)) return ctx.reply('⛔ No tienes permisos para ver estadísticas.');
    try {
        const [resources, totalSubscribers, totalRequests, settings] = await Promise.all([
            client.fetch(`*[_type == "resource"]{ category, title }`),
            client.fetch(`count(*[_type == "subscriber"])`),
            client.fetch(`count(*[_type == "request"])`),
            getBotSettings()
        ]);

        const totalResources = resources.length;
        const catCounts = {};
        for (const r of resources) {
            const cat = (r.category || 'otros').toLowerCase();
            catCounts[cat] = (catCounts[cat] || 0) + 1;
        }

        const cronStatus = settings.dailyCronPaused ? '⏸ Pausado' : '✅ Activo (18:00 UTC)';

        let msg = `📊 *Estadísticas de TuteLopez Music*\n\n` +
                  `👥 *Suscriptores VIP del Bot:* ${totalSubscribers}\n` +
                  `📩 *Peticiones de usuarios:* ${totalRequests}\n` +
                  `⏰ *Mensajes automáticos diarios:* ${cronStatus}\n\n` +
                  `🎹 *Total de Recursos en la Web:* ${totalResources}\n`;

        for (const [cat, count] of Object.entries(catCounts)) {
            msg += `  ▫️ *${cat.toUpperCase()}:* ${count}\n`;
        }

        msg += `\n🌐 https://tutelopezmusic.com\n` +
               `📝 https://tutelopezmusic.com/admin`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Actualizar Métricas', 'refresh_stats')],
            [Markup.button.callback('⚙️ Panel de Control', 'cron_status')]
        ]);

        if (isEdit) {
            try {
                await ctx.editMessageText(msg, { parse_mode: 'Markdown', disable_web_page_preview: true, ...keyboard });
            } catch (err) {}
        } else {
            await ctx.reply(msg, { parse_mode: 'Markdown', disable_web_page_preview: true, ...keyboard });
        }
    } catch (error) {
        console.error('Error calculando stats:', error);
        ctx.reply(`❌ Error al obtener estadísticas: ${error.message}`);
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
            ctx.reply(`✅ Post enviado con éxito al canal @tutelopezmusic:\n\n*${randomResource.title}*`, { parse_mode: 'Markdown' });
        } else {
            ctx.reply('⚠️ No se encontraron recursos en Sanity.');
        }
    } catch (error) {
        console.error('Error al forzar post:', error);
        ctx.reply(`❌ Error al enviar post: ${error.message}`);
    }
}

async function sendCommunityPostNow(ctx) {
    if (!isAdmin(ctx)) return ctx.reply('⛔ No tienes permisos para usar este comando.');
    try {
        const { text, keyboard, title } = getRandomCommunityPost();
        await bot.telegram.sendMessage('@tutelopezmusic', text, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            ...keyboard
        });
        ctx.reply(`✅ *Invitación a la comunidad enviada al canal @tutelopezmusic:*\n\n"${title}"`, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error al enviar post de comunidad:', error);
        ctx.reply(`❌ Error al enviar invitación: ${error.message}`);
    }
}

// Comandos de control
bot.command(['panel', 'control'], (ctx) => sendControlPanel(ctx));
bot.hears('⚙️ Panel de Control', (ctx) => sendControlPanel(ctx));

bot.command(['stats', 'metricas', 'estadisticas'], (ctx) => sendStatsReport(ctx));
bot.hears('📊 Estadísticas', (ctx) => sendStatsReport(ctx));

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

bot.command(['comunidad', 'invitar', 'invitar_comunidad'], async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ No tienes permisos para usar este comando.');
    await sendCommunityPostNow(ctx);
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

bot.action('open_stats', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos.');
    await ctx.answerCbQuery('Cargando estadísticas...');
    await sendStatsReport(ctx, true);
});

bot.action('refresh_stats', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos.');
    await ctx.answerCbQuery('Estadísticas actualizadas');
    await sendStatsReport(ctx, true);
});

bot.action('cron_trigger_now', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos.');
    await ctx.answerCbQuery('Enviando publicación al canal...');
    await sendDailyPostNow(ctx);
});

bot.action('cron_community_now', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos.');
    await ctx.answerCbQuery('Enviando invitación al canal...');
    await sendCommunityPostNow(ctx);
});

// ==========================================
// MODO INLINE (@bot [búsqueda])
// ==========================================
bot.on('inline_query', async (ctx) => {
    const query = (ctx.inlineQuery.query || '').trim();
    try {
        let sanityQuery;
        let params = {};

        if (!query) {
            sanityQuery = `*[_type == "resource"] | order(_createdAt desc)[0...10]{
                _id,
                title,
                category,
                description,
                "slug": slug.current,
                "imageUrl": mainImage.asset->url
            }`;
        } else {
            sanityQuery = `*[_type == "resource" && (title match $q || category match $q || tags[] match $q)][0...15]{
                _id,
                title,
                category,
                description,
                "slug": slug.current,
                "imageUrl": mainImage.asset->url
            }`;
            params = { q: `*${query}*` };
        }

        const results = await client.fetch(sanityQuery, params);

        const inlineResults = results.map((item) => {
            const url = `https://tutelopezmusic.com/recursos/${item.slug}`;
            const desc = (item.description || '').slice(0, 100);

            return {
                type: 'article',
                id: item._id,
                title: item.title,
                description: `[${(item.category || '').toUpperCase()}] ${desc}`,
                thumb_url: item.imageUrl || undefined,
                input_message_content: {
                    message_text: `🎹 *${item.title}*\n` +
                                  `📂 Categoría: *${(item.category || '').toUpperCase()}*\n\n` +
                                  `${item.description || ''}\n\n` +
                                  `🔗 Descárgalo gratis aquí:\n${url}`,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: false
                },
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🚀 Descargar en la Web', url: url }]
                    ]
                }
            };
        });

        await ctx.answerInlineQuery(inlineResults, {
            cache_time: 10,
            is_personal: false
        });
    } catch (e) {
        console.error('Error en inline query:', e);
        await ctx.answerInlineQuery([], { cache_time: 5 });
    }
});

// Manejador en tiempo real para publicaciones directas en el canal
bot.on('channel_post', async (ctx) => {
    try {
        const msg = ctx.channelPost;
        const text = msg.caption || msg.text || '';
        const channelKey = 'channel_auto';

        let session = await getImportSession(channelKey);
        const isSessionRecent = session && (Date.now() - new Date(session.updatedAt).getTime() < 5 * 60 * 1000);
        if (!isSessionRecent) session = null;

        const isDownloadableFile = Boolean(msg.document && (!msg.document.mime_type || !msg.document.mime_type.startsWith('image/')));
        let photoFileId = null;
        if (msg.photo && msg.photo.length > 0) {
            photoFileId = msg.photo[msg.photo.length - 1].file_id;
        } else if (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith('image/')) {
            photoFileId = msg.document.file_id;
        }

        const { teraboxLink, telegramLink } = extractLinks(msg, text);

        if (isDownloadableFile && session && session.draftId) {
            const fileLink = telegramLink || (msg.chat?.username ? `https://t.me/${msg.chat.username}/${msg.message_id}` : null);
            await client.patch(session.draftId).set({ downloadLink: fileLink || undefined }).commit();
            console.log(`Canal: Enlace del archivo .rar (#${msg.message_id}) vinculado al borrador ${session.draftId}`);
            return;
        }

        if (photoFileId) {
            const isResource = /terabox|1024tera|descarga|download|kontakt|mainstage|librer|patch|piano|synth/i.test(text);
            if (!isResource && !session?.fileTelegramLink) return;

            const fileLink = await bot.telegram.getFileLink(photoFileId);
            const res = await fetch(fileLink.href);
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const asset = await client.assets.upload('image', buffer, {
                filename: `tg_${Date.now()}.jpg`,
                contentType: res.headers.get('content-type') || 'image/jpeg'
            });

            const aiData = await analyzeResourceContent(text);
            const title = aiData.title;
            const slugCurrent = slugify(title);
            const category = aiData.category;
            const description = aiData.description;
            const finalDownloadLink = session?.fileTelegramLink || telegramLink || undefined;

            const draftId = `drafts.${slugCurrent}`;
            const doc = {
                _id: draftId,
                _type: 'resource',
                title: title,
                slug: { _type: 'slug', current: slugCurrent },
                category: category,
                description: description,
                tags: aiData.tags || [category, 'worship'],
                mainImage: {
                    _type: 'image',
                    asset: { _type: 'reference', _ref: asset._id }
                },
                downloadLink: finalDownloadLink,
                teraboxLink: teraboxLink || undefined
            };

            await client.createOrReplace(doc);

            await saveImportSession(channelKey, {
                draftId,
                title,
                slug: slugCurrent,
                fileTelegramLink: finalDownloadLink,
                updatedAt: new Date().toISOString()
            });

            console.log(`Borrador creado automáticamente desde canal para: ${title}`);

            const adminId = process.env.ADMIN_ID || process.env.TELEGRAM_ADMIN_ID;
            if (adminId) {
                await bot.telegram.sendMessage(
                    adminId,
                    `📢 *Nuevo recurso detectado en el canal y guardado como borrador:*\n\n` +
                    `🎹 *${title}*\n` +
                    `📂 Categoría: \`${category}\`\n\n` +
                    `🔗 Revisa y publica aquí: https://tutelopezmusic.com/admin`,
                    { parse_mode: 'Markdown' }
                );
            }
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
