import { VirtualList, type VirtualListRenderInfo } from '../src';
import './style.css';

type User = {
  id: number;
  name: string;
  email: string;
};

const list = requireElement<VirtualList<User>>('virtual-list');
const rowCount = requireElement<HTMLSelectElement>('[data-row-count]');
const renderTime = requireElement<HTMLElement>('[data-debug-render-time]');
const renderCount = requireElement<HTMLElement>('[data-debug-render-count]');
const meter = requireElement<HTMLElement>('.range-meter');
const buffer = requireElement<HTMLElement>('[data-debug-buffer]');
const visible = requireElement<HTMLElement>('[data-debug-visible]');
const debugPanel = requireElement<HTMLTableRowElement>('[data-debug-panel]');
const debugToggle = requireElement<HTMLInputElement>('[data-debug-toggle]');

list.keyGetter = (user: User) => user.id;
list.renderer = (user: User, _index: number, row: HTMLElement) => {
  const id = document.createElement('td');
  id.className = 'cell cell-id';
  id.textContent = `#${user.id}`;

  const name = document.createElement('td');
  name.className = 'cell cell-name';
  name.textContent = user.name;

  const email = document.createElement('td');
  email.className = 'cell cell-email';
  email.textContent = user.email;

  row.replaceChildren(id, name, email);
};
updateRows();

rowCount.addEventListener('change', updateRows);

list.addEventListener('renderinfo', (event: CustomEvent<VirtualListRenderInfo>) => {
  const detail = event.detail;
  const renderedRect = toPixelRect(detail.renderedStart, detail.renderedEnd, detail.total);
  const visibleRect = toPixelRect(detail.visibleStart, detail.visibleEnd, detail.total);

  renderTime.textContent = `${detail.lastRenderDurationMs.toFixed(2)} ms`;
  renderCount.textContent = String(detail.rerenderCount);
  buffer.style.left = `${renderedRect.left}px`;
  buffer.style.width = `${renderedRect.width}px`;
  buffer.title = `Buffered rows: ${formatRange(detail.renderedStart, detail.renderedEnd, detail.total)}`;
  visible.style.left = `${visibleRect.left}px`;
  visible.style.width = `${visibleRect.width}px`;
  visible.title = `Visible rows: ${formatRange(detail.visibleStart, detail.visibleEnd, detail.total)}`;
});

debugToggle.addEventListener('change', () => {
  debugPanel.hidden = !debugToggle.checked;
});

function toPixelRect(start: number, end: number, total: number): { left: number; width: number } {
  const meterWidth = meter.clientWidth;

  if (total <= 0 || meterWidth <= 0 || start < 0 || end <= start) {
    return { left: 0, width: 0 };
  }

  const clampedStart = Math.max(0, Math.min(total, start));
  const clampedEnd = Math.max(clampedStart, Math.min(total, end));
  const left = Math.floor((clampedStart / total) * meterWidth);
  const right = Math.ceil((clampedEnd / total) * meterWidth);

  return {
    left,
    width: Math.max(1, right - left)
  };
}

function formatRange(start: number, end: number, total: number): string {
  if (total <= 0 || start < 0 || end <= start) return 'none';

  const count = end - start;

  return `${(start + 1).toLocaleString()}-${end.toLocaleString()}`;
}

function updateRows(): void {
  const count = Number(rowCount.value);
  const users = createUsers(count);

  list.scrollTop = 0;
  list.data = users;
}

function createUsers(count: number): User[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`
  }));
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  return element;
}
