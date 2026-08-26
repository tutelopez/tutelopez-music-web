import { createClient } from '@sanity/client';

const apiKey = process.env.DEEPL_API_KEY;

// Inicializar cliente de escritura de Sanity (solo si hay token)
const writeClient = process.env.SANITY_EDITOR_TOKEN ? createClient({
  projectId: 't3lss9m4',
  dataset: 'production',
  apiVersion: '2024-03-01',
  useCdn: false,
  token: process.env.SANITY_EDITOR_TOKEN
}) : null;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function translateText(text: string, targetLang = 'EN-US', retries = 5): Promise<string> {
  if (!text || typeof text !== 'string') return text;
  
  if (!apiKey) {
    console.warn("DEEPL_API_KEY no encontrada. Mostrando texto original.");
    return text;
  }

  const url = apiKey.endsWith(':fx') 
    ? 'https://api-free.deepl.com/v2/translate' 
    : 'https://api.deepl.com/v2/translate';
    
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: [text],
          target_lang: targetLang,
          preserve_formatting: true
        })
      });

      if (response.status === 429 || response.status === 42901) {
        const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`[DeepL] 429 Too Many Requests. Reintentando en ${Math.round(waitTime)}ms... (Intento ${i+1}/${retries})`);
        await delay(waitTime);
        continue;
      }

      if (!response.ok) {
        throw new Error(`DeepL API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.translations[0].text;
    } catch (error) {
      if (i === retries - 1) {
        console.error("Error definitivo en translateText tras reintentos:", error);
        throw error; // Lanzar el error para NO guardar español en Sanity
      }
      const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
      await delay(waitTime);
    }
  }
  
  throw new Error("Fallo de traducción tras agotarse los reintentos.");
}

// Traducción robusta de PortableText iterando los bloques
export async function translatePortableText(blocks: any[]): Promise<any[]> {
    if (!blocks || !Array.isArray(blocks)) return blocks;
    if (!apiKey) return blocks;

    // Hacemos una copia profunda (deep clone) para no mutar el original en memoria si hay referencias
    const newBlocks = JSON.parse(JSON.stringify(blocks));

    for (const block of newBlocks) {
        if (block._type === 'block' && block.children && Array.isArray(block.children)) {
            for (const child of block.children) {
                if (child._type === 'span' && child.text && typeof child.text === 'string') {
                    // Traducir únicamente el texto
                    child.text = await translateText(child.text, 'EN-US');
                }
            }
        }
    }
    return newBlocks;
}

// Traduce un documento completo y lo parchea en Sanity si es necesario
export async function translateDocument(doc: any, type: 'resource' | 'tutorial') {
  if (!doc) return doc;
  
  let needsPatch = false;
  const mutations: any = {};
  
  // 1. Título
  if (doc.titleEN) {
    doc.title = doc.titleEN;
  } else {
    doc.title = await translateText(doc.title, 'EN-US');
    mutations.titleEN = doc.title;
    needsPatch = true;
  }

  // 2. Descripción / Resumen
  const descField = type === 'resource' ? 'description' : 'excerpt';
  const descFieldEN = descField + 'EN';
  
  if (doc[descFieldEN]) {
    doc[descField] = doc[descFieldEN];
  } else if (doc[descField]) {
    doc[descField] = await translateText(doc[descField], 'EN-US');
    mutations[descFieldEN] = doc[descField];
    needsPatch = true;
  }
  
  // 3. Contenido / Cuerpo (PortableText)
  const contentField = type === 'resource' ? 'content' : 'body';
  const contentFieldEN = contentField + 'EN';
  
  if (doc[contentFieldEN]) {
    doc[contentField] = doc[contentFieldEN];
  } else if (doc[contentField]) {
    doc[contentField] = await translatePortableText(doc[contentField]);
    mutations[contentFieldEN] = doc[contentField];
    needsPatch = true;
  }
  
  // Parchear en Sanity
  if (needsPatch && writeClient && doc._id) {
    try {
       await writeClient.patch(doc._id).set(mutations).commit();
       console.log(`Documento ${doc._id} parcheado exitosamente en Sanity con traducción EN.`);
    } catch(e) {
       console.error(`Falló el parche a Sanity del documento ${doc._id}:`, e);
    }
  } else if (needsPatch && !writeClient) {
    console.warn(`No se parcheó el documento ${doc._id} porque no hay SANITY_EDITOR_TOKEN.`);
  }
  
  return doc;
}
