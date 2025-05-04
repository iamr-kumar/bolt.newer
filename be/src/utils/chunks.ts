export const chunks = [
  "Certainly! I'll create a basic todo app using React with the existing project setup. We'll use React hooks for state management and Tailwind CSS for styling. Here's the implementation:\n\n",
  '<boltArtifact id="react-todo-app" title="Basic Todo App using React">\n',
  '<boltAction type="file" filePath="src/App.tsx">\n',
  `import React, { useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import TodoList from './components/TodoList';
import TodoForm from './components/TodoForm';
import { Todo } from './types';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: Date.now(),
      text,
      completed: false,
    };
    setTodos([...todos, newTodo]);
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Todo App</h1>
        <TodoForm addTodo={addTodo} />
        <TodoList todos={todos} toggleTodo={toggleTodo} deleteTodo={deleteTodo} />
      </div>
    </div>
  );
}

export default App;\n`,
  "</boltAction>\n",
  '<boltAction type="file" filePath="src/components/TodoList.tsx">\n',
  `import React from 'react';
import { Trash2 } from 'lucide-react';
import { Todo } from '../types';

interface TodoListProps {
  todos: Todo[];
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, toggleTodo, deleteTodo }) => {
  return (
    <ul className="mt-4 space-y-2">
      {todos.map((todo) => (
        <li
          key={todo.id}
          className="flex items-center bg-gray-100 p-3 rounded-md transition-all hover:shadow-md"
        >
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
            className="mr-3 form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
          />
          <span
            className={\`flex-grow \${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}\`}
          >
            {todo.text}
          </span>
          <button
            onClick={() => deleteTodo(todo.id)}
            className="text-red-500 hover:text-red-700 transition-colors duration-200"
          >
            <Trash2 size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
};

export default TodoList;\n`,
  "</boltAction>\n",
  '<boltAction type="file" filePath="src/components/TodoForm.tsx">\n',
  `import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';

interface TodoFormProps {
  addTodo: (text: string) => void;
}

const TodoForm: React.FC<TodoFormProps> = ({ addTodo }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      addTodo(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new todo..."
        className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        type="submit"
        className="bg-blue-500 text-white p-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <PlusCircle size={24} />
      </button>
    </form>
  );
};

export default TodoForm;\n`,
  "</boltAction>\n",
  '<boltAction type="file" filePath="src/types.ts">\n',
  `export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}\n`,
  "</boltAction>\n",
  '<boltAction type="shell">\n',
  "npm run dev\n",
  "</boltAction>\n",
  "</boltArtifact>\n",
];
