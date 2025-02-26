"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { Clock, Calendar, Trash2, AlertCircle } from "lucide-react";
import { HomeworkTask } from "@/lib/types";
import { deleteTask, formatTime, getSubjects, getTimeBlocksForTask, saveTask } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

interface TaskCardProps {
  task: HomeworkTask;
  onUpdate: () => void;
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Get subject information
  const subjects = getSubjects();
  const subject = subjects.find(s => s.id === task.subjectId);

  // Get time blocks for this task
  const timeBlocks = getTimeBlocksForTask(task.id);
  const totalAllocatedTime = timeBlocks.reduce((total, block) => total + block.duration, 0);

  // Calculate due date status
  const dueDate = parseISO(task.dueDate);
  const isOverdue = isBefore(dueDate, new Date()) && !task.isComplete;
  const isDueToday = isToday(dueDate);

  // Handle task completion toggle
  const handleToggleComplete = () => {
    const updatedTask = {
      ...task,
      isComplete: !task.isComplete,
    };

    saveTask(updatedTask);

    toast({
      title: updatedTask.isComplete ? "Task completed" : "Task reopened",
      description: updatedTask.isComplete
        ? "Great job! You've completed this task."
        : "The task has been marked as incomplete.",
    });

    onUpdate();
  };

  // Handle task deletion
  const handleDelete = () => {
    deleteTask(task.id);

    toast({
      title: "Task deleted",
      description: "The task has been permanently deleted.",
    });

    setIsDeleteDialogOpen(false);
    onUpdate();
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Set the dragged data
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.setData('application/homework-task', JSON.stringify({
      id: task.id,
      title: task.title
    }));

    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';

    // Add dragging class to the element
    e.currentTarget.classList.add('dragging');

    // Set global state for drag operation
    setIsDragging(true);

    // Store the task ID in a global variable for components that can't access dataTransfer
    if (typeof window !== 'undefined') {
      window.draggedTaskId = task.id;
    }

    // Dispatch a custom event to notify other components
    const dragStartEvent = new CustomEvent('taskDragStart', {
      detail: { taskId: task.id }
    });
    document.dispatchEvent(dragStartEvent);
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Remove dragging class
    e.currentTarget.classList.remove('dragging');

    // Reset drag state
    setIsDragging(false);

    // Clear the global task ID
    if (typeof window !== 'undefined') {
      window.draggedTaskId = null;
    }

    // Dispatch a custom event to notify other components
    const dragEndEvent = new CustomEvent('taskDragEnd');
    document.dispatchEvent(dragEndEvent);
  };

  return (
    <>
      <Card
        className={`relative transition-all ${task.isComplete ? "opacity-70" : ""
          } ${isDragging ? "opacity-50 shadow-lg" : ""}`}
        draggable={!task.isComplete}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <CardContent className="pt-4 pb-2">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className={`font-medium truncate ${task.isComplete ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </h3>

                {subject && (
                  <Badge
                    className="whitespace-nowrap"
                    style={{
                      backgroundColor: subject.color,
                      color: 'white'
                    }}
                  >
                    {subject.name}
                  </Badge>
                )}
              </div>

              {task.description && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className={isOverdue ? "text-destructive font-medium" : ""}>
                    {isOverdue ? "Overdue" : isDueToday ? "Today" : format(dueDate, "MMM d")}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {task.isComplete
                      ? `${formatTime(task.totalTimeEstimate)}`
                      : `${formatTime(task.remainingTime)} left`}
                  </span>
                </div>

                {isOverdue && !task.isComplete && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Past due</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        {!task.isComplete && (
          <CardFooter className="pt-0 pb-3 px-4">
            <div className="w-full flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {timeBlocks.length > 0
                  ? `${formatTime(totalAllocatedTime)} scheduled`
                  : "Not scheduled yet"}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete "{task.title}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}