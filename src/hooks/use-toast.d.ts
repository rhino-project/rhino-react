export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  [key: string]: any;
}

export interface ToastResult {
  id: string;
  dismiss: () => void;
  update: (props: Partial<Toast>) => void;
}

export function useToast(): {
  toasts: Toast[];
  toast: (props: Partial<Toast>) => ToastResult;
  dismiss: (toastId?: string) => void;
};

export function toast(props: Partial<Toast>): ToastResult;
