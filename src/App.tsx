import React, { useState, useEffect } from "react";
import "./App.css";
import { API, Storage } from "aws-amplify";
import { withAuthenticator, AmplifySignOut } from "@aws-amplify/ui-react";
import { listTodos } from "./graphql/queries";
import {
  createTodo as createTodoMutation,
  deleteTodo as deleteTodoMutation,
} from "./graphql/mutations";

const initialFormState = { name: "", description: "" };

interface ITodo {
  id?: string;
  name: string;
  description: string;
  image?: string;
}

function App() {
  const [todos, setTodos] = useState<ITodo[]>([]);
  const [formData, setFormData] = useState<ITodo>(initialFormState);

  useEffect(() => {
    fetchTodos();
  }, []);

  async function fetchTodos() {
    const apiData = await API.graphql({ query: listTodos });
    // @ts-ignore
    const todosFromAPI = apiData.data.listTodos.items;
    await Promise.all(
      todosFromAPI.map(async (todo: ITodo) => {
        if (todo.image && typeof todo.image === "string") {
          const image = (await Storage.get(todo.image)) as string;
          todo.image = image;
        }
        return todo;
      })
    );
    // @ts-ignore
    setTodos(apiData.data.listTodos.items);
  }

  async function createTodo() {
    if (!formData.name || !formData.description) return;
    await API.graphql({
      query: createTodoMutation,
      variables: { input: formData },
    });
    if (formData.image) {
      const image = (await Storage.get(formData.image)) as string;
      formData.image = image;
    }
    setTodos([...todos, formData]);
    setFormData(initialFormState);
  }

  async function deleteTodo({ id }: ITodo) {
    const newtodosArray = todos.filter((note) => note.id !== id);
    setTodos(newtodosArray);
    await API.graphql({
      query: deleteTodoMutation,
      variables: { input: { id } },
    });
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchTodos();
  }

  return (
    <div className="App">
      <h1>My todos App</h1>
      <input
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Todo name"
        value={formData.name}
      />
      <input
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="Todo description"
        value={formData.description}
      />
      <input type="file" onChange={onChange} />
      <button onClick={createTodo}>Create todo</button>
      <div style={{ marginBottom: 30 }}>
        {todos.map((todo) => (
          <div key={todo.id || todo.name}>
            <h2>{todo.name}</h2>
            <p>{todo.description}</p>
            <button onClick={() => deleteTodo(todo)}>Delete todo</button>
            {todo.image && (
              <img
                src={todo.image}
                style={{ width: 400 }}
                alt={todo.description}
              />
            )}
          </div>
        ))}
      </div>
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);
