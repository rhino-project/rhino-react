export interface EventsAdapter {
  emit(key: string, value: string | null): void;
  subscribe(key: string, callback: (value: string | null) => void): () => void;
}

export function createWebEvents(): EventsAdapter;
export declare const events: EventsAdapter;
