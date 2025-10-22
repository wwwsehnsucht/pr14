const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = 3000;

const USERS_FILE = path.join(__dirname, "users.json");
const TAGS_FILE = path.join(__dirname, "tags.json");
const TASKS_FILE = path.join(__dirname, "tasks.json");

app.use(express.json());

const readFromFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const writeToFile = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

app.get("/users", async (req, res) => {
  const users = await readFromFile(USERS_FILE);
  res.json(users);
});

app.get("/users/:id", async (req, res) => {
  const users = await readFromFile(USERS_FILE);
  const user = users.find((u) => u.id === +req.params.id);
  if (!user) return res.status(404).json({ error: "юзер не найден" });
  res.json(user);
});

app.post("/users", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "имя is mandatory" });

  const users = await readFromFile(USERS_FILE);
  const newUser = { id: users.length + 1, name };
  users.push(newUser);
  await writeToFile(USERS_FILE, users);
  res.status(201).json(newUser);
});

app.put("/users/:id", async (req, res) => {
  const users = await readFromFile(USERS_FILE);
  const user = users.find((u) => u.id === +req.params.id);
  if (!user) return res.status(404).json({ error: "не найден" });

  if (req.body.name) user.name = req.body.name;
  await writeToFile(USERS_FILE, users);
  res.json(user);
});

app.delete("/users/:id", async (req, res) => {
  const id = +req.params.id;
  const users = await readFromFile(USERS_FILE);
  const tasks = await readFromFile(TASKS_FILE);
  const hasTasks = tasks.some((t) => t.id_user === id);
  if (hasTasks) return res.status(400).json({ error: "удалите юзера сначала" });

  const newUsers = users.filter((u) => u.id !== id);
  await writeToFile(USERS_FILE, newUsers);
  res.json({ message: "Пользователь удалён" });
});

app.get("/tags", async (req, res) => {
  const tags = await readFromFile(TAGS_FILE);
  res.json(tags);
});

app.post("/tags", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "название is mandtaroy" });

  const tags = await readFromFile(TAGS_FILE);
  const newTag = { id: tags.length + 1, name };
  tags.push(newTag);
  await writeToFile(TAGS_FILE, tags);
  res.status(201).json(newTag);
});

app.put("/tags/:id", async (req, res) => {
  const tags = await readFromFile(TAGS_FILE);
  const tag = tags.find((t) => t.id === +req.params.id);
  if (!tag) return res.status(404).json({ error: "тег нот фаунд" });
  if (req.body.name) tag.name = req.body.name;
  await writeToFile(TAGS_FILE, tags);
  res.json(tag);
});

app.delete("/tags/:id", async (req, res) => {
  const tags = await readFromFile(TAGS_FILE);
  const newTags = tags.filter((t) => t.id !== +req.params.id);
  await writeToFile(TAGS_FILE, newTags);
  res.json({ message: "Тег удалён" });
});

app.get("/tasks", async (req, res) => {
  const [tasks, users, tags] = await Promise.all([
    readFromFile(TASKS_FILE),
    readFromFile(USERS_FILE),
    readFromFile(TAGS_FILE),
  ]);
  const fullTasks = tasks.map((t) => ({
    ...t,
    user_name: users.find((u) => u.id === t.id_user)?.name || "неизвестный",
    tag_name: tags.find((tag) => tag.id === t.id_tag)?.name || "ноу тег йоу",
  }));
  res.json(fullTasks);
});

app.post("/tasks", async (req, res) => {
  const { title, id_user, id_tag } = req.body;
  if (!title || !id_user)
    return res.status(400).json({ error: "нужно название и id_user" });

  const users = await readFromFile(USERS_FILE);
  if (!users.some((u) => u.id === id_user))
    return res.status(400).json({ error: "юзер нот фаунд" });

  const tasks = await readFromFile(TASKS_FILE);
  const newTask = {
    id: tasks.length + 1,
    title,
    id_user,
    id_tag: id_tag || null,
    completed: false,
  };
  tasks.push(newTask);
  await writeToFile(TASKS_FILE, tasks);
  res.status(201).json(newTask);
});

app.put("/tasks/:id", async (req, res) => {
  const tasks = await readFromFile(TASKS_FILE);
  const task = tasks.find((t) => t.id === +req.params.id);
  if (!task) return res.status(404).json({ error: "нот фаунд" });

  const { title, id_user, id_tag, completed } = req.body;
  if (title !== undefined) task.title = title;
  if (id_user !== undefined) task.id_user = id_user;
  if (id_tag !== undefined) task.id_tag = id_tag;
  if (completed !== undefined) task.completed = completed;

  await writeToFile(TASKS_FILE, tasks);
  res.json(task);
});

app.delete("/tasks/:id", async (req, res) => {
  const tasks = await readFromFile(TASKS_FILE);
  const newTasks = tasks.filter((t) => t.id !== +req.params.id);
  await writeToFile(TASKS_FILE, newTasks);
  res.json({ message: "задача удалена" });
});

app.get("/users/:id/tasks", async (req, res) => {
  const id = +req.params.id;
  const [tasks, users, tags] = await Promise.all([
    readFromFile(TASKS_FILE),
    readFromFile(USERS_FILE),
    readFromFile(TAGS_FILE),
  ]);
  const userTasks = tasks
    .filter((t) => t.id_user === id)
    .map((t) => ({
      ...t,
      user_name: users.find((u) => u.id === t.id_user)?.name || "неизвестный",
      tag_name: tags.find((tag) => tag.id === t.id_tag)?.name || "без тега",
    }));
  res.json(userTasks);
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
