/** Wires every [data-speak] button on a static page to German text-to-speech. */

import { canSpeak, speak } from '../trainer/speech';

if (canSpeak()) {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-speak]')) {
    button.hidden = false;
    button.addEventListener('click', () => speak(button.dataset.speak ?? ''));
  }
}
