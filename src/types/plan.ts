import { IPlan, IPlanDay } from '@/models/Plan';
import { IPlanProgress, IPlanDayProgress } from '@/models/PlanProgress';

export type PlanStatus = 'not-started' | 'in-progress' | 'completed';
export type ReadingState = 'not-started' | 'in-progress' | 'completed';

export interface Plan extends Omit<IPlan, 'toObject' | 'toJSON'> {}
export interface PlanDay extends IPlanDay {}
export interface PlanProgress extends Omit<IPlanProgress, 'toObject' | 'toJSON'> {}
export interface PlanDayProgress extends IPlanDayProgress {}

export interface PlanWithProgress {
  plan: Plan;
  progress: PlanProgress | null;
  status: PlanStatus;
  progressPercentage: number;
}

export interface DayContentData {
  dayNumber: number;
  dayTitle: string;
  scripture: string;
  devotional: string;
  reflection?: string;
  isCompleted: boolean;
  readingState: ReadingState;
  scrollPosition: number;
}

export interface CompletionData {
  planTitle: string;
  duration: number;
  totalDaysCompleted: number;
  completedDate: Date;
  rating?: number;
}

export interface LibraryTab {
  id: 'my-plans' | 'find-plans' | 'saved' | 'completed';
  label: string;
  icon?: React.ReactNode;
}
