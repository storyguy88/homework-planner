"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format, parseISO, startOfDay, addMonths, subMonths, endOfMonth, startOfMonth, isAfter, isBefore, isSameMonth } from "date-fns";
import { Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { HomeworkTask, TimeBlock } from "@/lib/types";
import { deleteTimeBlock, formatTime, generateId, getSubjects, getTasks, getTimeBlocks, saveTimeBlock } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

// Import FullCalendar and required plugins
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';

export function CalendarView() {
  const { toast } = useToast();
  const calendarRef = useRef<any>(null);
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HomeworkTask | null>(null);
  const [duration, setDuration] = useState(30); // Default 30 minutes
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'dayGridMonth' | 'timeGridWeek'>('dayGridMonth');
  const subjects = getSubjects();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [continuousScrollEnabled, setContinuousScrollEnabled] = useState(true);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const calendarContentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const lastScrollPositionRef = useRef(0);
  const [monthsToRender, setMonthsToRender] = useState<Date[]>([]);
  const [currentViewTitle, setCurrentViewTitle] = useState('');
  const [isClient, setIsClient] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const monthHeightsRef = useRef<Map<string, number>>(new Map());
  const isManualScrollingRef = useRef(false);
  const visibleMonthsRef = useRef<Map<string, boolean>>(new Map());
  const isAtTopRef = useRef(false);
  const isAtBottomRef = useRef(false);
  const scrollLockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);

  // Set isClient to true once component mounts
  useEffect(() => {
    setIsClient(true);
    setCurrentViewTitle(format(new Date(), 'MMMM yyyy'));
  }, []);

  // Load tasks and time blocks
  useEffect(() => {
    loadData();

    // Add event listeners for custom drag events
    document.addEventListener('taskDragStart', handleTaskDragStart as EventListener);
    document.addEventListener('taskDragEnd', handleTaskDragEnd as EventListener);

    return () => {
      document.removeEventListener('taskDragStart', handleTaskDragStart as EventListener);
      document.removeEventListener('taskDragEnd', handleTaskDragEnd as EventListener);
    };
  }, []);

  // Initialize months to render
  useEffect(() => {
    if (!isClient) return;

    if (continuousScrollEnabled) {
      const today = new Date();
      const prevPrevMonth = subMonths(today, 2);
      const prevMonth = subMonths(today, 1);
      const nextMonth = addMonths(today, 1);
      const nextNextMonth = addMonths(today, 2);
      setMonthsToRender([prevPrevMonth, prevMonth, today, nextMonth, nextNextMonth]);
    } else {
      setMonthsToRender([currentMonth]);
    }
  }, [continuousScrollEnabled, currentMonth, isClient]);

  // Refresh data periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadData();
    }, 1000); // Check every second for changes

    return () => clearInterval(intervalId);
  }, []);

  // Measure month heights after render
  useEffect(() => {
    if (!isClient || !continuousScrollEnabled || !calendarContentRef.current) return;

    // Wait for the calendar to render
    const timer = setTimeout(() => {
      const monthElements = calendarContentRef.current?.querySelectorAll('.calendar-month');
      if (!monthElements) return;

      // Store the height of each month
      monthElements.forEach((monthElement) => {
        const monthKey = monthElement.getAttribute('data-month');
        if (monthKey) {
          const height = (monthElement as HTMLElement).offsetHeight;
          monthHeightsRef.current.set(monthKey, height);
        }
      });

      // If this is the first render, scroll to the current month
      if (!lastScrollPositionRef.current) {
        const currentMonthElement = Array.from(monthElements).find(el => {
          const monthStr = el.getAttribute('data-month');
          if (!monthStr) return false;
          const monthDate = new Date(monthStr);
          return isSameMonth(monthDate, new Date());
        });

        if (currentMonthElement) {
          // Scroll to the current month with a slight delay to ensure rendering
          setTimeout(() => {
            currentMonthElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            // Update last scroll position after scrolling
            if (calendarContentRef.current) {
              lastScrollPositionRef.current = calendarContentRef.current.scrollTop;
            }
            // Update the visible month title
            updateVisibleMonthTitle();
          }, 50);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [monthsToRender, isClient, continuousScrollEnabled]);

  // Setup continuous scrolling behavior
  useEffect(() => {
    if (!isClient || !continuousScrollEnabled || !calendarContentRef.current) return;

    const calendarContent = calendarContentRef.current;

    const handleScroll = () => {
      // Don't process scroll events during programmatic scrolling or when scroll is locked
      if (isManualScrollingRef.current || scrollLocked) return;

      const { scrollTop, scrollHeight, clientHeight } = calendarContent;

      // Update the current month title based on which month is most visible
      updateVisibleMonthTitle();

      // Store the current scroll position
      lastScrollPositionRef.current = scrollTop;

      // Clear any existing timeout to prevent multiple rapid updates
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Check if we're at the top or bottom
      isAtTopRef.current = scrollTop === 0;
      isAtBottomRef.current = scrollTop + clientHeight >= scrollHeight - 10;

      // If we're near the bottom of the content (within 200px of the bottom)
      if (scrollTop + clientHeight >= scrollHeight - 200 && !isAtBottomRef.current) {
        // Set a flag to indicate we're handling a scroll event
        isScrollingRef.current = true;

        // Add the next month to the list
        scrollTimeoutRef.current = setTimeout(() => {
          setMonthsToRender(prev => {
            const lastMonth = prev[prev.length - 1];
            const nextMonth = addMonths(lastMonth, 1);
            return [...prev, nextMonth];
          });

          // Remove the first month if we have more than 8 months rendered
          // to prevent memory issues with too many months
          if (monthsToRender.length > 8) {
            // Calculate the height of the first month that will be removed
            const firstMonthKey = format(monthsToRender[0], 'yyyy-MM-dd');
            const firstMonthHeight = monthHeightsRef.current.get(firstMonthKey) || 0;

            // Adjust scroll position to account for the removed content
            setTimeout(() => {
              if (calendarContentRef.current) {
                calendarContentRef.current.scrollTop = lastScrollPositionRef.current - firstMonthHeight;
                lastScrollPositionRef.current = calendarContentRef.current.scrollTop;
              }

              setMonthsToRender(prev => prev.slice(1));
              isScrollingRef.current = false;
            }, 50);
          } else {
            isScrollingRef.current = false;
          }
        }, 200);
      }

      // If we're near the top of the content (within 200px of the top) but not at the very top
      if (scrollTop <= 200 && scrollTop > 0 && !isAtTopRef.current) {
        // Set a flag to indicate we're handling a scroll event
        isScrollingRef.current = true;

        scrollTimeoutRef.current = setTimeout(() => {
          // Add the previous month to the beginning of the list
          setMonthsToRender(prev => {
            const firstMonth = prev[0];
            const prevMonth = subMonths(firstMonth, 1);
            return [prevMonth, ...prev];
          });

          // After adding the month, adjust scroll position
          setTimeout(() => {
            // Find the height of the first month that was added
            const monthElements = calendarContentRef.current?.querySelectorAll('.calendar-month');
            if (monthElements && monthElements.length > 0) {
              const firstMonthElement = monthElements[0] as HTMLElement;
              const firstMonthHeight = firstMonthElement.offsetHeight;

              // Store the height for future reference
              const monthKey = firstMonthElement.getAttribute('data-month');
              if (monthKey) {
                monthHeightsRef.current.set(monthKey, firstMonthHeight);
              }

              // Adjust scroll position to maintain the same view
              if (calendarContentRef.current) {
                calendarContentRef.current.scrollTop = lastScrollPositionRef.current + firstMonthHeight;
                lastScrollPositionRef.current = calendarContentRef.current.scrollTop;
              }
            }

            // Remove the last month if we have more than 8 months rendered
            if (monthsToRender.length > 8) {
              setMonthsToRender(prev => prev.slice(0, prev.length - 1));
            }

            isScrollingRef.current = false;
          }, 50);
        }, 200);
      }

      // If we're at the very top, temporarily lock scrolling to prevent bouncing
      if (scrollTop === 0 && !scrollLocked) {
        setScrollLocked(true);

        // Unlock after a short delay
        if (scrollLockTimeoutRef.current) {
          clearTimeout(scrollLockTimeoutRef.current);
        }

        scrollLockTimeoutRef.current = setTimeout(() => {
          setScrollLocked(false);
        }, 500);
      }
    };

    calendarContent.addEventListener('scroll', handleScroll);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (scrollLockTimeoutRef.current) {
        clearTimeout(scrollLockTimeoutRef.current);
      }
      calendarContent.removeEventListener('scroll', handleScroll);
    };
  }, [continuousScrollEnabled, monthsToRender, isClient, scrollLocked]);

  // Update the visible month title based on scroll position
  const updateVisibleMonthTitle = () => {
    if (!calendarContentRef.current) return;

    const calendarContent = calendarContentRef.current;
    const monthElements = calendarContent.querySelectorAll('.calendar-month');

    if (monthElements.length === 0) return;

    // Find which month is most visible in the viewport
    let mostVisibleMonth: Element | null = null;
    let maxVisibleHeight = 0;

    monthElements.forEach(monthElement => {
      const rect = monthElement.getBoundingClientRect();
      const containerRect = calendarContent.getBoundingClientRect();

      // Calculate how much of the month is visible in the viewport
      const visibleTop = Math.max(rect.top, containerRect.top);
      const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      if (visibleHeight > maxVisibleHeight) {
        maxVisibleHeight = visibleHeight;
        mostVisibleMonth = monthElement;
      }
    });

    // Update the current month title
    if (mostVisibleMonth) {
      const monthDateStr = (mostVisibleMonth as Element).getAttribute('data-month');
      if (monthDateStr) {
        const monthDate = new Date(monthDateStr);
        if (!isNaN(monthDate.getTime())) {
          setCurrentViewTitle(format(monthDate, 'MMMM yyyy'));
          setCurrentMonth(monthDate); // Update current month state
        }
      }
    }
  };

  // Load all data
  const loadData = () => {
    setTasks(getTasks());
    setTimeBlocks(getTimeBlocks());
  };

  // Handle task drag start
  const handleTaskDragStart = (e: CustomEvent) => {
    setIsDragging(true);
    document.body.classList.add('dragging-active');

    // Store the task ID from the event
    if (e.detail && e.detail.taskId) {
      setDraggedTaskId(e.detail.taskId);
    }

    // Make calendar cells droppable
    makeCalendarCellsDroppable();
  };

  // Handle task drag end
  const handleTaskDragEnd = () => {
    setIsDragging(false);
    document.body.classList.remove('dragging-active');

    // Remove drop handlers from calendar cells
    cleanupCalendarCellDropHandlers();
  };

  // Make calendar cells droppable
  const makeCalendarCellsDroppable = () => {
    // Target all day cells in the calendar
    const dayCells = document.querySelectorAll('.fc-daygrid-day');

    dayCells.forEach(cell => {
      // Add dragover handler
      const dragoverHandler = (e: Event) => {
        e.preventDefault();
        (cell as HTMLElement).classList.add('fc-day-highlight');
      };

      // Add dragleave handler
      const dragleaveHandler = () => {
        (cell as HTMLElement).classList.remove('fc-day-highlight');
      };

      cell.addEventListener('dragover', dragoverHandler as EventListener);
      cell.addEventListener('dragleave', dragleaveHandler as EventListener);

      // Add drop handler
      cell.addEventListener('drop', handleDayCellDrop as EventListener);

      // Store the handlers on the element for later removal
      (cell as any)._dragoverHandler = dragoverHandler;
      (cell as any)._dragleaveHandler = dragleaveHandler;
    });
  };

  // Clean up drop handlers
  const cleanupCalendarCellDropHandlers = () => {
    const dayCells = document.querySelectorAll('.fc-daygrid-day');

    dayCells.forEach(cell => {
      // Remove handlers using the stored references
      if ((cell as any)._dragoverHandler) {
        cell.removeEventListener('dragover', (cell as any)._dragoverHandler);
      }

      if ((cell as any)._dragleaveHandler) {
        cell.removeEventListener('dragleave', (cell as any)._dragleaveHandler);
      }

      cell.removeEventListener('drop', handleDayCellDrop as EventListener);
      (cell as HTMLElement).classList.remove('fc-day-highlight');
    });
  };

  // Handle drop on a day cell
  const handleDayCellDrop = (e: Event) => {
    e.preventDefault();
    const dragEvent = e as DragEvent;

    // Get the cell element
    const cell = e.currentTarget as HTMLElement;
    cell.classList.remove('fc-day-highlight');

    // Get the date from the cell's data-date attribute
    const dateStr = cell.getAttribute('data-date');
    if (!dateStr) return;

    // Get the task ID from multiple possible sources
    let taskId: string | null = null;

    // First try our component state
    if (draggedTaskId) {
      taskId = draggedTaskId;
    }
    // Then try the global window variable
    else if (typeof window !== 'undefined' && window.draggedTaskId) {
      taskId = window.draggedTaskId;
    }
    // Finally try the dataTransfer
    else if (dragEvent.dataTransfer) {
      // Try to get from text data
      taskId = dragEvent.dataTransfer.getData('text/plain');

      // If not found, try to get from custom format
      if (!taskId) {
        try {
          const taskData = dragEvent.dataTransfer.getData('application/homework-task');
          if (taskData) {
            const parsedData = JSON.parse(taskData);
            taskId = parsedData.id;
          }
        } catch (error) {
          console.error('Error parsing task data:', error);
        }
      }
    }

    if (!taskId) {
      toast({
        title: "Error",
        description: "Could not identify the task being dragged.",
        variant: "destructive",
      });
      return;
    }

    // Find the task - make sure we have the latest tasks data
    const currentTasks = getTasks();
    const task = currentTasks.find(t => t.id === taskId);

    if (!task) {
      toast({
        title: "Error",
        description: `Task not found (ID: ${taskId}).`,
        variant: "destructive",
      });
      return;
    }

    // Open the dialog to allocate time
    setSelectedTask(task);

    // Use the exact date string from the cell without timezone conversion
    // This ensures we use the exact date that was dropped on
    setSelectedDate(new Date(dateStr + 'T12:00:00'));

    setDuration(Math.min(60, task.remainingTime || 60));
    setIsDialogOpen(true);

    // Clear the stored task IDs
    setDraggedTaskId(null);
    if (typeof window !== 'undefined') {
      window.draggedTaskId = null;
    }
  };

  // Convert time blocks to FullCalendar events
  const getEventsForMonth = (month: Date): EventInput[] => {
    return timeBlocks
      .map(block => {
        const task = tasks.find(t => t.id === block.taskId);
        if (!task) return null;

        const blockDate = new Date(block.date);
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        // Only include events for this month
        if (blockDate < monthStart || blockDate > monthEnd) return null;

        const subject = subjects.find(s => s.id === task.subjectId);

        return {
          id: block.id,
          title: task.title,
          start: block.date,
          allDay: true,
          extendedProps: {
            taskId: task.id,
            duration: block.duration,
            subject: subject?.name || '',
            color: subject?.color || '#ccc'
          },
          backgroundColor: subject?.color || '#ccc',
          borderColor: subject?.color || '#ccc',
          textColor: '#fff',
          classNames: ['calendar-event']
        };
      })
      .filter((event): event is EventInput => event !== null);
  };

  // Handle allocating time for a task
  const handleAllocateTime = () => {
    if (!selectedTask) return;

    // Check if there's enough remaining time
    if (duration > selectedTask.remainingTime) {
      toast({
        title: "Too much time",
        description: `You only need ${formatTime(selectedTask.remainingTime)} more for this task.`,
        variant: "destructive",
      });
      return;
    }

    // Format the date with timezone handling to ensure correct date
    // Use the exact date that was selected without timezone adjustments
    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    // Create a new time block with the currently selected date
    const newTimeBlock: TimeBlock = {
      id: generateId(),
      taskId: selectedTask.id,
      date: formattedDate,
      duration: duration,
    };

    saveTimeBlock(newTimeBlock);

    toast({
      title: "Time allocated",
      description: `${formatTime(duration)} scheduled for "${selectedTask.title}" on ${format(selectedDate, "MMM d")}.`,
    });

    // Refresh data immediately
    loadData();
    setIsDialogOpen(false);
  };

  // Handle deleting a time block
  const handleDeleteTimeBlock = (blockId: string) => {
    deleteTimeBlock(blockId);

    toast({
      title: "Time block removed",
      description: "The scheduled time has been removed.",
    });

    // Refresh data immediately
    loadData();
  };

  // Handle event click in calendar
  const handleEventClick = (info: any) => {
    const blockId = info.event.id;

    // Show a confirmation dialog
    if (confirm(`Remove this scheduled time for "${info.event.title}"?`)) {
      handleDeleteTimeBlock(blockId);
    }
  };

  // Handle view type change
  const handleViewChange = (value: string) => {
    if (value === 'month' || value === 'week') {
      setViewType(value === 'month' ? 'dayGridMonth' : 'timeGridWeek');

      if (value === 'week' && continuousScrollEnabled) {
        // Disable continuous scrolling for week view
        setContinuousScrollEnabled(false);
      }

      if (!continuousScrollEnabled) {
        // If we're using the standard calendar view
        if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          calendarApi.changeView(value === 'month' ? 'dayGridMonth' : 'timeGridWeek');
        }
      }
    }
  };

  // Handle date click in calendar
  const handleDateClick = (info: any) => {
    // If there are incomplete tasks, show the task selection dialog
    const incompleteTasks = tasks.filter(task => !task.isComplete);
    if (incompleteTasks.length > 0) {
      // Use the exact date without timezone conversion
      setSelectedDate(new Date(info.dateStr + 'T12:00:00'));
      // Set the first incomplete task as default
      setSelectedTask(incompleteTasks[0]);
      setDuration(Math.min(60, incompleteTasks[0].remainingTime || 60));
      setIsDialogOpen(true);
    } else {
      toast({
        title: "No tasks available",
        description: "You don't have any incomplete tasks to schedule.",
      });
    }
  };

  // Handle month navigation
  const handlePrevMonth = () => {
    if (continuousScrollEnabled && calendarContentRef.current) {
      // Set flag to indicate manual scrolling
      isManualScrollingRef.current = true;

      // Find the previous month element
      const currentMonthIndex = monthsToRender.findIndex(month =>
        isSameMonth(month, currentMonth)
      );

      if (currentMonthIndex > 0) {
        // If we already have the previous month rendered, scroll to it
        const monthElements = calendarContentRef.current.querySelectorAll('.calendar-month');
        if (monthElements && monthElements.length > currentMonthIndex - 1) {
          const prevMonthElement = monthElements[currentMonthIndex - 1];
          if (prevMonthElement) {
            prevMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Update the title immediately for better UX
            const monthDateStr = prevMonthElement.getAttribute('data-month') || '';
            if (monthDateStr) {
              const monthDate = new Date(monthDateStr);
              if (!isNaN(monthDate.getTime())) {
                setCurrentViewTitle(format(monthDate, 'MMMM yyyy'));
                setCurrentMonth(monthDate);
              }
            }
          }
        }
      } else {
        // Add previous month if needed
        const prevMonth = subMonths(monthsToRender[0], 1);
        setMonthsToRender(prev => [prevMonth, ...prev]);

        // Update the title immediately for better UX
        setCurrentViewTitle(format(prevMonth, 'MMMM yyyy'));
        setCurrentMonth(prevMonth);

        // Wait for render then scroll
        setTimeout(() => {
          const firstMonthElement = calendarContentRef.current?.querySelector('.calendar-month');
          if (firstMonthElement) {
            firstMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 50);
      }

      // Reset flag after animation completes
      setTimeout(() => {
        isManualScrollingRef.current = false;
      }, 500);
    } else if (calendarRef.current) {
      // In standard mode, use FullCalendar navigation
      const calendarApi = calendarRef.current.getApi();
      calendarApi.prev();
      setCurrentMonth(subMonths(currentMonth, 1));
      setCurrentViewTitle(format(subMonths(currentMonth, 1), 'MMMM yyyy'));
    }
  };

  const handleNextMonth = () => {
    if (continuousScrollEnabled && calendarContentRef.current) {
      // Set flag to indicate manual scrolling
      isManualScrollingRef.current = true;

      // Find the next month element
      const currentMonthIndex = monthsToRender.findIndex(month =>
        isSameMonth(month, currentMonth)
      );

      if (currentMonthIndex < monthsToRender.length - 1) {
        // If we already have the next month rendered, scroll to it
        const monthElements = calendarContentRef.current.querySelectorAll('.calendar-month');
        if (monthElements && monthElements.length > currentMonthIndex + 1) {
          const nextMonthElement = monthElements[currentMonthIndex + 1];
          if (nextMonthElement) {
            nextMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Update the title immediately for better UX
            const monthDateStr = nextMonthElement.getAttribute('data-month') || '';
            if (monthDateStr) {
              const monthDate = new Date(monthDateStr);
              if (!isNaN(monthDate.getTime())) {
                setCurrentViewTitle(format(monthDate, 'MMMM yyyy'));
                setCurrentMonth(monthDate);
              }
            }
          }
        }
      } else {
        // Add next month if needed
        const nextMonth = addMonths(monthsToRender[monthsToRender.length - 1], 1);
        setMonthsToRender(prev => [...prev, nextMonth]);

        // Update the title immediately for better UX
        setCurrentViewTitle(format(nextMonth, 'MMMM yyyy'));
        setCurrentMonth(nextMonth);

        // Wait for render then scroll
        setTimeout(() => {
          const monthElements = calendarContentRef.current?.querySelectorAll('.calendar-month');
          if (monthElements && monthElements.length > 0) {
            const lastMonthElement = monthElements[monthElements.length - 1];
            lastMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 50);
      }

      // Reset flag after animation completes
      setTimeout(() => {
        isManualScrollingRef.current = false;
      }, 500);
    } else if (calendarRef.current) {
      // In standard mode, use FullCalendar navigation
      const calendarApi = calendarRef.current.getApi();
      calendarApi.next();
      setCurrentMonth(addMonths(currentMonth, 1));
      setCurrentViewTitle(format(addMonths(currentMonth, 1), 'MMMM yyyy'));
    }
  };

  // Handle dates set in calendar
  const handleDatesSet = (dateInfo: any) => {
    // Get the current view's start date
    const viewStart = new Date(dateInfo.start);

    // Store the current month
    if (viewType === 'dayGridMonth') {
      setCurrentMonth(new Date(viewStart));
      setCurrentViewTitle(format(viewStart, 'MMMM yyyy'));
    }
  };

  // Scroll to top of calendar
  const scrollToTop = () => {
    if (calendarContentRef.current && continuousScrollEnabled) {
      isManualScrollingRef.current = true;
      setScrollLocked(true);

      // Scroll to the first month
      const firstMonthElement = calendarContentRef.current.querySelector('.calendar-month');
      if (firstMonthElement) {
        firstMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Update the title immediately for better UX
        const monthDateStr = firstMonthElement.getAttribute('data-month') || '';
        if (monthDateStr) {
          const monthDate = new Date(monthDateStr);
          if (!isNaN(monthDate.getTime())) {
            setCurrentViewTitle(format(monthDate, 'MMMM yyyy'));
            setCurrentMonth(monthDate);
          }
        }
      }

      // Reset flags after animation completes
      setTimeout(() => {
        isManualScrollingRef.current = false;
        setScrollLocked(false);
      }, 500);
    }
  };

  // Toggle continuous scrolling
  const toggleContinuousScroll = () => {
    const newValue = !continuousScrollEnabled;
    setContinuousScrollEnabled(newValue);

    // Reset to single month view when disabling continuous scroll
    if (!newValue) {
      setMonthsToRender([currentMonth]);
    } else {
      // Initialize with 5 months when enabling
      const prevPrevMonth = subMonths(currentMonth, 2);
      const prevMonth = subMonths(currentMonth, 1);
      const nextMonth = addMonths(currentMonth, 1);
      const nextNextMonth = addMonths(currentMonth, 2);
      setMonthsToRender([prevPrevMonth, prevMonth, currentMonth, nextMonth, nextNextMonth]);

      // Reset scroll position tracking
      lastScrollPositionRef.current = 0;
      monthHeightsRef.current.clear();
    }

    toast({
      title: continuousScrollEnabled ? "Continuous scroll disabled" : "Continuous scroll enabled",
      description: continuousScrollEnabled
        ? "Using standard calendar navigation."
        : "Calendar will continuously load months as you scroll.",
    });
  };

  // Render event content
  const renderEventContent = (eventInfo: any) => {
    const { extendedProps } = eventInfo.event;

    return (
      <div className="p-1 overflow-hidden text-xs">
        <div className="font-semibold truncate">{eventInfo.event.title}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="time-indicator">
            {formatTime(extendedProps.duration)}
          </span>
        </div>
      </div>
    );
  };

  // Render a single month calendar
  const renderMonthCalendar = (month: Date, index: number) => {
    const monthStr = format(month, 'yyyy-MM');
    const events = getEventsForMonth(month);

    // Use a string format for the data-month attribute to avoid hydration issues
    const monthFormatted = format(month, 'yyyy-MM-dd');

    return (
      <div
        key={`${monthStr}-${index}`}
        className="calendar-month mb-8 pb-4"
        data-month={monthFormatted}
      >
        <div className="mb-4 text-sm font-medium text-muted-foreground calendar-month-title">
          {format(month, 'MMMM yyyy')}
        </div>
        <div className="calendar-month-content">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialDate={month}
            initialView="dayGridMonth"
            headerToolbar={false}
            events={events}
            eventContent={renderEventContent}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            droppable={true}
            editable={false}
            height="auto"
            dayMaxEvents={3}
            dragRevertDuration={0}
            showNonCurrentDates={false}
          />
        </div>
      </div>
    );
  };

  // If not client-side yet, render a loading state or minimal UI to prevent hydration issues
  if (!isClient) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-background pb-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <h3 className="font-medium">Study Schedule</h3>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Loading...
            </Button>

            <div className="calendar-toggle-group">
              <ToggleGroup type="single" value="month">
                <ToggleGroupItem value="week" aria-label="Week view">Week</ToggleGroupItem>
                <ToggleGroupItem value="month" aria-label="Month view">Month</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>

        <div className="calendar-header bg-background pb-2 flex items-center justify-between">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">Loading...</h2>
          <Button variant="ghost" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="border rounded-lg bg-white dark:bg-card overflow-hidden calendar-container" style={{ height: '600px' }}>
          <div className="flex items-center justify-center h-full">
            <p>Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-background pb-2 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          <h3 className="font-medium">Study Schedule</h3>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleContinuousScroll}
            className={continuousScrollEnabled ? "bg-primary/10" : ""}
          >
            {continuousScrollEnabled ? "Continuous scroll: On" : "Continuous scroll: Off"}
          </Button>

          <div className="calendar-toggle-group">
            <ToggleGroup type="single" value={viewType === 'dayGridMonth' ? 'month' : 'week'} onValueChange={handleViewChange}>
              <ToggleGroupItem value="week" aria-label="Week view">Week</ToggleGroupItem>
              <ToggleGroupItem value="month" aria-label="Month view">Month</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      <div
        ref={headerRef}
        className="calendar-header bg-background pb-2 flex items-center justify-between sticky top-12 z-10"
      >
        <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{currentViewTitle}</h2>
        <Button variant="ghost" size="sm" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={calendarWrapperRef}
        className="border rounded-lg bg-white dark:bg-card overflow-hidden calendar-container"
      >
        {continuousScrollEnabled ? (
          <div
            ref={calendarContentRef}
            className="calendar-content overflow-auto"
            style={{ height: '600px' }}
          >
            {monthsToRender.map((month, index) => renderMonthCalendar(month, index))}
          </div>
        ) : (
          <div style={{ height: '600px' }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={viewType}
              headerToolbar={false}
              events={getEventsForMonth(currentMonth)}
              eventContent={renderEventContent}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              droppable={true}
              editable={false}
              height="100%"
              dayMaxEvents={3}
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }}
              dragRevertDuration={0}
              datesSet={handleDatesSet}
              showNonCurrentDates={false}
            />
          </div>
        )}
      </div>

      {/* Time allocation dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Time for {selectedTask?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="duration">Time to allocate (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={selectedTask?.remainingTime || 1}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Remaining time needed: {selectedTask ? formatTime(selectedTask.remainingTime) : ""}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Date: {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAllocateTime}>
              Schedule Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}