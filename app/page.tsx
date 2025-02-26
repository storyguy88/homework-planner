"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskCard } from "@/components/ui/task-card";
import { TaskForm } from "@/components/task-form";
import { CalendarView } from "@/components/calendar-view";
import { getTasks } from "@/lib/data";
import { HomeworkTask } from "@/lib/types";
import { BookOpen, Plus } from "lucide-react";

export default function Home() {
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Refresh tasks periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadTasks();
    }, 1000); // Check every second for changes
    
    return () => clearInterval(intervalId);
  }, []);

  // Refresh tasks
  const loadTasks = () => {
    setTasks(getTasks());
  };

  // Sort tasks by due date and completion status
  const sortedTasks = [...tasks].sort((a, b) => {
    // First sort by completion status (incomplete first)
    if (a.isComplete !== b.isComplete) {
      return a.isComplete ? 1 : -1;
    }
    
    // Then sort by due date (earliest first)
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Homework Time Budgeting</h1>
          <p className="text-muted-foreground">Plan your study time and stay on track with your assignments</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks Column - Takes up 1/3 on large screens */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Homework Tasks
              </h2>
              <Button onClick={() => setIsAddTaskOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
            
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">No homework tasks yet</h3>
                  <p className="text-muted-foreground mb-4">Add your first homework task to get started</p>
                  <Button onClick={() => setIsAddTaskOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
                ))}
              </div>
            )}
          </div>

          {/* Calendar Column - Takes up 2/3 on large screens */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Schedule Your Study Time</CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarView />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Task Dialog */}
        <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Homework Task</DialogTitle>
            </DialogHeader>
            <TaskForm onSuccess={() => {
              setIsAddTaskOpen(false);
              loadTasks();
            }} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}