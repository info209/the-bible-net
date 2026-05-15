"use client";

import { useMemo } from 'react';
import { isLeapYear, getTotalDaysInYear } from '@/utils/calendarUtils';

interface CoverageCalendarProps {
    year: number;
    configuredDates: string[];
    isLoading?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

export function CoverageCalendar({ year, configuredDates, isLoading }: CoverageCalendarProps) {
    const configuredSet = useMemo(() => new Set(configuredDates), [configuredDates]);
    const leap = isLeapYear(year);
    const total = getTotalDaysInYear(year);
    const configured = configuredDates.length;

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {MONTHS.map(m => (
                    <div key={m} className="bg-white/5 rounded-xl h-36 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-white">{configured}</p>
                    <p className="text-xs text-gray-500 mt-1">Configured</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-red-400">{total - configured}</p>
                    <p className="text-xs text-gray-500 mt-1">Missing</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-400">{total}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Slots</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-400">{Math.round((configured / total) * 100)}%</p>
                    <p className="text-xs text-gray-500 mt-1">{leap ? '🗓 Leap Year' : 'Complete'}</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white/5 rounded-full h-2.5 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.round((configured / total) * 100)}%` }}
                />
            </div>

            {/* Monthly Calendar Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {MONTHS.map((monthName, monthIndex) => {
                    const daysInMonth = getDaysInMonth(year, monthIndex);
                    const firstDay = getFirstDayOfMonth(year, monthIndex);
                    const days: (number | null)[] = [];

                    for (let i = 0; i < firstDay; i++) days.push(null);
                    for (let d = 1; d <= daysInMonth; d++) days.push(d);

                    const monthConfigured = Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1;
                        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        return configuredSet.has(dateStr);
                    }).filter(Boolean).length;

                    return (
                        <div key={monthName} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-white text-xs font-bold">{monthName}</p>
                                <span className="text-xs text-gray-500">{monthConfigured}/{daysInMonth}</span>
                            </div>

                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 mb-1">
                                {WEEKDAYS.map(d => (
                                    <div key={d} className="text-center text-[9px] text-gray-600 font-medium py-0.5">{d}</div>
                                ))}
                            </div>

                            {/* Day cells */}
                            <div className="grid grid-cols-7 gap-px">
                                {days.map((day, i) => {
                                    if (!day) return <div key={`empty-${i}`} />;
                                    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const isConfigured = configuredSet.has(dateStr);
                                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                                    return (
                                        <div
                                            key={day}
                                            title={`${dateStr}: ${isConfigured ? '✓ Configured' : '✗ Missing'}`}
                                            className={`aspect-square rounded-sm flex items-center justify-center text-[9px] font-medium transition-colors
                                                ${isToday ? 'ring-1 ring-blue-400' : ''}
                                                ${isConfigured
                                                    ? 'bg-emerald-500/70 text-white'
                                                    : 'bg-white/5 text-gray-600 hover:bg-white/10'
                                                }`}
                                        >
                                            {day}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="size-3 bg-emerald-500/70 rounded-sm" />
                    Configured
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-3 bg-white/5 rounded-sm border border-white/10" />
                    Missing
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-3 rounded-sm ring-1 ring-blue-400 bg-white/5" />
                    Today
                </div>
            </div>
        </div>
    );
}
