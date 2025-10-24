export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface TasksData {
  tasks: Task[];
}
