import { log, LOG_TYPES } from '../utils/logger';

export async function fetchModels(ollamaUrl) {
  try {
    log(`FETCH_MODELS from ${ollamaUrl}`, LOG_TYPES.API_SEND);
    const res = await fetch(`${ollamaUrl}/api/tags`);
    const data = await res.json();
    const modelNames = (data.models || []).map(m => m.name);
    log(`MODELS_RECEIVED: ${modelNames.length} items`, LOG_TYPES.API_RECV);
    return modelNames;
  } catch (e) {
    console.error('fetchModels:', e);
    return [];
  }
}

export async function deleteModel(ollamaUrl, name) {
  const res = await fetch(`${ollamaUrl}/api/delete`, {
    method: 'DELETE',
    body: JSON.stringify({ name })
  });
  return res.ok;
}

export async function* pullModel(ollamaUrl, name) {
  const res = await fetch(`${ollamaUrl}/api/pull`, {
    method: 'POST',
    body: JSON.stringify({ name, stream: true })
  });

  if (!res.ok) throw new Error(`Pull failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        yield json;
      } catch {}
    }
  }
}

export async function* streamChat(ollamaUrl, model, messages, signal) {
  log(`CHAT_REQUEST: model=${model}`, LOG_TYPES.API_SEND);
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          log(`CHUNK_RECEIVED: ${json.message.content.length} chars`, LOG_TYPES.API_RECV);
          yield json.message.content;
        }
      } catch (e) {}
    }
  }
}

export async function extractUserInfo(ollamaUrl, model, currentInfo, lastUserMsg, lastAiMsg, language = 'de') {
  const isEn = language === 'en';
  const prompt = isEn 
    ? `You are the database manager for the AI's long-term memory.
Current facts about the user: "${currentInfo}"

Last dialog:
User: "${lastUserMsg}"
AI: "${lastAiMsg}"

Task: Analyze the dialog for permanently relevant facts about the user (e.g., name, age, profession, location, hobbies, dislikes, plans).
If you find new facts, rewrite the "Current facts" and seamlessly integrate the new information. Keep all old facts!
If there are no new facts, respond EXACTLY with the previous "Current facts".

IMPORTANT: Respond EXCLUSIVELY with the updated facts text in English. DO NOT use any introductions (like "Here are the facts:" or "Yes, the user..."). Just write the facts.`
    : `Du bist der Datenbank-Manager für das Langzeitgedächtnis der KI.
Aktuelle Fakten über den Nutzer: "${currentInfo}"

Letzter Dialog:
Nutzer: "${lastUserMsg}"
KI: "${lastAiMsg}"

Letzter Dialog:
Nutzer: "${lastUserMsg}"
KI: "${lastAiMsg}"

Aufgabe: Analysiere den Dialog auf dauerhaft relevante Fakten über den Nutzer (z.B. Name, Alter, Beruf, Wohnort, Hobbys, Abneigungen, Pläne).
Wenn du neue Fakten findest, schreibe die "Aktuellen Fakten" neu und füge die neuen Informationen nahtlos ein. Behalte alle alten Fakten bei!
Wenn keine neuen Fakten enthalten sind, antworte EXAKT mit den bisherigen "Aktuellen Fakten".

WICHTIG: Antworte AUSSCHLIESSLICH mit dem aktualisierten Fakten-Text auf Deutsch. Verwende KEINE Einleitung (wie "Hier sind die Fakten:" oder "Ja, der Nutzer..."). Schreibe nur die Fakten.`;

  try {
    log(`MEMORY_EXTRACTION_START`, LOG_TYPES.SYSTEM);
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0 }
      })
    });
    const data = await res.json();
    const result = data.response.trim();
    return result;
  } catch (e) {
    console.error('extractUserInfo error:', e);
    return currentInfo;
  }
}

export async function generateChatName(ollamaUrl, model, chatHistory, language = 'de') {
  const isEn = language === 'en';
  const prompt = isEn
    ? `Create a very short, catchy title (maximum 4 words) for the following chat. 
Reply EXCLUSIVELY with the title, no quotes, no explanations.

Chat history:
${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

Title:`
    : `Erstelle einen sehr kurzen, prägnanten Titel (maximal 4 Wörter) für den folgenden Chatverlauf. 
Antworte AUSSCHLIESSLICH mit dem Titel, ohne Anführungszeichen, ohne Erklärungen.

Chatverlauf:
${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

Titel:`;

  try {
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.3 }
      })
    });
    const data = await res.json();
    let title = data.response.trim();
    title = title.replace(/^["']|["']$/g, '');
    return title || (isEn ? 'New Chat' : 'Neuer Chat');
  } catch (e) {
    return isEn ? 'New Chat' : 'Neuer Chat';
  }
}

export function buildSystemPrompt(personality, settings) {
  if (!personality) return '';
  const isEn = settings?.ui_language === 'en';

  let prompt = isEn
    ? `You are a personal assistant. Information about the user: ${personality.nutzer_info}. Behave like this: ${personality.verhalten}\n\nIMPORTANT: You MUST communicate entirely in English!`
    : `Du bist ein persönlicher Assistent. Informationen über den Nutzer: ${personality.nutzer_info}. Verhalte dich so: ${personality.verhalten}\n\nWICHTIG: Du MUSST komplett auf Deutsch kommunizieren!`;
  
  if (settings?.Browser_Access) {
    if (isEn) {
      prompt += `\n\nYou have access to the internet. Before answering a factual or knowledge-based user question, you MUST ALWAYS search the internet for the most up-to-date information first!
In your first step, respond EXCLUSIVELY with: <SEARCH>your search term</SEARCH> (e.g., <SEARCH>News today</SEARCH>). The system will execute the search and provide you with the results.
To directly read a specific URL, respond with: <FETCH>https://example.com</FETCH>. DO NOT explain that you are searching, just output the tag.
IMPORTANT FOR WEATHER: If the user asks for current weather, ALWAYS use <FETCH>https://wttr.in/CityName?format=j1</FETCH> (replace CityName) to get precise weather data!`;
    } else {
      prompt += `\n\nDu hast Zugriff auf das Internet. Bevor du eine sachliche oder wissensbasierte Nutzerfrage beantwortest, MUSST du IMMER zuerst im Internet nach den aktuellsten Informationen suchen!
Antworte im ersten Schritt AUSSCHLIESSLICH mit: <SEARCH>dein suchbegriff</SEARCH> (z.B. <SEARCH>News heute</SEARCH>). Das System führt die Suche aus und liefert dir die Ergebnisse.
Um eine bestimmte URL direkt zu lesen, antworte mit: <FETCH>https://example.com</FETCH>. Erkläre NICHT, dass du suchst, gib einfach nur den Tag aus.
WICHTIG FÜR WETTER: Wenn der Nutzer nach dem aktuellen Wetter fragt, nutze IMMER <FETCH>https://wttr.in/Stadtname?format=j1</FETCH> (ersetze Stadtname), um präzise Wetterdaten zu erhalten!`;
    }
  }
  return prompt;
}
