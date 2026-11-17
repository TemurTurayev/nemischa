/** A tiny element builder: text is always inserted as text, never parsed as markup. */

type Child = Node | string | null | undefined | false;

interface Props {
  readonly class?: string;
  readonly attrs?: Readonly<Record<string, string>>;
  readonly data?: Readonly<Record<string, string>>;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (props.class) element.className = props.class;
  for (const [name, value] of Object.entries(props.attrs ?? {})) element.setAttribute(name, value);
  for (const [name, value] of Object.entries(props.data ?? {})) element.dataset[name] = value;
  element.append(...children.filter((child): child is Node | string => Boolean(child)));
  return element;
}
