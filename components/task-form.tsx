"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { generateId, getSubjects, saveTask } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subjectId: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  totalTimeEstimate: z.coerce.number().min(1, "Time estimate must be at least 1 minute"),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  onSuccess: () => void;
}

export function TaskForm({ onSuccess }: TaskFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const subjects = getSubjects();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      subjectId: "",
      description: "",
      dueDate: format(new Date(), "yyyy-MM-dd"),
      totalTimeEstimate: 60, // Default to 1 hour (60 minutes)
    },
  });

  const onSubmit = (data: TaskFormValues) => {
    setIsSubmitting(true);
    
    const newTask = {
      id: generateId(),
      title: data.title,
      subjectId: data.subjectId,
      description: data.description || "",
      dueDate: data.dueDate,
      totalTimeEstimate: data.totalTimeEstimate,
      remainingTime: data.totalTimeEstimate,
      isComplete: false,
    };
    
    saveTask(newTask);
    
    toast({
      title: "Task created",
      description: "Your homework task has been added.",
    });
    
    form.reset();
    setIsSubmitting(false);
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Study for Geo Exam" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="subjectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem 
                      key={subject.id} 
                      value={subject.id}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: subject.color }}
                        />
                        {subject.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Chapters 5-7, focus on climate zones" 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="totalTimeEstimate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time Estimate (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Add Homework Task
        </Button>
      </form>
    </Form>
  );
}