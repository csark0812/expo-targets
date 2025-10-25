import { createTarget } from 'expo-targets';
import type { Task, TasksData } from '../utils';

export const taskWidget = createTarget('TaskWidget');

// Add task
export const addTask = async (text: string): Promise<Task> => {
  const task: Task = {
    id: Date.now().toString(),
    text,
    completed: false,
    createdAt: Date.now(),
  };

  const data = await taskWidget.getData<TasksData>();
  const tasks = data?.tasks || [];
  tasks.unshift(task);

  await taskWidget.setData<TasksData>({ tasks });

  return task;
};

// Get all tasks
export const getTasks = async (): Promise<Task[]> => {
  const data = await taskWidget.getData<TasksData>();
  return data?.tasks || [];
};

// Toggle task completion
export const completeTask = async (id: string): Promise<void> => {
  const data = await taskWidget.getData<TasksData>();
  const tasks = data?.tasks || [];
  const task = tasks.find((t) => t.id === id);

  if (task) {
    task.completed = !task.completed;
    await taskWidget.setData<TasksData>({ tasks });
  }
};

// Clear completed tasks
export const clearCompleted = async (): Promise<void> => {
  const data = await taskWidget.getData<TasksData>();
  const tasks = data?.tasks || [];
  const activeTasks = tasks.filter((t) => !t.completed);
  await taskWidget.setData<TasksData>({ tasks: activeTasks });
};
