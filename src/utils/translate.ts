import fs from 'fs';
import path from 'path';

// En desarrollo local o build local, intentará guardar. En Vercel, fs.writeFileSync fallará o será efímero.
const CACHE_PATH = path.resolve('./src/data/translations.json');

let translationsCache = { en: {} };
try {
  if (fs.existsSync(CACHE_PATH)) {
    translationsCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  }
} catch (e) {
  console.error("Error cargando caché de traducciones:", e);
}

function saveCache() {
  try {
    // Evitar escribir en Vercel (Production) si no es posible
    if (process.env.VERCEL) return; 
    fs.writeFileSync(CACHE_PATH, JSON.stringify(translationsCache, null, 2), 'utf-8');
  } catch (e) {
    // Fallo silencioso si el fs no es de escritura (ej. Vercel serverless build)
  }
}

export async function translateText(text, targetLang = 'EN-US') {
  if (!text) return text;
  
  const cacheKey = typeof text === 'string' ? text.trim() : JSON.stringify(text);
  
  if (translationsCache.en[cacheKey]) {
    return translationsCache.en[cacheKey];
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    console.warn("DEEPL_API_KEY no encontrada. Mostrando texto original.");
    return text;
  }

  try {
    const isRichText = typeof text === 'object';
    const textToTranslate = isRichText ? JSON.stringify(text) : text;
    
    // El API gratuito de DeepL usa api-free.deepl.com
    const url = apiKey.endsWith(':fx') 
      ? 'https://api-free.deepl.com/v2/translate' 
      : 'https://api.deepl.com/v2/translate';
      
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: [textToTranslate],
        target_lang: targetLang
      })
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let translated = data.translations[0].text;
    
    if (isRichText) {
       // Intentar parsear el JSON de vuelta (puede fallar si DeepL rompe el JSON)
       try {
           translated = JSON.parse(translated);
       } catch(e) {
           console.warn("DeepL rompió el formato PortableText JSON. Retornando original.");
           return text;
       }
    }

    translationsCache.en[cacheKey] = translated;
    saveCache();

    return translated;
  } catch (error) {
    console.error("Error en translateText:", error);
    return text;
  }
}
