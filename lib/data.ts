"use client";

import { HomeworkTask, Subject, TimeBlock } from "./types";
import { parseISO, isSameDay } from "date-fns";

// Default subjects
export const defaultSubjects: Subject[] = [
  { id: "math", name: "Math", color: "#FF5757" },
  { id: "science", name: "Science", color: "#4CAF50" },
  { id: "english", name: "English", color: "#2196F3" },
  { id: "history", name: "History", color: "#FF9800" },
  { id: "geography", name: "Geography", color: "#9C27B0" },
  { id: "art", name: "Art", color: "#E91E63" },
  { id: "music", name: "Music", color: "#00BCD4" },
  { id: "pe", name: "PE", color: "#795548" },
];

// Local storage keys
const TASKS_STORAGE_KEY = "homework-tasks";
const SUBJECTS_STORAGE_KEY = "homework-subjects";
const TIME_BLOCKS_STORAGE_KEY = "homework-time-blocks";

// Helper function to initialize data from localStorage or use defaults
const initializeData = <T>(key: string, defaultData: T): T => {
  if (typeof window === "undefined") return defaultData;

  const storedData = localStorage.getItem(key);
  return storedData ? JSON.parse(storedData) : defaultData;
};

// Helper function to save data to localStorage
const saveData = <T>(key: string, data: T): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
};

// Tasks data management
export const getTasks = (): HomeworkTask[] => {
  return initializeData<HomeworkTask[]>(TASKS_STORAGE_KEY, []);
};

export const saveTask = (task: HomeworkTask): void => {
  const tasks = getTasks();
  const existingTaskIndex = tasks.findIndex((t) => t.id === task.id);

  if (existingTaskIndex >= 0) {
    tasks[existingTaskIndex] = task;
  } else {
    tasks.push(task);
  }

  saveData(TASKS_STORAGE_KEY, tasks);
};

export const deleteTask = (taskId: string): void => {
  const tasks = getTasks().filter((task) => task.id !== taskId);
  saveData(TASKS_STORAGE_KEY, tasks);

  // Also delete any time blocks associated with this task
  const timeBlocks = getTimeBlocks().filter((block) => block.taskId !== taskId);
  saveData(TIME_BLOCKS_STORAGE_KEY, timeBlocks);
};

// Subjects data management
export const getSubjects = (): Subject[] => {
  return initializeData<Subject[]>(SUBJECTS_STORAGE_KEY, defaultSubjects);
};

export const saveSubject = (subject: Subject): void => {
  const subjects = getSubjects();
  const existingSubjectIndex = subjects.findIndex((s) => s.id === subject.id);

  if (existingSubjectIndex >= 0) {
    subjects[existingSubjectIndex] = subject;
  } else {
    subjects.push(subject);
  }

  saveData(SUBJECTS_STORAGE_KEY, subjects);
};

export const deleteSubject = (subjectId: string): void => {
  const subjects = getSubjects().filter((subject) => subject.id !== subjectId);
  saveData(SUBJECTS_STORAGE_KEY, subjects);
};

// Time blocks data management
export const getTimeBlocks = (): TimeBlock[] => {
  return initializeData<TimeBlock[]>(TIME_BLOCKS_STORAGE_KEY, []);
};

export const saveTimeBlock = (timeBlock: TimeBlock): void => {
  const timeBlocks = getTimeBlocks();
  const existingTimeBlockIndex = timeBlocks.findIndex((b) => b.id === timeBlock.id);

  if (existingTimeBlockIndex >= 0) {
    timeBlocks[existingTimeBlockIndex] = timeBlock;
  } else {
    timeBlocks.push(timeBlock);
  }

  saveData(TIME_BLOCKS_STORAGE_KEY, timeBlocks);

  // Update the remaining time for the associated task
  updateTaskRemainingTime(timeBlock.taskId);
};

export const deleteTimeBlock = (timeBlockId: string): void => {
  const timeBlocks = getTimeBlocks();
  const timeBlock = timeBlocks.find((block) => block.id === timeBlockId);

  if (timeBlock) {
    const taskId = timeBlock.taskId;
    const updatedTimeBlocks = timeBlocks.filter((block) => block.id !== timeBlockId);
    saveData(TIME_BLOCKS_STORAGE_KEY, updatedTimeBlocks);

    // Update the remaining time for the associated task
    updateTaskRemainingTime(taskId);
  }
};

// Helper function to update a task's remaining time based on allocated time blocks
export const updateTaskRemainingTime = (taskId: string): void => {
  const tasks = getTasks();
  const task = tasks.find((t) => t.id === taskId);

  if (task) {
    const timeBlocks = getTimeBlocks().filter((block) => block.taskId === taskId);
    const allocatedTime = timeBlocks.reduce((total, block) => total + block.duration, 0);

    task.remainingTime = Math.max(0, task.totalTimeEstimate - allocatedTime);
    // Remove automatic completion - time allocation should not affect completion status
    // task.isComplete = task.remainingTime === 0;

    saveTask(task);
  }
};

// Helper function to get time blocks for a specific date
export const getTimeBlocksForDate = (date: Date): TimeBlock[] => {
  return getTimeBlocks().filter((block) => {
    const blockDate = parseISO(block.date);
    return isSameDay(blockDate, date);
  });
};

// Helper function to get time blocks for a specific task
export const getTimeBlocksForTask = (taskId: string): TimeBlock[] => {
  return getTimeBlocks().filter((block) => block.taskId === taskId);
};

// Helper function to format minutes as hours and minutes
export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
};

// Helper function to generate a unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};