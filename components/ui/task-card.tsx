"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { Clock, Calendar, Trash2, AlertCircle, Pizza } from "lucide-react";
import { HomeworkTask } from "@/lib/types";
import { deleteTask, formatTime, getSubjects, getTimeBlocksForTask, saveTask } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

interface TaskCardProps {
  task: HomeworkTask;
  onUpdate: () => void;
}

// Pizza progress component that shows slices disappearing as progress increases
function PizzaProgress({ percentage }: { percentage: number }) {
  // Calculate how many slices to show (8 slices total)
  // As percentage increases, fewer slices are shown
  const slicesToShow = Math.max(0, Math.ceil(8 * (1 - percentage / 100)));

  // Generate SVG paths for pizza slices
  const generatePizzaSlices = () => {
    const slices = [];
    const totalSlices = 8;
    const anglePerSlice = 360 / totalSlices;

    for (let i = 0; i < totalSlices; i++) {
      // Skip rendering slices that should be "eaten"
      if (i >= slicesToShow) continue;

      const startAngle = i * anglePerSlice;
      const endAngle = (i + 1) * anglePerSlice;

      // Convert angles to radians
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;

      // Calculate points - increased size
      const centerX = 36;
      const centerY = 36;
      const radius = 30;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      // Create SVG path for slice
      const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      // Add slice with crust and toppings
      slices.push(
        <g key={i}>
          {/* Pizza slice base */}
          <path
            d={path}
            fill="#fbbf24"
            stroke="#d97706"
            strokeWidth="0.8"
          />

          {/* Add cheese texture */}
          <path
            d={path}
            fill="url(#cheese-pattern)"
            fillOpacity="0.3"
          />

          {/* Add pepperoni toppings - increased size */}
          {i % 2 === 0 && (
            <circle
              cx={centerX + (radius * 0.6) * Math.cos((startAngle + anglePerSlice / 3 - 90) * Math.PI / 180)}
              cy={centerY + (radius * 0.6) * Math.sin((startAngle + anglePerSlice / 3 - 90) * Math.PI / 180)}
              r="3.5"
              fill="#ef4444"
            />
          )}

          {/* Add green pepper topping - increased size */}
          {i % 3 === 1 && (
            <circle
              cx={centerX + (radius * 0.7) * Math.cos((startAngle + anglePerSlice * 2 / 3 - 90) * Math.PI / 180)}
              cy={centerY + (radius * 0.7) * Math.sin((startAngle + anglePerSlice * 2 / 3 - 90) * Math.PI / 180)}
              r="3.2"
              fill="#22c55e"
            />
          )}

          {/* Add crust */}
          <path
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
            fill="none"
            stroke="#92400e"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      );
    }

    return slices;
  };

  // Get status text based on slices remaining
  const getStatusText = () => {
    if (slicesToShow === 8) return "Full pizza!";
    if (slicesToShow >= 6) return `${slicesToShow} slices left`;
    if (slicesToShow >= 4) return "Half gone!";
    if (slicesToShow >= 1) return "Almost gone!";
    return "All done!";
  };

  // Get status color based on slices remaining
  const getStatusColor = () => {
    if (slicesToShow === 0) return "text-green-500";
    if (slicesToShow <= 2) return "text-orange-500";
    if (slicesToShow <= 4) return "text-amber-600";
    return "text-amber-700";
  };

  // If all slices are gone, show a completed pizza (empty plate)
  if (slicesToShow === 0) {
    return (
      <div className="pizza-progress-container flex flex-col items-center">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="34" fill="#f5f5f4" stroke="#e7e5e4" strokeWidth="1" />
          <circle cx="36" cy="36" r="24" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2,2" />
          <text x="36" y="42" fontSize="22" textAnchor="middle" fill="#22c55e">✓</text>
        </svg>
        <span className="text-sm text-green-500 font-medium mt-1">All done!</span>
      </div>
    );
  }

  return (
    <div className="pizza-progress-container flex flex-col items-center">
      <svg width="72" height="72" viewBox="0 0 72 72">
        {/* Define patterns */}
        <defs>
          <pattern id="cheese-pattern" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <path d="M 0,0 L 2,0 L 2,2 L 0,2 Z" fill="#fef3c7" fillOpacity="0.5" />
          </pattern>
        </defs>

        {/* Pizza plate */}
        <circle cx="36" cy="36" r="34" fill="#f5f5f4" stroke="#e7e5e4" strokeWidth="1" />
        {generatePizzaSlices()}
      </svg>
      <div className="flex items-center mt-1">
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        <Badge
          variant="default"
          className={`ml-2 text-xs text-white ${percentage >= 100 ? "bg-green-500 hover:bg-green-500/90" : "bg-red-500 hover:bg-red-500/90"}`}
        >
          {percentage >= 100 ? "Will Finish!" : "Will Not Finish"}
        </Badge>
      </div>
    </div>
  );
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Get subject information
  const subjects = getSubjects();
  const subject = subjects.find(s => s.id === task.subjectId);

  // Create subtle background and border colors from subject color
  const getSubtleColor = (color: string, opacity: number) => {
    // Convert hex to rgba for transparency
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return color ? hexToRgba(color, opacity) : undefined;
  };

  const subtleBackgroundColor = subject ? getSubtleColor(subject.color, 0.1) : undefined;
  const subtleBorderColor = subject ? getSubtleColor(subject.color, 0.5) : undefined;

  // Get time blocks for this task
  const timeBlocks = getTimeBlocksForTask(task.id);
  const totalAllocatedTime = timeBlocks.reduce((total, block) => total + block.duration, 0);

  // Calculate progress percentage
  const progressPercentage = Math.min(100, Math.round((totalAllocatedTime / task.totalTimeEstimate) * 100));
  const isFullyAllocated = progressPercentage >= 100;

  // Calculate progress bar color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500'; // Only turn green when fully allocated
    if (percentage >= 80) return 'bg-yellow-500'; // Almost there - yellow
    if (percentage >= 60) return 'bg-yellow-600'; // Getting closer - darker yellow
    if (percentage >= 40) return 'bg-orange-500'; // Some progress - orange
    if (percentage >= 20) return 'bg-orange-600'; // Little progress - darker orange
    return 'bg-red-500'; // Very little progress - red
  };

  const progressBarColor = getProgressColor(progressPercentage);

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
        style={{
          backgroundColor: subtleBackgroundColor,
          borderColor: subtleBorderColor,
          borderWidth: subject ? '1px' : undefined,
          borderStyle: subject ? 'solid' : undefined
        }}
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
                    {formatTime(task.totalTimeEstimate)}
                  </span>
                </div>

                {isOverdue && !task.isComplete && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Past due</span>
                  </div>
                )}
              </div>

              {/* Pizza Progress Indicator */}
              <div className="mt-3 flex justify-center">
                <PizzaProgress percentage={progressPercentage} />
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${progressBarColor}`}
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Display time allocation info */}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{formatTime(totalAllocatedTime)} scheduled</span>
                <span>{!task.isComplete ? `${formatTime(task.remainingTime)} left` : "Completed"}</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0 pb-3 px-4">
          <div className="w-full flex justify-end items-center">
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