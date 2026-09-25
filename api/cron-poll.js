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

export const POLLS_COLLECTION = [
    {
        question: "🎹 ¿Qué software o equipo usas principalmente para tocar en vivo?",
        options: [
            "MainStage (Mac)",
            "Kontakt Standalone (PC/Mac)",
            "iPad (GarageBand / Cubasis / Camelot)",
            "Sintetizador / Teclado Hardware",
            "Otro (dejar en comentarios)"
        ]
    },
    {
        question: "🔥 ¿Qué tipo de recursos necesitas más para tus ensayos?",
        options: [
            "Pianos Worship (Acústicos / Grand)",
            "Pads Ambientales / Drones continuos",
            "Sintetizadores & Leads Worship",
            "Plantillas completas para MainStage",
            "SoundFonts y Apps para celular/tablet"
        ]
    },
    {
        question: "⚡ Al tocar en vivo, ¿cuál es tu mayor dolor de cabeza?",
        options: [
            "Consumo excesivo de RAM / CPU",
            "Latencia al presionar las teclas",
            "Organizar los patches por canción",
            "Conectar pads y secuencias a tiempo",
            "Nada, todo va perfecto 😎"
        ]
    },
    {
        question: "🎛 ¿Qué marca de controlador MIDI o teclado usas actualmente?",
        options: [
            "Novation (Launchkey, etc.)",
            "Arturia (KeyLab, MiniLab)",
            "M-Audio / Alesis",
            "Yamaha / Roland / Korg / Nord",
            "Teclado común conectado por USB"
        ]
    },
    {
        question: "📱 ¿Sueles usar iPad o celular Android para tocar en la iglesia?",
        options: [
            "Sí, como setup principal",
            "Sí, como respaldo de emergencia",
            "Solo para pads continuos (Padlab, etc.)",
            "No, solo uso laptop o teclado físico"
        ]
    }
];

export function getRandomPoll() {
    return POLLS_COLLECTION[Math.floor(Math.random() * POLLS_COLLECTION.length)];
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
            console.log('Mensajes automáticos pausados desde Telegram. Omitiendo encuesta.');
            return res.status(200).json({ status: 'paused', message: 'Mensajes pausados desde el bot' });
        }

        const poll = getRandomPoll();
        console.log('Enviando encuesta al canal:', poll.question);

        await bot.telegram.sendPoll('@tutelopezmusic', poll.question, poll.options, {
            is_anonymous: false
        });

        console.log('Encuesta enviada con éxito al canal.');
        return res.status(200).json({ status: 'Poll sent', question: poll.question });
    } catch (error) {
        console.error('Error al enviar encuesta automática:', error);
        return res.status(500).json({ error: 'Failed to send poll' });
    }
}
