/** Builds the trainer screens as DOM nodes. No state lives here. */

import { h } from '../lib/dom';
import { articleClass, fullWord, pluralLabel } from '../lib/format';
import { type Entry, LEVELS, type Level, type Theme } from '../lib/types';
import { fill, t } from '../lib/uz';
import { streak } from './progress';
import { MODES, type Mode } from './quiz';
import type { Grade } from './scheduler';
import { type State, type Stats, currentEntry, rightAnswer } from './state';

export interface SetupModel {
  readonly level: Level;
  readonly theme: number | null;
  readonly mode: Mode;
  readonly themes: readonly Pick<Theme, 'n' | 'uz'>[];
  readonly stats: Stats | null;
  readonly failed: boolean;
  readonly saveFailed: boolean;
}

export interface CardModel {
  readonly entry: Entry;
  readonly mode: Mode;
  readonly done: number;
  readonly total: number;
  readonly revealed: boolean;
  readonly picked: string | null;
  readonly options: readonly string[];
  readonly canSpeak: boolean;
}

const MODE_TEXT: Readonly<Record<Mode, { title: string; hint: string }>> = {
  cards: { title: t.trainer.cards, hint: t.trainer.cardsHint },
  choice: { title: t.trainer.choice, hint: t.trainer.choiceHint },
  article: { title: t.trainer.article, hint: t.trainer.articleHint },
};

const GRADES: readonly { grade: Grade; label: string; style: string }[] = [
  { grade: 'again', label: t.trainer.again, style: 'btn-again' },
  { grade: 'hard', label: t.trainer.hard, style: 'btn-hard' },
  { grade: 'good', label: t.trainer.good, style: 'btn-good' },
];

/** Marks the element that receives keyboard focus after a redraw. */
const FOCUS = { autofocus: 'true' } as const;

function button(label: string, classes: string, data: Record<string, string>): HTMLButtonElement {
  return h('button', { class: classes, attrs: { type: 'button' }, data }, label);
}

function pill(name: string, value: string, checked: boolean, ...label: (Node | string)[]): HTMLElement {
  const input = h('input', { attrs: { type: 'radio', name, value } });
  input.checked = checked;
  return h('label', { class: 'pill' }, input, h('span', {}, ...label));
}

function statsList(stats: Stats): HTMLElement {
  const items: readonly [string, number][] = [
    [t.trainer.statTotal, stats.total],
    [t.trainer.statLearned, stats.learned],
    [t.trainer.statDue, stats.due],
    [t.trainer.statStreak, stats.streak],
  ];
  return h(
    'dl',
    { class: 'stats' },
    ...items.map(([label, value]) =>
      h('div', { class: 'stat' }, h('dt', {}, label), h('dd', {}, String(value))),
    ),
  );
}

function themeSelect(model: SetupModel): HTMLElement {
  const select = h(
    'select',
    { attrs: { id: 'theme-select', name: 'theme' } },
    h('option', { attrs: { value: '' } }, t.trainer.allThemes),
    ...model.themes.map((theme) => h('option', { attrs: { value: String(theme.n) } }, theme.uz)),
  );
  select.value = model.theme === null ? '' : String(model.theme);
  return h(
    'div',
    { class: 'field' },
    h('label', { attrs: { for: 'theme-select' } }, t.trainer.theme),
    select,
  );
}

function setupStatus(model: SetupModel): HTMLElement {
  if (model.failed) {
    return h(
      'div',
      { class: 'field' },
      h('p', { class: 'notice', attrs: { role: 'alert' } }, t.trainer.loadError),
      button(t.trainer.retry, 'btn btn-ghost', { action: 'retry' }),
    );
  }
  return model.stats ? statsList(model.stats) : h('p', { class: 'muted' }, t.trainer.loading);
}

function saveWarning(saveFailed: boolean): HTMLElement | null {
  return saveFailed ? h('p', { class: 'notice', attrs: { role: 'alert' } }, t.trainer.saveFailed) : null;
}

export function setupView(model: SetupModel): HTMLElement {
  const start = h('button', { class: 'btn', attrs: { type: 'submit' } }, t.trainer.start);
  start.disabled = model.stats === null;
  return h(
    'form',
    { class: 'panel', data: { view: 'setup' } },
    h(
      'fieldset',
      { class: 'field' },
      h('legend', {}, t.trainer.level),
      h('div', { class: 'pills' }, ...LEVELS.map((level) => pill('level', level, level === model.level, level))),
    ),
    themeSelect(model),
    h(
      'fieldset',
      { class: 'field' },
      h('legend', {}, t.trainer.mode),
      h(
        'div',
        { class: 'pills pills-wide' },
        ...MODES.map((mode) =>
          pill('mode', mode, mode === model.mode, MODE_TEXT[mode].title, h('small', {}, MODE_TEXT[mode].hint)),
        ),
      ),
    ),
    setupStatus(model),
    saveWarning(model.saveFailed),
    start,
  );
}

function sessionTop(model: CardModel): HTMLElement {
  const bar = h('i');
  bar.style.width = `${Math.round((model.done / Math.max(model.total, 1)) * 100)}%`;
  return h(
    'div',
    { class: 'session-top' },
    h('span', { data: { role: 'position' } }, `${model.done + 1} / ${model.total}`),
    h('div', { class: 'bar' }, bar),
    button(t.trainer.quit, 'link-btn', { action: 'quit' }),
  );
}

function wordLine(entry: Entry, showArticle: boolean): HTMLElement {
  const article =
    showArticle && entry.article && h('span', { class: `art ${articleClass(entry.article)}` }, entry.article);
  return h(
    'div',
    { class: 'flash-word', attrs: { lang: 'de' }, data: { role: 'word' } },
    article,
    article ? ' ' : '',
    entry.de,
  );
}

function details(entry: Entry): HTMLElement[] {
  const facts = [pluralLabel(entry), entry.uz_respell, entry.ipa && `[${entry.ipa}]`].filter(Boolean);
  return [
    h('div', { class: 'flash-answer', data: { role: 'answer' } }, entry.uz),
    h('div', { class: 'flash-hint' }, facts.join(' · ')),
  ];
}

function verdict(isRight: boolean): HTMLElement {
  return h(
    'p',
    { class: `verdict ${isRight ? 'ok' : 'bad'}`, data: { role: 'verdict' } },
    isRight ? t.trainer.correct : t.trainer.wrong,
  );
}

/** One answer option; once answered it says, in words, whether it was right. */
function optionButton(value: string, index: number, model: CardModel, right: string): HTMLElement {
  const answered = model.picked !== null;
  const isRight = answered && value === right;
  const isWrong = answered && value === model.picked && !isRight;
  const option = button(value, `btn choice${isRight ? ' is-right' : ''}${isWrong ? ' is-wrong' : ''}`, {
    action: 'pick',
    value,
    ...(!answered && index === 0 ? FOCUS : {}),
  });
  option.disabled = answered;
  if (isRight) option.setAttribute('aria-label', `${value} — ${t.trainer.rightMark}`);
  if (isWrong) option.setAttribute('aria-label', `${value} — ${t.trainer.wrongMark}`);
  return option;
}

function cardsBody(model: CardModel): HTMLElement[] {
  if (!model.revealed) {
    return [h('div', { class: 'answers' }, button(t.trainer.reveal, 'btn', { action: 'reveal', ...FOCUS }))];
  }
  return [
    h(
      'div',
      { class: 'answers answers-3' },
      ...GRADES.map(({ grade, label, style }, index) =>
        button(label, `btn ${style}`, { action: 'grade', grade, ...(index === 0 ? FOCUS : {}) }),
      ),
    ),
  ];
}

function quizBody(model: CardModel, right: string, wide: boolean): HTMLElement[] {
  const options = h(
    'div',
    { class: wide ? 'answers answers-3' : 'answers' },
    ...model.options.map((value, index) => optionButton(value, index, model, right)),
  );
  if (model.picked === null) return [options];
  return [
    options,
    verdict(model.picked === right),
    h('div', { class: 'answers' }, button(t.trainer.next, 'btn', { action: 'next', ...FOCUS })),
  ];
}

function prompt(model: CardModel, answered: boolean): HTMLElement | null {
  if (answered || model.mode === 'cards') return null;
  const text =
    model.mode === 'choice' ? t.trainer.chooseTranslation : `${model.entry.uz} — ${t.trainer.chooseArticle}`;
  return h('div', { class: 'flash-hint' }, text);
}

export function cardView(model: CardModel): HTMLElement {
  const { entry, mode } = model;
  const answered = mode === 'cards' ? model.revealed : model.picked !== null;
  const speak =
    model.canSpeak &&
    h(
      'button',
      { class: 'icon-btn', attrs: { type: 'button', 'aria-label': t.word.listen }, data: { action: 'speak' } },
      '🔊',
    );
  const body =
    mode === 'cards'
      ? cardsBody(model)
      : quizBody(model, mode === 'choice' ? entry.uz : entry.article, mode === 'article');
  return h(
    'div',
    { class: 'panel', data: { view: 'card', mode } },
    sessionTop(model),
    h(
      'div',
      { class: 'flash' },
      entry.emoji && h('span', { class: 'emoji', attrs: { 'aria-hidden': 'true' } }, entry.emoji),
      wordLine(entry, mode !== 'article' || answered),
      speak,
      prompt(model, answered),
      ...(answered ? details(entry) : []),
    ),
    ...body,
  );
}

function scoreText(state: State): string {
  const total = state.total;
  return state.mode === 'cards'
    ? fill(t.trainer.doneCards, { total })
    : fill(t.trainer.doneScore, { correct: total - state.missed.length, total });
}

export function summaryView(state: State, today: number): HTMLElement {
  return h(
    'div',
    { class: 'panel', data: { view: 'summary' } },
    h('h2', { class: 'panel-title' }, t.trainer.doneTitle),
    h('p', { data: { role: 'score' } }, scoreText(state)),
    h('p', { class: 'muted' }, `${t.trainer.statStreak}: ${streak(state.progress, today)}`),
    saveWarning(state.saveFailed),
    h(
      'div',
      { class: 'btn-row' },
      button(t.trainer.more, 'btn', { action: 'more', ...FOCUS }),
      button(t.trainer.back, 'btn btn-ghost', { action: 'setup' }),
    ),
  );
}

export function emptyView(kind: 'nothing' | 'noNouns'): HTMLElement {
  const nothing = kind === 'nothing';
  return h(
    'div',
    { class: 'panel', data: { view: 'empty' } },
    nothing && h('h2', { class: 'panel-title' }, t.trainer.nothingTitle),
    h('p', {}, nothing ? t.trainer.nothingText : t.trainer.noNouns),
    h(
      'div',
      { class: 'btn-row' },
      nothing && button(t.trainer.practiceAnyway, 'btn', { action: 'force', ...FOCUS }),
      button(t.trainer.back, 'btn btn-ghost', { action: 'setup', ...(nothing ? {} : FOCUS) }),
    ),
  );
}

/** What a screen reader should hear after the state changed; '' means nothing new. */
export function statusMessage(previous: State, next: State): string {
  if (next.screen === 'summary') {
    return previous.screen === 'summary' ? '' : `${t.trainer.doneTitle} ${scoreText(next)}`;
  }
  const entry = currentEntry(next);
  if (next.screen !== 'card' || !entry) return '';
  if (next.mode === 'cards' && next.revealed && !previous.revealed) return entry.uz;
  if (next.picked !== null && previous.picked === null) {
    const right = rightAnswer(next, entry);
    return next.picked === right
      ? t.trainer.correct
      : `${t.trainer.wrong}. ${t.trainer.rightAnswer} ${right}`;
  }
  const isNewCard = previous.screen !== 'card' || previous.queue[0] !== next.queue[0];
  if (!isNewCard) return '';
  return next.mode === 'article' ? entry.de : fullWord(entry);
}
