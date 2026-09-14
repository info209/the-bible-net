'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { focusTarget } from './useAutoFocus';

export interface UseOtpInputOptions {
  /**
   * Length of the OTP. Defaults to 6.
   */
  length?: number;

  /**
   * Whether to automatically focus the first empty input on mount. Defaults to true.
   */
  autoFocus?: boolean;

  /**
   * Callback fired whenever the OTP value changes.
   */
  onChange?: (otp: string[], otpString: string) => void;

  /**
   * Callback fired when all boxes are filled.
   */
  onComplete?: (otpString: string) => void;

  /**
   * Whether inputs are currently disabled (e.g. during submission or resend).
   */
  disabled?: boolean;
}

export function useOtpInput(options: UseOtpInputOptions = {}) {
  const {
    length = 6,
    autoFocus = true,
    onChange,
    onComplete,
    disabled = false,
  } = options;

  const [otp, setOtp] = useState<string[]>(() => Array(length).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const hasInitialAutoFocusedRef = useRef(false);

  // Focus a specific index safely and synchronously
  const focusIndex = useCallback(
    (targetIndex: number) => {
      const clamped = Math.max(0, Math.min(targetIndex, length - 1));
      const el = inputRefs.current[clamped];
      if (el) {
        focusTarget(el, { force: true, select: true });
      }
    },
    [length]
  );

  // Focus the first empty box (or last if all filled)
  const focusFirstEmpty = useCallback(() => {
    const firstEmptyIndex = otp.findIndex((digit) => !digit);
    const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;
    focusIndex(targetIndex);
  }, [otp, length, focusIndex]);

  // Initial autofocus on mount / active toggle: run only once on mount, never on keystroke updates
  useEffect(() => {
    if (!autoFocus || hasInitialAutoFocusedRef.current || disabled) return;

    const firstEmptyIndex = otp.findIndex((digit) => !digit);
    const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;

    const el = inputRefs.current[targetIndex];
    if (el && el.isConnected) {
      const success = focusTarget(el, { force: true, select: true });
      if (success) {
        hasInitialAutoFocusedRef.current = true;
        return;
      }
    }

    // Use requestAnimationFrame in case Framer Motion or React mount layout is resolving
    const rafId = requestAnimationFrame(() => {
      const targetEl = inputRefs.current[targetIndex];
      if (targetEl && targetEl.isConnected) {
        const success = focusTarget(targetEl, { force: true, select: true });
        if (success) {
          hasInitialAutoFocusedRef.current = true;
        }
      }
    });

    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, disabled]);

  const updateOtp = useCallback(
    (newOtp: string[]) => {
      setOtp(newOtp);
      const otpStr = newOtp.join('');
      onChange?.(newOtp, otpStr);
      if (newOtp.every((d) => Boolean(d)) && otpStr.length === length) {
        onComplete?.(otpStr);
      }
    },
    [length, onChange, onComplete]
  );

  // Handles text change from keystrokes, multi-character paste, or SMS autofill
  const handleInput = useCallback(
    (index: number, rawValue: string) => {
      const digits = rawValue.replace(/\D/g, '');

      // User cleared the box
      if (!digits) {
        if (otp[index] !== '') {
          const newOtp = [...otp];
          newOtp[index] = '';
          updateOtp(newOtp);
        }
        return;
      }

      // Case 1: Full OTP or multi-digit entry (e.g. "123456" from SMS or paste)
      if (digits.length >= length) {
        const newOtp = digits.slice(0, length).split('');
        updateOtp(newOtp);
        focusIndex(length - 1);
        return;
      }

      // Case 2: Multi-digit entry smaller than full length (e.g. typing over existing character)
      if (digits.length > 1) {
        const currentVal = otp[index];
        // User typed a single digit on top of an already filled box
        if (digits.length === 2 && currentVal && (digits.startsWith(currentVal) || digits.endsWith(currentVal))) {
          const newDigit = digits.startsWith(currentVal) ? digits[1] : digits[0];
          const newOtp = [...otp];
          newOtp[index] = newDigit;
          updateOtp(newOtp);
          if (index < length - 1) {
            focusIndex(index + 1);
          }
          return;
        }

        // Otherwise distribute digits starting at index
        const newOtp = [...otp];
        let nextFocus = index;
        for (let i = 0; i < digits.length && (index + i) < length; i++) {
          newOtp[index + i] = digits[i];
          nextFocus = index + i + 1;
        }
        updateOtp(newOtp);
        focusIndex(Math.min(nextFocus, length - 1));
        return;
      }

      // Case 3: Single digit entry
      const newOtp = [...otp];
      newOtp[index] = digits;
      updateOtp(newOtp);

      if (index < length - 1) {
        focusIndex(index + 1);
      }
    },
    [otp, length, updateOtp, focusIndex]
  );

  // Keyboard navigation: Backspace, Arrows, Delete
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (otp[index]) {
          // Backspace on a filled box → clear that box first, preserving natural navigation
          const newOtp = [...otp];
          newOtp[index] = '';
          updateOtp(newOtp);
          e.preventDefault();
        } else if (index > 0) {
          // Backspace on an empty box → move to previous box
          focusIndex(index - 1);
          e.preventDefault();
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        focusIndex(index - 1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        focusIndex(index + 1);
        e.preventDefault();
      } else if (e.key === 'Delete') {
        if (otp[index]) {
          const newOtp = [...otp];
          newOtp[index] = '';
          updateOtp(newOtp);
          e.preventDefault();
        }
      }
    },
    [otp, length, updateOtp, focusIndex]
  );

  // Virtual keyboard backspace fallback for Android Chrome (Gboard/Samsung keyboard)
  const handleBeforeInput = useCallback(
    (index: number, e: React.FormEvent<HTMLInputElement>) => {
      const inputEvent = e.nativeEvent as unknown as { inputType?: string };
      const inputType = inputEvent?.inputType;

      if (inputType === 'deleteContentBackward') {
        if (otp[index]) {
          const newOtp = [...otp];
          newOtp[index] = '';
          updateOtp(newOtp);
          e.preventDefault();
        } else if (index > 0) {
          focusIndex(index - 1);
          e.preventDefault();
        }
      }
    },
    [otp, updateOtp, focusIndex]
  );

  // Paste handling
  const handlePaste = useCallback(
    (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
      if (!pastedData) return;

      if (pastedData.length >= length) {
        // Distribute across all boxes and focus the last box
        const newOtp = pastedData.slice(0, length).split('');
        updateOtp(newOtp);
        focusIndex(length - 1);
      } else {
        // Partial paste starting at index
        const newOtp = [...otp];
        let nextFocus = index;
        for (let i = 0; i < pastedData.length && (index + i) < length; i++) {
          newOtp[index + i] = pastedData[i];
          nextFocus = index + i + 1;
        }
        updateOtp(newOtp);
        focusIndex(Math.min(nextFocus, length - 1));
      }
    },
    [otp, length, updateOtp, focusIndex]
  );

  const handleFocus = useCallback((_index: number, e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  }, []);

  const handleClick = useCallback((_index: number, e: React.MouseEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).select();
  }, []);

  // Reset OTP: clears all boxes and focuses the first box
  const resetOtp = useCallback(() => {
    const empty = Array(length).fill('');
    updateOtp(empty);
    focusIndex(0);
  }, [length, updateOtp, focusIndex]);

  return {
    otp,
    setOtp,
    inputRefs,
    handleInput,
    handleKeyDown,
    handleBeforeInput,
    handlePaste,
    handleFocus,
    handleClick,
    resetOtp,
    focusIndex,
    focusFirstEmpty,
  };
}
