// Reconocimiento de voz (si el navegador lo trae) y grabación de la propia voz.
const Rec = () => globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const recognitionSupported = () => !!Rec();

/** Escucha una vez. Devuelve las transcripciones alternativas (puede ser []). Prefiere ar-TN. */
export function listenOnce(lang = 'ar-TN') {
  return new Promise((resolve, reject) => {
    const R = Rec();
    if (!R) return reject(new Error('no-soportado'));
    const r = new R();
    r.lang = lang; r.interimResults = false; r.maxAlternatives = 3;
    r.onresult = (e) => resolve([...e.results[0]].map((a) => a.transcript));
    r.onerror = (e) => reject(new Error(e.error));
    r.onend = () => resolve([]);
    try { r.start(); } catch (e) { reject(e); }
  });
}

export const recordingSupported = () => !!(globalThis.navigator?.mediaDevices?.getUserMedia && globalThis.MediaRecorder);

/** Graba con MediaRecorder. stop() devuelve una URL de objeto para reproducir. */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();
  return {
    stop: () => new Promise((resolve) => {
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); resolve(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }))); };
      rec.stop();
    }),
  };
}
