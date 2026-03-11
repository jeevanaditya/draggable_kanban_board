const dotenv = require('dotenv')
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

let dbReady = false
let memoryTasks = []

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'done'],
      default: 'todo',
    },
  },
  { timestamps: true }
)

const Task = mongoose.model('Task', taskSchema)

app.get('/api/tasks', async (req, res) => {
  if (!dbReady) {
    return res.json(memoryTasks)
  }
  try {
    const tasks = await Task.find().sort({ createdAt: 1 })
    res.json(tasks)
  } catch (error) {
    console.error('Load tasks error', error)
    res.json(memoryTasks)
  }
})

app.post('/api/tasks', async (req, res) => {
  const { title, description } = req.body
  if (!title) {
    return res.status(400).json({ message: 'Title is required' })
  }

  if (!dbReady) {
    const now = new Date()
    const task = {
      _id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
      title,
      description: description || '',
      status: 'todo',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    memoryTasks.push(task)
    return res.status(201).json(task)
  }

  try {
    const task = await Task.create({ title, description })
    res.status(201).json(task)
  } catch (error) {
    console.error('Create task error', error)
    const now = new Date()
    const task = {
      _id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
      title,
      description: description || '',
      status: 'todo',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    memoryTasks.push(task)
    res.status(201).json(task)
  }
})

app.patch('/api/tasks/:id/status', async (req, res) => {
  const { status } = req.body
  const { id } = req.params
  if (!['todo', 'in-progress', 'done'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }

  if (!dbReady) {
    const index = memoryTasks.findIndex(task => task._id === id)
    if (index === -1) {
      return res.status(404).json({ message: 'Task not found' })
    }
    const updated = {
      ...memoryTasks[index],
      status,
      updatedAt: new Date().toISOString(),
    }
    memoryTasks[index] = updated
    return res.json(updated)
  }

  try {
    const task = await Task.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }
    res.json(task)
  } catch (error) {
    console.error('Update task error', error)
    const index = memoryTasks.findIndex(task => task._id === id)
    if (index === -1) {
      return res.status(500).json({ message: 'Failed to update task' })
    }
    const updated = {
      ...memoryTasks[index],
      status,
      updatedAt: new Date().toISOString(),
    }
    memoryTasks[index] = updated
    res.json(updated)
  }
})

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

const port = process.env.PORT || 4000
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vibe_kanban'

mongoose
  .connect(uri)
  .then(() => {
    dbReady = true
    console.log('MongoDB connected')
  })
  .catch(error => {
    dbReady = false
    console.error('Failed to connect to MongoDB', error)
  })

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`)
})

