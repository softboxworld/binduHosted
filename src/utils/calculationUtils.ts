import { Task } from '../types';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export function calculateWeeklyEarnings(tasks: Task[]): number {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  return tasks
    .filter(task => {
      const taskDate = new Date(task.due_date);
      return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
    })
    .reduce((total, task) => total + task.amount, 0);
}