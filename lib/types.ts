export type Subject = {
  id: string;
  name: string;
  color: string;
};

export type HomeworkTask = {
  id: string;
  title: string;
  subjectId: string;
  description: string;
  dueDate: string;
  totalTimeEstimate: number; // in minutes
  remainingTime: number; // in minutes
  isComplete: boolean;
};

export type TimeBlock = {
  id: string;
  taskId: string;
  date: string;
  duration: number; // in minutes
};

// Add a global draggedTaskId property to Window interface
declare global {
  interface Window {
    draggedTaskId: string | null;
  }
}