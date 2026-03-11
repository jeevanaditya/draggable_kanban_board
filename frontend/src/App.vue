<script setup>
import { computed, onMounted, ref } from 'vue'

const loading = ref(false)
const error = ref('')
const creating = ref(false)

const columns = ref([
  { id: 'todo', title: 'Spark', accent: '#ff7a7a' },
  { id: 'in-progress', title: 'Flow', accent: '#ffd56a' },
  { id: 'done', title: 'Glow', accent: '#6bffce' },
])

const tasks = ref([])

const draftTitle = ref('')
const draftDescription = ref('')

const draggedId = ref(null)
const hoveredColumn = ref(null)

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const columnTasks = computed(() =>
  columns.value.reduce((map, column) => {
    map[column.id] = tasks.value.filter(task => task.status === column.id)
    return map
  }, {})
)

const columnCountLabel = id => {
  const bucket = columnTasks.value[id] || []
  if (!bucket.length) return 'Empty'
  if (bucket.length === 1) return '1 task'
  return `${bucket.length} tasks`
}

const resetDraft = () => {
  draftTitle.value = ''
  draftDescription.value = ''
}

const loadTasks = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${apiBase}/api/tasks`)
    if (!response.ok) {
      throw new Error('Failed to load tasks')
    }
    const data = await response.json()
    tasks.value = data
  } catch (err) {
    error.value = err.message || 'Something went wrong'
  } finally {
    loading.value = false
  }
}

const createTask = async () => {
  if (!draftTitle.value.trim() || creating.value) return
  creating.value = true
  error.value = ''
  try {
    const response = await fetch(`${apiBase}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: draftTitle.value.trim(),
        description: draftDescription.value.trim(),
      }),
    })
    if (!response.ok) {
      throw new Error('Could not create task')
    }
    const created = await response.json()
    tasks.value = [...tasks.value, created]
    resetDraft()
  } catch (err) {
    error.value = err.message || 'Something went wrong'
  } finally {
    creating.value = false
  }
}

const patchTaskStatus = async (id, status) => {
  try {
    const response = await fetch(`${apiBase}/api/tasks/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) {
      throw new Error('Could not update task')
    }
    const updated = await response.json()
    tasks.value = tasks.value.map(task =>
      task._id === updated._id ? updated : task
    )
  } catch (err) {
    error.value = err.message || 'Drag update failed, refreshing'
    loadTasks()
  }
}

const handleDragStart = (id, event) => {
  draggedId.value = id
  if (event?.dataTransfer) {
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragEnd = () => {
  draggedId.value = null
  hoveredColumn.value = null
}

const handleColumnDrop = id => {
  if (!draggedId.value) return
  hoveredColumn.value = null
  patchTaskStatus(draggedId.value, id)
}

const handleColumnOver = event => {
  if (event?.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleColumnEnter = id => {
  hoveredColumn.value = id
}

const handleColumnLeave = id => {
  if (hoveredColumn.value === id) {
    hoveredColumn.value = null
  }
}

onMounted(() => {
  loadTasks()
})
</script>

<template>
  <div class="page">
    <div class="halo halo-top" />
    <div class="halo halo-bottom" />

    <header class="shell">
      <div class="brand">
        <div class="brand-mark">
          <span class="brand-orbit" />
          <span class="brand-core" />
        </div>
        <div class="brand-copy">
          <h1>orbit board</h1>
          <p>tasks in motion, thoughts in sync</p>
        </div>
      </div>
      <div class="status-row">
        <span v-if="loading" class="pill pill-soft">syncing</span>
        <span v-else class="pill pill-soft">synced</span>
        <button class="pill pill-ghost" @click="loadTasks" :disabled="loading">
          refresh
        </button>
      </div>
    </header>

    <main class="layout">
      <section class="composer shell">
        <div class="composer-left">
          <input
            v-model="draftTitle"
            class="field title-input"
            placeholder="Name the next tiny win"
            maxlength="80"
          />
          <textarea
            v-model="draftDescription"
            class="field body-input"
            rows="2"
            placeholder="Add a one-line intention or leave it blank"
          />
        </div>
        <div class="composer-right">
          <button
            class="primary-button"
            @click="createTask"
            :disabled="creating || !draftTitle.trim()"
          >
            <span class="pulse-dot" />
            drop it in
          </button>
          <p class="hint">
            drag cards through the orbit rings to move them
          </p>
        </div>
      </section>

      <p v-if="error" class="error-banner">
        {{ error }}
      </p>

      <section class="board">
        <article
          v-for="column in columns"
          :key="column.id"
          class="column shell"
          :class="[
            `column-${column.id}`,
            hoveredColumn === column.id ? 'column-hovered' : '',
          ]"
          @dragover.prevent="handleColumnOver"
          @drop.prevent="handleColumnDrop(column.id)"
          @dragenter.prevent="handleColumnEnter(column.id)"
          @dragleave.prevent="handleColumnLeave(column.id)"
        >
          <header class="column-header">
            <div class="column-label">
              <span class="column-pill" :style="{ background: column.accent }" />
              <span class="column-title">{{ column.title }}</span>
            </div>
            <span class="column-count">
              {{ columnCountLabel(column.id) }}
            </span>
          </header>

          <div class="lane">
            <div
              v-for="task in columnTasks[column.id]"
              :key="task._id"
              class="card"
              :class="draggedId === task._id ? 'card-dragging' : ''"
              draggable="true"
              @dragstart="handleDragStart(task._id, $event)"
              @dragend="handleDragEnd"
            >
              <div class="card-top-row">
                <h2 class="card-title">
                  {{ task.title }}
                </h2>
                <span class="card-badge">
                  {{ column.title }}
                </span>
              </div>
              <p v-if="task.description" class="card-body">
                {{ task.description }}
              </p>
            </div>

            <p v-if="!columnTasks[column.id]?.length" class="empty-note">
              nothing parked here yet
            </p>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
:root {
  color-scheme: dark;
}

.page {
  min-height: 100vh;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  background:
    radial-gradient(circle at 10% 0%, #26174a 0, transparent 55%),
    radial-gradient(circle at 90% 100%, #11485a 0, transparent 55%),
    radial-gradient(circle at 50% 40%, #162033 0, #050612 70%);
  color: #f8f7ff;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  position: relative;
  overflow: hidden;
}

.halo {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.07), transparent);
  filter: blur(4px);
  pointer-events: none;
}

.halo-top {
  top: -160px;
  left: -80px;
}

.halo-bottom {
  bottom: -200px;
  right: -60px;
}

.shell {
  border-radius: 24px;
  background: radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.06), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(0, 180, 255, 0.08), transparent 55%),
    rgba(7, 10, 26, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 26px 60px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(124, 201, 255, 0.08);
  backdrop-filter: blur(22px) saturate(150%);
}

header.shell {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: conic-gradient(
    from 210deg,
    #ffb86b,
    #ff7aa2,
    #7c5cff,
    #5cd3ff,
    #ffb86b
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.brand-orbit {
  position: absolute;
  width: 56px;
  height: 56px;
  border-radius: inherit;
  border: 1px solid rgba(0, 0, 0, 0.35);
  opacity: 0.8;
}

.brand-core {
  width: 18px;
  height: 18px;
  border-radius: inherit;
  background: radial-gradient(circle at 30% 0, #ffffff, #ffe0b8, #ff8da9);
  box-shadow: 0 0 28px rgba(255, 198, 160, 0.75);
}

.brand-copy h1 {
  font-size: 20px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}

.brand-copy p {
  font-size: 12px;
  opacity: 0.66;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pill {
  border-radius: 999px;
  padding: 6px 12px;
  border: 1px solid transparent;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.pill-soft {
  border-color: rgba(255, 255, 255, 0.12);
  background: linear-gradient(
    120deg,
    rgba(111, 199, 255, 0.18),
    rgba(121, 255, 211, 0.16)
  );
}

.pill-ghost {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.16);
  color: #e7f4ff;
  cursor: pointer;
}

.pill-ghost:disabled {
  opacity: 0.5;
  cursor: default;
}

.layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 2px;
}

.composer {
  padding: 16px 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.composer-left {
  flex: 2 1 260px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.composer-right {
  flex: 1 1 180px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}

.field {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.06), transparent 55%),
    rgba(12, 17, 38, 0.92);
  padding: 10px 13px;
  color: inherit;
  outline: none;
  font-size: 14px;
  resize: vertical;
  min-height: 40px;
}

.field::placeholder {
  color: rgba(246, 243, 255, 0.46);
}

.title-input {
  font-size: 15px;
  font-weight: 500;
}

.body-input {
  min-height: 60px;
}

.primary-button {
  border-radius: 999px;
  border: none;
  padding: 10px 18px;
  background: linear-gradient(135deg, #ff8ba7, #ffcd70);
  color: #1b1022;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(255, 255, 255, 0.4);
}

.primary-button:disabled {
  opacity: 0.55;
  cursor: default;
  box-shadow: none;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #1b1022;
  position: relative;
}

.pulse-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 1px solid rgba(20, 6, 32, 0.8);
}

.hint {
  font-size: 11px;
  opacity: 0.7;
  text-align: right;
}

.error-banner {
  padding: 8px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 99, 132, 0.4);
  background: rgba(34, 10, 22, 0.92);
  font-size: 13px;
}

.board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.column {
  padding: 14px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transform: perspective(700px) rotateX(12deg);
  transform-origin: top center;
  transition: transform 140ms ease-out, box-shadow 140ms ease-out,
    border-color 140ms ease-out;
}

.column-hovered {
  transform: perspective(720px) rotateX(4deg) translateY(-4px);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow:
    0 26px 60px rgba(0, 0, 0, 0.7),
    0 0 18px rgba(158, 206, 255, 0.7);
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.column-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.column-pill {
  width: 9px;
  height: 28px;
  border-radius: 999px;
  box-shadow: 0 0 18px rgba(0, 0, 0, 0.45);
}

.column-title {
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  opacity: 0.96;
}

.column-count {
  font-size: 12px;
  opacity: 0.7;
}

.lane {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.card {
  border-radius: 18px;
  padding: 10px 11px;
  background: radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.04), transparent 60%),
    rgba(12, 12, 32, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.75);
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card:active {
  cursor: grabbing;
}

.card-dragging {
  opacity: 0.4;
  transform: scale(0.98);
}

.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
}

.card-badge {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.16),
    rgba(145, 207, 255, 0.16)
  );
}

.card-body {
  font-size: 13px;
  opacity: 0.82;
}

.empty-note {
  font-size: 12px;
  opacity: 0.54;
  padding: 6px 6px 8px;
}

@media (max-width: 960px) {
  .page {
    padding: 18px 14px 20px;
  }

  .board {
    grid-template-columns: 1fr;
  }

  .column {
    transform: none;
  }
}
</style>
