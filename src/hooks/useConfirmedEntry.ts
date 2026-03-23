import { useCallback, useRef, useState } from 'react';

export type ConfirmedEntryStep = 'entry' | 'confirm';

export interface ConfirmedEntryOptions {
  length?: number;
}

export interface UseConfirmedEntry {
  step: ConfirmedEntryStep;
  length: number;
  error: string | undefined;
  handleEntry: (value: string) => void;
  handleConfirm: (value: string) => void;
  goBack: () => boolean;
  jumpToConfirm: () => void;
  clearError: () => void;
  reset: () => void;
}

export function useConfirmedEntry(
  onComplete: (value: string) => void,
  options?: ConfirmedEntryOptions,
): UseConfirmedEntry {
  const length = options?.length ?? 6;
  const [step, setStep] = useState<ConfirmedEntryStep>('entry');
  const [error, setError] = useState<string | undefined>();
  const valueRef = useRef('');

  const handleEntry = useCallback((value: string) => {
    valueRef.current = value;
    setStep('confirm');
  }, []);

  const handleConfirm = useCallback(
    (value: string) => {
      if (valueRef.current !== value) {
        setError("PINs don't match");
        return;
      }
      setError(undefined);
      onComplete(valueRef.current);
    },
    [onComplete],
  );

  const goBack = useCallback((): boolean => {
    if (step === 'confirm') {
      setError(undefined);
      setStep('entry');
      return true;
    }
    return false;
  }, [step]);

  const jumpToConfirm = useCallback(() => {
    setError(undefined);
    setStep('confirm');
  }, []);

  const clearError = useCallback(() => setError(undefined), []);

  const reset = useCallback(() => {
    setStep('entry');
    setError(undefined);
    valueRef.current = '';
  }, []);

  return {
    step,
    length,
    error,
    handleEntry,
    handleConfirm,
    goBack,
    jumpToConfirm,
    clearError,
    reset,
  };
}
