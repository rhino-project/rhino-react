export interface EventsAdapter {
  emit(key: string, value: string | null): void;
  subscribe(key: string, callback: (value: string | null) => void): () => void;
}

export function createNativeEvents(): EventsAdapter;
export declare const events: EventsAdapter;
export { createNativeEvents as createWebEvents };
