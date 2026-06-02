# Features

## Native Web Component

- Registers a native `<virtual-list>` custom element.
- Extends `HTMLElement` directly.
- Works without framework-specific runtime code.
- Can be created in markup or with `new VirtualList<T>()`.
- Adds TypeScript support for the `virtual-list` tag through `HTMLElementTagNameMap`.

## Light DOM Rendering

- Uses light DOM instead of Shadow DOM.
- Generated rows are regular descendants of `<virtual-list>`.
- Row elements can be styled directly with selectors such as `virtual-list .row`.
- The `<virtual-list>` host is the scroll container.
- Internal structural elements use class names:
  - `.spacer`
  - `.content`
  - `.row`
- Existing `part` attributes remain on internal structural elements for compatibility:
  - `part="spacer"`
  - `part="content"`

## Fixed-Height Virtualization

- Supports large local in-memory arrays without rendering every item.
- Uses a fixed `row-height` value to calculate item positions.
- Creates a spacer element with the full virtual height.
- Positions the rendered row window with `transform: translateY(...)`.
- Renders only the current page of rows instead of the entire data set.
- Clears rendered rows when the data set is empty or the viewport has no height.

## Buffered Page Rendering

- Uses `overscan` as the total target rendered row count.
- Default `overscan` is `100`, so the component renders 100 rows total when possible.
- The rendered page includes both visible rows and buffered rows.
- If the viewport needs more rows than `overscan`, the component renders enough rows to cover the viewport.
- Reuses the current rendered page while visible rows are still inside it.
- Re-renders a new page only when scrolling reaches outside the current rendered page.
- Supports scrolling both down and up across rendered pages.
- Clamps rendered ranges at the beginning and end of the data set.

## Public Properties

- `items`: sets the data array and invalidates rendering.
- `data`: alias for setting and getting the data array.
- `renderItem`: sets the row renderer and invalidates rendering.
- `renderer`: alias for setting and getting the row renderer.
- `keyGetter`: sets and gets a function used to create each row's `data-key` value.

## Attributes

- `row-height`: sets the fixed row height in pixels.
- `overscan`: sets the target total rendered row count.
- Missing attributes do not override internal defaults.
- Invalid `row-height` values are ignored.
- Invalid `overscan` values are ignored.
- Attribute changes invalidate and schedule a render.

## Rendering API

- Row rendering is delegated to a user-provided renderer function.
- Renderer signature:

```ts
type VirtualListRenderer<T> = (
  item: T,
  index: number,
  row: HTMLElement
) => void;
```

- The renderer receives:
  - the item value
  - the item index
  - the row element to populate
- The component creates row elements and passes them to the renderer.
- The renderer controls row contents.

## Row Metadata

- Each rendered row gets the `row` class.
- Each rendered row gets a fixed inline height based on `row-height`.
- Each rendered row has `role="listitem"`.
- Each rendered row gets `ariaPosInSet`.
- Each rendered row gets `ariaSetSize`.
- Each rendered row gets `data-key` from `keyGetter` when provided.
- If no `keyGetter` is provided, the row index is used as the key.

## Accessibility

- The `<virtual-list>` host uses `role="list"`.
- The `<virtual-list>` host sets `aria-rowcount` to the total item count.
- Rendered rows expose their position and total set size through ARIA metadata.

## Scrolling

- Provides `scrollToIndex(index, align)`.
- Supports `align` values accepted by `ScrollLogicalPosition`.
- Handles `start`, `center`, and `end` alignment.
- Clamps requested indexes into the valid data range.
- Tracks scroll position with a passive scroll listener.

## Refresh And Invalidation

- Provides `refresh()` to force a render invalidation.
- Provides `invalidateRender()` to reset the rendered range and schedule rendering.
- Changing `items`, `data`, `renderItem`, `renderer`, `keyGetter`, `row-height`, or `overscan` invalidates the current rendered range.
- Rendering is scheduled with `requestAnimationFrame`.
- Multiple updates in the same frame are coalesced into one render.

## Resize Handling

- Uses `ResizeObserver` to track host size changes.
- Recalculates the viewport height when the component is resized.
- Schedules rendering after resize changes.
- Disconnects the observer when the component is disconnected.

## TypeScript Configuration

- Uses TypeScript 6.x.
- Keeps strict project checks enabled through TS 6 defaults and explicit stricter options.
- Enables additional checks such as unchecked indexed access, exact optional property types, implicit return checks, unused checks, and index-signature property access checks.

## Dependencies

- Has no runtime dependencies.
- Uses Vite for development and production builds.
- Uses TypeScript for type checking.

## Current Limitations

- Supports fixed row heights only.
- Does not measure dynamic row heights.
- Does not support sticky headers.
- Does not support column virtualization.
- Does not recycle existing row DOM nodes between pages.
- The renderer should avoid unsafe `innerHTML` for user-controlled content.
