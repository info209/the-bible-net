import { IPlan, IPlanDay, IPlanReadingItem } from '@/models/Plan';
import { IPlanProgress, IPlanDayProgress } from '@/models/PlanProgress';

export type PlanStatus = 'not-started' | 'in-progress' | 'completed';
export type ReadingState = 'not-started' | 'in-progress' | 'completed';

export interface PlanReadingItem extends IPlanReadingItem {}
export interface PlanDay extends IPlanDay {}
export interface Plan extends Omit<IPlan, 'toObject' | 'toJSON'> {}
export interface PlanProgress extends Omit<IPlanProgress, 'toObject' | 'toJSON'> {}
export interface PlanDayProgress extends IPlanDayProgress {}

export interface PlanWithProgress {
  plan: Plan;
  progress: PlanProgress | null;
  status: PlanStatus;
  progressPercentage: number;
}

export interface DayContentData {
  dayId: string;
  dayNumber: number;
  dayTitle: string;
  items: PlanReadingItem[];
  isCompleted: boolean;
  readingState: ReadingState;
  completedItemIds: string[];
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
}

