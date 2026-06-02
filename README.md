# Native Virtual List

Minimal native Web Component for fixed-height virtualization with local data.

![Live preview](https://raw.githubusercontent.com/Soul-Master/native-virtual-list/preview-assets/preview.png)

https://soul-master.github.io/native-virtual-list/

## Features

- Fixed row height virtualization
- Overscan
- ResizeObserver
- Native & Fast by default

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Usage

```html
<virtual-list row-height="56" overscan="8"></virtual-list>
```

```ts
import { VirtualList } from '@esmodule/native-virtual-list';

type User = {
  id: number;
  name: string;
};

const list = new VirtualList<User>();
list.data = [{ id: 1, name: "Alice" }];
list.keyGetter = (user) => user.id;
list.renderer = (user, _index, row) => {
  const name = document.createElement("td");
  name.textContent = user.name;

  row.replaceChildren(name);
};

document.body.append(list);
```

## Limitations

- Fixed row height only.
- No dynamic measurement.
- No sticky headers.
- No column virtualization.
- Renderer should avoid unsafe `innerHTML` for user-controlled content.
