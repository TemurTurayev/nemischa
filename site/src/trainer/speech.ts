/** German text-to-speech through the browser; silently unavailable where unsupported. */

const GERMAN = 'de-DE';
const RATE = 0.9;

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = GERMAN;
  utterance.rate = RATE;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('de'));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
