"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";

import type { TaskRecord } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/format";
import { cn } from "@/utils/cn";

type StatusColumn = "todo" | "in_progress" | "done";

type KanbanBoardProps = {
  tasks: TaskRecord[];
  onStatusChange: (taskId: string, status: StatusColumn) => void;
  onTaskClick: (task: TaskRecord) => void;
  onAddTask: (status: StatusColumn) => void;
};

const columns: Array<{ key: StatusColumn; label: string }> = [
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" }
];

function getInitials(name: string | null, email: string | null) {
  const value = name ?? email ?? "User";
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function priorityBorder(priority: string | null) {
  if (priority === "high") {
    return "border-l-red-400";
  }

  if (priority === "medium") {
    return "border-l-amber-400";
  }

  return "border-l-slate-500";
}

export function KanbanBoard({ tasks, onStatusChange, onTaskClick, onAddTask }: KanbanBoardProps) {
  const grouped = columns.reduce<Record<StatusColumn, TaskRecord[]>>(
    (acc, column) => ({
      ...acc,
      [column.key]: tasks.filter((task) => (task.status ?? "todo") === column.key)
    }),
    {
      todo: [],
      in_progress: [],
      done: []
    }
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const destination = result.destination.droppableId as StatusColumn;
    const source = result.source.droppableId as StatusColumn;

    if (destination === source && result.destination.index === result.source.index) {
      return;
    }

    onStatusChange(result.draggableId, destination);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((column) => (
          <div key={column.key} className="flex min-h-[560px] flex-col rounded-2xl border border-border bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">{column.label}</h3>
                <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-foreground">{grouped[column.key].length}</span>
              </div>
            </div>
            <Droppable droppableId={column.key}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-1 flex-col gap-3 p-4">
                  {grouped[column.key].map((task, index) => {
                    const isOverdue = Boolean(task.due_date && new Date(task.due_date) < new Date() && task.status !== "done");

                    return (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(dragProvided, snapshot) => (
                          <button
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            type="button"
                            onClick={() => onTaskClick(task)}
                            className={cn(
                              "rounded-2xl border border-border border-l-4 bg-[var(--surface-2)] p-4 text-left transition-shadow",
                              priorityBorder(task.priority),
                              snapshot.isDragging && "shadow-xl shadow-black/20"
                            )}
                          >
                            <p className="text-sm font-medium text-foreground">{task.title}</p>
                            <div className="mt-3 flex items-center justify-between gap-4">
                              <p className={cn("text-xs text-[var(--text-secondary)]", isOverdue && "text-red-400")}>
                                {task.due_date ? `Due ${formatDate(task.due_date)}` : "No due date"}
                              </p>
                              {task.assignee ? (
                                <Avatar className="h-[18px] w-[18px]" title={task.assignee.full_name ?? task.assignee.email ?? "Assignee"}>
                                  <AvatarImage src={task.assignee.avatar_url ?? undefined} alt={task.assignee.full_name ?? task.assignee.email ?? "Assignee"} />
                                  <AvatarFallback className="text-[9px]">{getInitials(task.assignee.full_name ?? null, task.assignee.email ?? null)}</AvatarFallback>
                                </Avatar>
                              ) : null}
                            </div>
                          </button>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <div className="p-4 pt-0">
              <Button variant="ghost" className="w-full justify-start text-[var(--text-secondary)] hover:text-foreground" onClick={() => onAddTask(column.key)}>
                <Plus className="h-4 w-4" />
                Add task
              </Button>
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
