'use client';

import { useState, useEffect } from 'react';
import { getRelativeTime, getNextUpdateDelay, SupportedLocale } from '@/utils/time';

interface RelativeTimestampProps {
  date: Date | string | number | null | undefined;
  className?: string;
  prefix?: string;
  locale?: SupportedLocale;
}

export function RelativeTimestamp({ date, className, prefix, locale = 'en' }: RelativeTimestampProps) {
  const [formattedText, setFormattedText] = useState<string>(() => getRelativeTime(date, locale));

  useEffect(() => {
    setFormattedText(getRelativeTime(date, locale));

    if (!date) return;

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return;

    let timerId: NodeJS.Timeout | null = null;

    const scheduleNextUpdate = () => {
      const delayMs = getNextUpdateDelay(date);
      timerId = setTimeout(() => {
        setFormattedText(getRelativeTime(date, locale));
        scheduleNextUpdate();
      }, delayMs);
    };

    scheduleNextUpdate();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [date, locale]);

  if (!formattedText) return null;

  return (
    <span className={className}>
      {prefix ? `${prefix} ${formattedText}` : formattedText}
    </span>
  );
}

