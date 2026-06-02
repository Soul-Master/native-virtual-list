export type VirtualListRenderer<T> = (
  item: T,
  index: number,
  row: HTMLElement
) => void;

export type VirtualListKeyGetter<T> = (
  item: T,
  index: number
) => string | number;

export type VirtualListRenderInfo = {
  didRender: boolean;
  lastRenderDurationMs: number;
  rerenderCount: number;
  total: number;
  visibleStart: number;
  visibleEnd: number;
  renderedStart: number;
  renderedEnd: number;
  renderedCount: number;
};

export class VirtualList<T = unknown> extends HTMLElement {
  static readonly observedAttributes = ['row-height', 'overscan'];

  set items(value: readonly T[]) {
    this._items = value;
    this.invalidateRender();
  }

  set renderItem(value: VirtualListRenderer<T>) {
    this._renderItem = value;
    this.invalidateRender();
  }

  private readonly spacer: HTMLDivElement;
  private readonly content: HTMLTableElement;
  private readonly rows: HTMLTableSectionElement;

  private resizeObserver?: ResizeObserver;
  private animationFrameId = 0;

  private _items: readonly T[] = [];
  private _renderItem: VirtualListRenderer<T> | undefined;
  private getKey: VirtualListKeyGetter<T> | undefined;

  private rowHeight = 40;
  private overscan = 100;
  private viewportHeight = 0;
  private currentScrollTop = 0;

  private firstRenderedIndex = -1;
  private lastRenderedIndex = -1;
  private lastRenderDurationMs = 0;
  private rerenderCount = 0;

  constructor() {
    super();

    this.role = 'list';
    this.innerHTML = `
      <div class='spacer' part='spacer'>
        <table class='content' part='content'>
          <colgroup>
            <col class='column-id'>
            <col class='column-name'>
            <col class='column-email'>
          </colgroup>
          <tbody class='rows'></tbody>
        </table>
      </div>
    `;

    const spacer = this.querySelector<HTMLDivElement>('.spacer');
    const content = this.querySelector<HTMLTableElement>('.content');
    const rows = this.querySelector<HTMLTableSectionElement>('.rows');

    if (!spacer || !content || !rows) {
      throw new Error('VirtualList DOM initialization failed.');
    }

    this.spacer = spacer;
    this.content = content;
    this.rows = rows;
  }

  connectedCallback(): void {
    this.syncAttributes();

    this.addEventListener('scroll', this.handleScroll, { passive: true });

    this.resizeObserver = new ResizeObserver(() => {
      this.viewportHeight = this.clientHeight;
      this.scheduleRender();
    });

    this.resizeObserver.observe(this);

    this.viewportHeight = this.clientHeight;
    this.scheduleRender();
  }

  disconnectedCallback(): void {
    this.removeEventListener('scroll', this.handleScroll);
    this.resizeObserver?.disconnect();

    if (this.animationFrameId !== 0) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  attributeChangedCallback(): void {
    this.syncAttributes();
    this.invalidateRender();
  }

  set data(value: readonly T[]) {
    this._items = value;
    this.invalidateRender();
  }

  get data(): readonly T[] {
    return this._items;
  }

  set renderer(value: VirtualListRenderer<T> | undefined) {
    this._renderItem = value;
    this.invalidateRender();
  }

  get renderer(): VirtualListRenderer<T> | undefined {
    return this._renderItem;
  }

  set keyGetter(value: VirtualListKeyGetter<T> | undefined) {
    this.getKey = value;
    this.invalidateRender();
  }

  get keyGetter(): VirtualListKeyGetter<T> | undefined {
    return this.getKey;
  }

  scrollToIndex(index: number, align: ScrollLogicalPosition = 'start'): void {
    const maxIndex = Math.max(0, this._items.length - 1);
    const safeIndex = Math.max(0, Math.min(index, maxIndex));
    const itemTop = safeIndex * this.rowHeight;

    if (align === 'center') {
      this.scrollTop = itemTop - this.viewportHeight / 2 + this.rowHeight / 2;
      return;
    }

    if (align === 'end') {
      this.scrollTop = itemTop - this.viewportHeight + this.rowHeight;
      return;
    }

    this.scrollTop = itemTop;
  }

  refresh(): void {
    this.invalidateRender();
  }

  invalidateRender(): void {
    this.firstRenderedIndex = -1;
    this.lastRenderedIndex = -1;
  
    this.scheduleRender();
  }

  private readonly handleScroll = (): void => {
    this.currentScrollTop = this.scrollTop;
    this.scheduleRender();
  };

  private syncAttributes(): void {
    const rowHeightAttribute = this.getAttribute('row-height');
    const overscanAttribute = this.getAttribute('overscan');
    const rowHeight = Number(rowHeightAttribute);
    const overscan = Number(overscanAttribute);

    if (rowHeightAttribute !== null && Number.isFinite(rowHeight) && rowHeight > 0) {
      this.rowHeight = rowHeight;
    }

    if (overscanAttribute !== null && Number.isFinite(overscan) && overscan >= 0) {
      this.overscan = Math.floor(overscan);
    }
  }

  private scheduleRender(): void {
    if (!this.isConnected || this.animationFrameId !== 0) return;

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = 0;
      this._render();
    });
  }

  private _render(): void {
    if (!this._renderItem) return;

    const total = this._items.length;
    const totalHeight = total * this.rowHeight;

    this.spacer.style.height = `${totalHeight}px`;
    this.setAttribute('aria-rowcount', String(total));

    if (total === 0 || this.viewportHeight <= 0) {
      const renderStartedAt = performance.now();

      this.rows.replaceChildren();
      this.firstRenderedIndex = -1;
      this.lastRenderedIndex = -1;
      this.rerenderCount += 1;
      this.lastRenderDurationMs = performance.now() - renderStartedAt;
      this.emitRenderInfo({
        didRender: true,
        total,
        visibleStart: 0,
        visibleEnd: 0,
        renderedStart: -1,
        renderedEnd: -1
      });
      return;
    }

    const visibleStart = Math.floor(this.currentScrollTop / this.rowHeight);
    const visibleCount = Math.ceil(this.viewportHeight / this.rowHeight);
    const visibleEnd = Math.min(total, visibleStart + visibleCount);
    const renderCount = Math.min(total, Math.max(visibleCount, this.overscan));
    const maxStartIndex = Math.max(0, total - renderCount);

    if (
      this.firstRenderedIndex !== -1 &&
      visibleStart >= this.firstRenderedIndex &&
      visibleEnd <= this.lastRenderedIndex
    ) {
      this.emitRenderInfo({
        didRender: false,
        total,
        visibleStart,
        visibleEnd,
        renderedStart: this.firstRenderedIndex,
        renderedEnd: this.lastRenderedIndex
      });
      return;
    }

    const startIndex = visibleStart < this.firstRenderedIndex
      ? Math.max(0, visibleEnd - renderCount)
      : Math.min(visibleStart, maxStartIndex);
    const endIndex = startIndex + renderCount;

    if (startIndex === this.firstRenderedIndex && endIndex === this.lastRenderedIndex) {
      return;
    }

    this.firstRenderedIndex = startIndex;
    this.lastRenderedIndex = endIndex;
    this.content.style.transform = `translateY(${startIndex * this.rowHeight}px)`;

    const renderStartedAt = performance.now();
    const fragment = document.createDocumentFragment();

    for (let index = startIndex; index < endIndex; index += 1) {
      const item = this._items[index];
      if (item === undefined) continue;

      const row = document.createElement('tr');
      row.className = 'row';
      row.style.height = `${this.rowHeight}px`;
      row.role = 'listitem';
      row.ariaPosInSet = String(index + 1);
      row.ariaSetSize = String(total);
      row.dataset["key"] = String(this.getKey?.(item, index) ?? index);

      this._renderItem(item, index, row);
      fragment.append(row);
    }

    this.rows.replaceChildren(fragment);
    this.rerenderCount += 1;
    this.lastRenderDurationMs = performance.now() - renderStartedAt;
    this.emitRenderInfo({
      didRender: true,
      total,
      visibleStart,
      visibleEnd,
      renderedStart: startIndex,
      renderedEnd: endIndex
    });
  }

  private emitRenderInfo(
    detail: Pick<
      VirtualListRenderInfo,
      'didRender' | 'total' | 'visibleStart' | 'visibleEnd' | 'renderedStart' | 'renderedEnd'
    >
  ): void {
    const renderedCount = Math.max(0, detail.renderedEnd - detail.renderedStart);

    this.dispatchEvent(new CustomEvent<VirtualListRenderInfo>('renderinfo', {
      detail: {
        ...detail,
        lastRenderDurationMs: this.lastRenderDurationMs,
        rerenderCount: this.rerenderCount,
        renderedCount
      }
    }));
  }
}

if (!customElements.get('virtual-list')) {
  customElements.define('virtual-list', VirtualList);
}

declare global {
  interface HTMLElementTagNameMap {
    'virtual-list': VirtualList;
  }

  interface HTMLElementEventMap {
    renderinfo: CustomEvent<VirtualListRenderInfo>;
  }
}
