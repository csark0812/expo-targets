import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import * as Linking from 'expo-linking';
import {
  taskWidget,
  addTask,
  getTasks,
  completeTask,
} from './targets/task-widget';
import { quickTaskClip } from './targets/quick-task-clip';
import type { Task } from './targets/utils';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [clipLaunched, setClipLaunched] = useState(false);

  useEffect(() => {
    loadTasks();

    // Check if launched from App Clip
    Linking.getInitialURL().then((url: string | null) => {
      if (url?.includes('clip')) {
        setClipLaunched(true);
      }
    });
  }, []);

  const loadTasks = async () => {
    const loadedTasks = await getTasks();
    setTasks(loadedTasks);
  };

  const handleAddTask = async () => {
    if (newTaskText.trim()) {
      await addTask(newTaskText.trim());
      setNewTaskText('');
      await loadTasks();

      // Refresh both widget and clip
      await taskWidget.refresh();
      await quickTaskClip.refresh();
    }
  };

  const handleToggleTask = async (id: string) => {
    await completeTask(id);
    await loadTasks();

    // Refresh targets
    await taskWidget.refresh();
    await quickTaskClip.refresh();
  };

  const openClip = () => {
    // This would open the App Clip
    Linking.openURL('https://multitarget.example.com/quick-task');
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>✅ Task Manager</Text>
        <Text style={styles.subtitle}>Widget + App Clip Demo</Text>

        {clipLaunched && (
          <View style={styles.clipBanner}>
            <Text style={styles.clipBannerText}>
              🎯 Launched from App Clip! Install the full app for more features.
            </Text>
          </View>
        )}

        {/* Add Task */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add New Task</Text>
          <View style={styles.addTaskContainer}>
            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              value={newTaskText}
              onChangeText={setNewTaskText}
              onSubmitEditing={handleAddTask}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddTask}
              disabled={!newTaskText.trim()}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Tasks */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Active Tasks ({activeTasks.length})
          </Text>
          {activeTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyText}>All done!</Text>
            </View>
          ) : (
            <View>
              {activeTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskItem}
                  onPress={() => handleToggleTask(task.id)}
                >
                  <View style={styles.checkbox}>
                    <Text style={styles.checkboxEmpty}>○</Text>
                  </View>
                  <Text style={styles.taskText}>{task.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Completed ({completedTasks.length})
            </Text>
            {completedTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskItem}
                onPress={() => handleToggleTask(task.id)}
              >
                <View style={styles.checkbox}>
                  <Text style={styles.checkboxChecked}>✓</Text>
                </View>
                <Text style={[styles.taskText, styles.taskTextCompleted]}>
                  {task.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Target Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Multiple Targets</Text>

          <View style={styles.targetItem}>
            <Text style={styles.targetEmoji}>📱</Text>
            <View style={styles.targetInfo}>
              <Text style={styles.targetName}>Task Widget</Text>
              <Text style={styles.targetDesc}>
                Shows your active tasks on home screen
              </Text>
            </View>
          </View>

          <View style={styles.targetItem}>
            <Text style={styles.targetEmoji}>🎯</Text>
            <View style={styles.targetInfo}>
              <Text style={styles.targetName}>Quick Task Clip</Text>
              <Text style={styles.targetDesc}>
                Lightweight task creation via NFC/QR
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.clipButton} onPress={openClip}>
            <Text style={styles.clipButtonText}>Launch App Clip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <Text style={styles.infoText}>
            Both targets share the same data through App Groups. Add a task
            anywhere and see it everywhere!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  clipBanner: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  clipBannerText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  addTaskContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: {
    fontSize: 20,
    color: '#666',
  },
  checkboxChecked: {
    fontSize: 20,
    color: '#34C759',
    fontWeight: 'bold',
  },
  taskText: {
    fontSize: 16,
    flex: 1,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  targetEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  targetInfo: {
    flex: 1,
  },
  targetName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  targetDesc: {
    fontSize: 13,
    color: '#666',
  },
  clipButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  clipButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});
