import { Telegraf } from 'telegraf';
import { createClient } from '@sanity/client';

const botToken = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID || process.env.TELEGRAM_ADMIN_ID;

const bot = botToken ? new Telegraf(botToken) : null;

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 't3lss9m4',
  dataset: process.env.SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-03-01',
  token: process.env.SANITY_EDITOR_TOKEN
});

const DEFAULT_LIKES = 142;
const DEFAULT_TESTERS = 28;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Consultar estadísticas actuales
  if (req.method === 'GET') {
    try {
      let stats = null;
      let realTestersCount = 0;

      try {
        stats = await client.fetch(`*[_id == "stagekeys_stats"][0]`);
        realTestersCount = await client.fetch(`count(*[_type == "stagekeys_tester"])`);
      } catch (e) {
        console.warn('Sanity read fallback:', e.message);
      }

      const likes = stats?.likesCount ?? DEFAULT_LIKES;
      const testers = (stats?.testersCount ?? DEFAULT_TESTERS) + (realTestersCount || 0);

      return res.status(200).json({
        success: true,
        likes,
        testers
      });
    } catch (err) {
      console.error('Error GET stagekeys-interaction:', err);
      return res.status(200).json({
        success: true,
        likes: DEFAULT_LIKES,
        testers: DEFAULT_TESTERS
      });
    }
  }

  // POST: Acciones de usuario (like, tester, suggest)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { action } = body;

      // 1. DAR LIKE
      if (action === 'like') {
        let newLikes = DEFAULT_LIKES + 1;
        try {
          const result = await client
            .transaction()
            .createIfNotExists({
              _id: 'stagekeys_stats',
              _type: 'stagekeys_stats',
              likesCount: DEFAULT_LIKES,
              testersCount: DEFAULT_TESTERS,
              updatedAt: new Date().toISOString()
            })
            .patch('stagekeys_stats', (p) => p.inc({ likesCount: 1 }).set({ updatedAt: new Date().toISOString() }))
            .commit();
          
          newLikes = result.results?.[0]?.document?.likesCount || (DEFAULT_LIKES + 1);
        } catch (e) {
          console.warn('Error saving like to Sanity:', e.message);
        }

        return res.status(200).json({
          success: true,
          likes: newLikes,
          message: '¡Gracias por tu apoyo a Stage Keys Live!'
        });
      }

      // 2. REGISTRO DE BETA TESTER PARA GOOGLE PLAY
      if (action === 'tester') {
        const email = (body.email || '').trim().toLowerCase();
        const device = (body.device || '').trim();
        const midiController = (body.midiController || '').trim();
        const notes = (body.notes || '').trim();

        if (!email || !email.includes('@') || !email.includes('.')) {
          return res.status(400).json({
            success: false,
            error: 'Por favor ingresa un correo electrónico de Google (Gmail) válido.'
          });
        }

        // Guardar en Sanity
        try {
          await client.create({
            _type: 'stagekeys_tester',
            email,
            device: device || 'No especificado',
            midiController: midiController || 'No especificado',
            notes: notes || '',
            createdAt: new Date().toISOString()
          });

          await client
            .transaction()
            .createIfNotExists({
              _id: 'stagekeys_stats',
              _type: 'stagekeys_stats',
              likesCount: DEFAULT_LIKES,
              testersCount: DEFAULT_TESTERS,
              updatedAt: new Date().toISOString()
            })
            .patch('stagekeys_stats', (p) => p.inc({ testersCount: 1 }))
            .commit();
        } catch (e) {
          console.error('Error guardando tester en Sanity:', e.message);
        }

        // Notificar a Admin por Telegram
        if (bot && adminId) {
          try {
            const adminMsg =
              `🚀 <b>¡NUEVO BETA TESTER REGISTRADO!</b> 🎹\n\n` +
              `📱 <b>App:</b> Stage Keys Live (Android)\n` +
              `📧 <b>Google Email:</b> <code>${email}</code>\n` +
              `📲 <b>Dispositivo:</b> ${device || 'No indicado'}\n` +
              `🎛 <b>Controlador:</b> ${midiController || 'No indicado'}\n` +
              (notes ? `💬 <b>Nota:</b> ${notes}\n` : '') +
              `📅 <b>Fecha:</b> ${new Date().toLocaleString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' })}`;

            await bot.telegram.sendMessage(adminId, adminMsg, { parse_mode: 'HTML' });
          } catch (teleErr) {
            console.warn('Error notificando a Telegram:', teleErr.message);
          }
        }

        return res.status(200).json({
          success: true,
          message: '¡Excelente! Has sido registrado exitosamente en la lista de evaluadores cerrados de Google Play.'
        });
      }

      // 3. ENVIAR SUGERENCIA DE FUNCIÓN
      if (action === 'suggest') {
        const suggestion = (body.suggestion || '').trim();
        const author = (body.author || 'Músico de la Comunidad').trim();
        const contact = (body.contact || '').trim();

        if (!suggestion || suggestion.length < 3) {
          return res.status(400).json({
            success: false,
            error: 'Por favor escribe una sugerencia o función deseada.'
          });
        }

        // Guardar en Sanity
        try {
          await client.create({
            _type: 'stagekeys_suggestion',
            suggestion,
            author,
            contact,
            status: 'nueva',
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          console.error('Error guardando sugerencia en Sanity:', e.message);
        }

        // Notificar a Admin por Telegram
        if (bot && adminId) {
          try {
            const adminMsg =
              `💡 <b>¡NUEVA SUGERENCIA PARA STAGE KEYS LIVE!</b> 🎹\n\n` +
              `📝 <i>"${suggestion}"</i>\n\n` +
              `👤 <b>Enviado por:</b> ${author}\n` +
              (contact ? `📬 <b>Contacto:</b> ${contact}\n` : '') +
              `📅 <b>Fecha:</b> ${new Date().toLocaleString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' })}`;

            await bot.telegram.sendMessage(adminId, adminMsg, { parse_mode: 'HTML' });
          } catch (teleErr) {
            console.warn('Error enviando sugerencia a Telegram:', teleErr.message);
          }
        }

        return res.status(200).json({
          success: true,
          message: '¡Muchas gracias por tu idea! Fue guardada y enviada directamente a Tute López.'
        });
      }

      return res.status(400).json({ success: false, error: 'Acción no válida' });
    } catch (err) {
      console.error('Error POST stagekeys-interaction:', err);
      return res.status(500).json({ success: false, error: 'Error interno en el servidor' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
