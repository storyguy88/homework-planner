import { HomeworkTask } from "./types";
import { generateId } from "./data";

// Sample homework assignments
export const sampleHomeworkTasks: HomeworkTask[] = [
    {
        id: generateId(),
        title: "Calculus Problem Set",
        subjectId: "math",
        description: "Complete problems 1-20 on derivatives and integrals",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        totalTimeEstimate: 120, // 2 hours
        remainingTime: 120,
        isComplete: false,
    },
    {
        id: generateId(),
        title: "Physics Lab Report",
        subjectId: "science",
        description: "Write up results from the pendulum experiment",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        totalTimeEstimate: 180, // 3 hours
        remainingTime: 180,
        isComplete: false,
    },
    {
        id: generateId(),
        title: "English Essay",
        subjectId: "english",
        description: "Write a 5-page analysis of 'The Great Gatsby'",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        totalTimeEstimate: 240, // 4 hours
        remainingTime: 240,
        isComplete: false,
    },
    {
        id: generateId(),
        title: "History Research Project",
        subjectId: "history",
        description: "Research and create a presentation on the Industrial Revolution",
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        totalTimeEstimate: 300, // 5 hours
        remainingTime: 300,
        isComplete: false,
    },
    {
        id: generateId(),
        title: "Geography Map Quiz",
        subjectId: "geography",
        description: "Study countries and capitals of South America",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        totalTimeEstimate: 90, // 1.5 hours
        remainingTime: 90,
        isComplete: false,
    },
    {
        id: generateId(),
        title: "Art Portfolio",
        subjectId: "art",
        description: "Complete three sketches using different techniques",
        dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days from now
        totalTimeEstimate: 150, // 2.5 hours
        remainingTime: 150,
        isComplete: false,
    },
    {
        id: generateId(),
        title: "Music Theory Quiz",
        subjectId: "music",
        description: "Study chord progressions and scales",
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
        totalTimeEstimate: 60, // 1 hour
        remainingTime: 60,
        isComplete: false,
    }
];

// Function to initialize sample data if no tasks exist
export const initializeSampleData = (): void => {
    // Only run in browser environment
    if (typeof window === "undefined") return;

    // Check if localStorage exists and if tasks are already present
    const existingTasks = localStorage.getItem("homework-tasks");

    // If no tasks exist, add sample tasks
    if (!existingTasks || JSON.parse(existingTasks).length === 0) {
        localStorage.setItem("homework-tasks", JSON.stringify(sampleHomeworkTasks));
    }
}; 