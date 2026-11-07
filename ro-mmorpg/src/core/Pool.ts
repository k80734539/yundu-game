/** 簡單物件池：避免每次打擊都配置新物件 */
export class Pool<T extends { alive: boolean }> {
  items: T[] = [];
  constructor(private make: () => T) {}
  get(): T {
    for (const it of this.items) if (!it.alive) { it.alive = true; return it; }
    const it = this.make(); it.alive = true; this.items.push(it); return it;
  }
  each(fn: (t: T) => void) { for (const it of this.items) if (it.alive) fn(it); }
  get activeCount() { let n = 0; for (const it of this.items) if (it.alive) n++; return n; }
  clear() { for (const it of this.items) it.alive = false; }
}
