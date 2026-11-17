/** The practice page: owns the state, reacts to input, asks view.ts to draw. */

import { fullWord } from '../lib/format';
import { type Level, isLevel } from '../lib/types';
import { fetchLevel } from './data';
import { localDay } from './day';
import { isMode } from './quiz';
import { canSpeak, speak } from './speech';
import {
  type Choice,
  type State,
  answer,
  beginSession,
  currentEntry,
  gradeForPick,
  initialState,
  queryString,
  statsFor,
  withFailure,
  withLevel,
} from './state';
import { STORAGE_KEY, loadProgress, saveProgress } from './storage';
import { cardView, emptyView, setupView, statusMessage, summaryView } from './view';

interface Store {
  readonly state: () => State;
  readonly update: (next: State, save?: boolean) => void;
  readonly choose: (patch: Partial<Choice>) => void;
  readonly loadLevel: () => Promise<void>;
}

type Action = (store: Store, target: HTMLElement) => void;

const today = (): number => localDay(new Date());

function draw(state: State): HTMLElement {
  const entry = currentEntry(state);
  if (state.screen === 'card' && entry) {
    return cardView({
      entry,
      mode: state.mode,
      done: state.total - state.queue.length,
      total: state.total,
      revealed: state.revealed,
      picked: state.picked,
      options: state.options,
      canSpeak: canSpeak(),
    });
  }
  if (state.screen === 'summary') return summaryView(state, today());
  if (state.screen === 'nothing' || state.screen === 'noNouns') return emptyView(state.screen);
  return setupView({
    level: state.level,
    theme: state.theme,
    mode: state.mode,
    themes: state.levels[state.level]?.themes ?? [],
    stats: statsFor(state, today()),
    failed: state.failed,
    saveFailed: state.saveFailed,
  });
}

/** Selector of the focused form field, so focus survives a redraw. */
function focusedField(root: HTMLElement): string | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active)) return null;
  const name = active.getAttribute('name');
  if (!name) return null;
  const byName = `[name="${CSS.escape(name)}"]`;
  const isRadio = active instanceof HTMLInputElement && active.type === 'radio';
  return isRadio ? `${byName}[value="${CSS.escape(active.value)}"]` : byName;
}

function redraw(root: HTMLElement, state: State): void {
  const field = focusedField(root);
  root.replaceChildren(draw(state));
  const target =
    (field ? root.querySelector<HTMLElement>(field) : null) ??
    root.querySelector<HTMLElement>('[data-autofocus]');
  target?.focus({ preventScroll: true });
}

function createStore(root: HTMLElement, live: HTMLElement | null, dataBase: string): Store {
  let state = initialState(window.location.search, loadProgress());
  const downloading = new Set<Level>();

  const update = (next: State, save = true): void => {
    const previous = state;
    const stored = !save || next.progress === previous.progress || saveProgress(next.progress);
    state = stored ? next : { ...next, saveFailed: true };
    if (queryString(state) !== queryString(previous)) {
      window.history.replaceState(null, '', `?${queryString(state)}`);
    }
    redraw(root, state);
    const message = statusMessage(previous, state);
    if (live && message) live.textContent = message;
  };

  const loadLevel = async (): Promise<void> => {
    const level = state.level;
    if (state.levels[level] || downloading.has(level)) return;
    downloading.add(level);
    try {
      update(withLevel(state, level, await fetchLevel(dataBase, level)));
    } catch {
      update(withFailure(state, level));
    } finally {
      downloading.delete(level);
    }
  };

  const choose = (patch: Partial<Choice>): void => {
    update({ ...state, ...patch, failed: false });
    void loadLevel();
  };

  return { state: () => state, update, choose, loadLevel };
}

const ACTIONS: Readonly<Record<string, Action>> = {
  retry: (store) => store.choose({}),
  reveal: (store) => store.update({ ...store.state(), revealed: true }),
  grade: (store, target) => {
    const grade = target.dataset.grade;
    if (grade === 'again' || grade === 'hard' || grade === 'good') {
      store.update(answer(store.state(), grade, today(), Math.random));
    }
  },
  pick: (store, target) => {
    const state = store.state();
    if (state.picked === null) store.update({ ...state, picked: target.dataset.value ?? '' });
  },
  next: (store) => {
    const grade = gradeForPick(store.state());
    if (grade) store.update(answer(store.state(), grade, today(), Math.random));
  },
  speak: (store) => {
    const state = store.state();
    const entry = currentEntry(state);
    if (!entry) return;
    const hideArticle = state.mode === 'article' && state.picked === null;
    speak(hideArticle ? entry.de : fullWord(entry));
  },
  more: (store) => store.update(beginSession(store.state(), today(), Math.random)),
  force: (store) => store.update(beginSession(store.state(), today(), Math.random, true)),
  setup: (store) => store.update({ ...store.state(), screen: 'setup' }),
  quit: (store) => store.update({ ...store.state(), screen: 'setup' }),
};

function bindClicks(root: HTMLElement, store: Store): void {
  root.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-action]');
    const action = target?.dataset.action;
    if (target && action) ACTIONS[action]?.(store, target);
  });
}

function bindForm(root: HTMLElement, store: Store): void {
  root.addEventListener('change', (event) => {
    const field = event.target as HTMLInputElement | HTMLSelectElement;
    if (field.name === 'level' && isLevel(field.value)) store.choose({ level: field.value, theme: null });
    if (field.name === 'mode' && isMode(field.value)) store.choose({ mode: field.value });
    if (field.name === 'theme') {
      store.choose({ theme: field.value ? Number.parseInt(field.value, 10) : null });
    }
  });
  root.addEventListener('submit', (event) => {
    event.preventDefault();
    store.update(beginSession(store.state(), today(), Math.random));
  });
}

/** Number keys 1–4 press the matching answer button while a card is shown. */
function bindKeys(root: HTMLElement, store: Store): void {
  document.addEventListener('keydown', (event) => {
    const typing = event.target instanceof HTMLElement && event.target.matches('input, select, textarea');
    if (typing || store.state().screen !== 'card' || event.ctrlKey || event.metaKey || event.altKey) return;
    const index = Number.parseInt(event.key, 10) - 1;
    const buttons = root.querySelectorAll<HTMLButtonElement>('[data-action="grade"], [data-action="pick"]');
    const button = Number.isInteger(index) ? buttons[index] : undefined;
    if (button && !button.disabled) button.click();
  });
}

/** Another tab saved progress: take it over instead of overwriting it later. */
function bindStorage(store: Store): void {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) store.update({ ...store.state(), progress: loadProgress() }, false);
  });
}

function mount(root: HTMLElement): void {
  const live = document.getElementById('trainer-status');
  const store = createStore(root, live, root.dataset.dataBase ?? '');
  bindClicks(root, store);
  bindForm(root, store);
  bindKeys(root, store);
  bindStorage(store);
  redraw(root, store.state());
  void store.loadLevel();
}

const root = document.getElementById('trainer');
if (root) mount(root);
