"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from "@tanstack/react-table";

import type { MembershipRow, TaskRecord, UserRow } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/utils/format";
import { cn } from "@/utils/cn";

type MemberOption = MembershipRow & { user: UserRow | null };

type TaskTableProps = {
  tasks: TaskRecord[];
  members: MemberOption[];
  onTaskClick: (task: TaskRecord) => void;
  myTasksOnly?: boolean;
  currentUserId?: string;
};

function getInitials(name: string | null, email: string | null) {
  const value = name ?? email ?? "User";
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function priorityColor(priority: string | null) {
  if (priority === "high") {
    return "bg-red-400";
  }

  if (priority === "medium") {
    return "bg-amber-400";
  }

  return "bg-slate-400";
}

export function TaskTable({ tasks, members, onTaskClick, myTasksOnly = false, currentUserId }: TaskTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    return tasks.filter((task) => {
      if (myTasksOnly && currentUserId && task.assigned_to !== currentUserId) {
        return false;
      }

      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      if (assigneeFilter !== "all" && task.assigned_to !== assigneeFilter) {
        return false;
      }

      if (search) {
        const value = `${task.title} ${task.description ?? ""}`.toLowerCase();
        if (!value.includes(search.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [assigneeFilter, currentUserId, myTasksOnly, priorityFilter, search, statusFilter, tasks]);

  const columns = useMemo<ColumnDef<TaskRecord>[]>(
    () => [
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <span className={cn("inline-flex h-2.5 w-2.5 rounded-full", priorityColor(row.original.priority))} />
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <button className="text-left text-sm font-medium text-foreground hover:text-primary">{row.original.title}</button>
      },
      {
        accessorKey: "assigned_to",
        header: "Assigned to",
        cell: ({ row }) =>
          row.original.assignee ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={row.original.assignee.avatar_url ?? undefined} alt={row.original.assignee.full_name ?? row.original.assignee.email ?? "Assignee"} />
                <AvatarFallback>{getInitials(row.original.assignee.full_name ?? null, row.original.assignee.email ?? null)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground">{row.original.assignee.full_name ?? row.original.assignee.email}</span>
            </div>
          ) : (
            <span className="text-sm text-[var(--text-secondary)]">Unassigned</span>
          )
      },
      {
        accessorKey: "due_date",
        header: "Due date",
        cell: ({ row }) => <span className="text-sm text-[var(--text-secondary)]">{row.original.due_date ? formatDate(row.original.due_date) : "No due date"}</span>
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--text-secondary)]">
            {(row.original.status ?? "todo").replace("_", " ")}
          </span>
        )
      },
      {
        accessorKey: "created_at",
        header: "Created at",
        cell: ({ row }) => <span className="text-sm text-[var(--text-secondary)]">{row.original.created_at ? formatDate(row.original.created_at) : "Unknown"}</span>
      }
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="flex h-10 rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
          <option value="all">All statuses</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="flex h-10 rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="flex h-10 rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
          <option value="all">All assignees</option>
          {members.map((member) => (
            <option key={member.id} value={member.user_id}>
              {member.user?.full_name ?? member.user?.email ?? "Unknown member"}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full border-collapse">
          <thead className="bg-[var(--surface-2)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-border transition-colors hover:bg-[var(--surface-2)]" onClick={() => onTaskClick(row.original)}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!table.getRowModel().rows.length ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
                  No tasks match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
