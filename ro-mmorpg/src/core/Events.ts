type Fn = (...a: any[]) => void;
export class Events {
  private m = new Map<string, Set<Fn>>();
  on(ev: string, fn: Fn) { if (!this.m.has(ev)) this.m.set(ev, new Set()); this.m.get(ev)!.add(fn); return () => this.m.get(ev)!.delete(fn); }
  emit(ev: string, ...a: any[]) { this.m.get(ev)?.forEach((f) => f(...a)); }
}
