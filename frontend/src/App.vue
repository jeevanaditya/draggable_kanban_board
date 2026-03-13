<script setup>
import { computed, onMounted, ref } from 'vue'

const loading = ref(false)
const error = ref('')
const creating = ref(false)

const activeView = ref('board')
const showStreak = ref(true)
const defaultStatus = ref('todo')

const columns = ref([
  { id: 'todo', title: 'To Do', accent: '#ff7a7a' },
  { id: 'in-progress', title: 'In Progress', accent: '#ffd56a' },
  { id: 'done', title: 'Done', accent: '#6bffce' },
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

const activityStrip = computed(() => {
  const today = new Date()
  const days = []
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - index
    )
    const label = date.toLocaleDateString(undefined, { weekday: 'short' })
    const count = tasks.value.filter(task => {
      if (!task.createdAt) return false
      const created = new Date(task.createdAt)
      return (
        created.getFullYear() === date.getFullYear() &&
        created.getMonth() === date.getMonth() &&
        created.getDate() === date.getDate()
      )
    }).length
    days.push({ label, count })
  }
  return days
})

const timelineItems = computed(() =>
  [...tasks.value].sort((first, second) => {
    const firstTime = first.createdAt ? new Date(first.createdAt).getTime() : 0
    const secondTime = second.createdAt
      ? new Date(second.createdAt).getTime()
      : 0
    return firstTime - secondTime
  })
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

const setView = view => {
  activeView.value = view
}

const persistDefaultStatus = () => {
  if (['todo', 'in-progress', 'done'].includes(defaultStatus.value)) {
    window.localStorage.setItem('orbit-default-status', defaultStatus.value)
  }
}

const persistShowStreak = () => {
  window.localStorage.setItem('orbit-show-streak', showStreak.value ? '1' : '0')
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
        status: defaultStatus.value,
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
  const storedStatus = window.localStorage.getItem('orbit-default-status')
  if (storedStatus && ['todo', 'in-progress', 'done'].includes(storedStatus)) {
    defaultStatus.value = storedStatus
  }
  const storedStreak = window.localStorage.getItem('orbit-show-streak')
  if (storedStreak === '0') {
    showStreak.value = false
  }
  loadTasks()
})
</script>

<template>
  <div class="frame">
    <header class="global-header">
      <div class="global-logo">orbit</div>
      <nav class="global-nav">
        <span
          class="nav-chip"
          :class="activeView === 'board' ? 'nav-chip-active' : ''"
          @click="setView('board')"
        >
          board
        </span>
        <span
          class="nav-chip"
          :class="activeView === 'timeline' ? 'nav-chip-active' : ''"
          @click="setView('timeline')"
        >
          timeline
        </span>
        <span
          class="nav-chip"
          :class="activeView === 'settings' ? 'nav-chip-active' : ''"
          @click="setView('settings')"
        >
          settings
        </span>
      </nav>
      <div class="global-profile">
        <span class="profile-tag">J</span>
        <span class="profile-name">Jeevan</span>
      </div>
    </header>

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
        <template v-if="activeView === 'board'">
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
                  <span
                    class="column-pill"
                    :style="{ background: column.accent }"
                  />
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

          <section v-if="showStreak" class="activity shell">
            <div class="activity-header">
              <span class="activity-title">orbit streak</span>
              <span class="activity-sub">
                last seven days of drops
              </span>
            </div>
            <div class="activity-track">
              <div
                v-for="day in activityStrip"
                :key="day.label"
                class="activity-pill"
                :class="{
                  'activity-pill-low': day.count === 1,
                  'activity-pill-mid': day.count === 2,
                  'activity-pill-high': day.count >= 3,
                }"
              >
                <span class="activity-dot" />
                <span class="activity-label">
                  {{ day.label }}
                </span>
                <span class="activity-count">
                  {{ day.count ? day.count : '—' }}
                </span>
              </div>
            </div>
          </section>
        </template>

        <section v-else-if="activeView === 'timeline'" class="timeline shell">
          <div class="timeline-header">
            <span class="timeline-title">task timeline</span>
            <span class="timeline-sub">
              ordered by when each card was first dropped in
            </span>
          </div>
          <div v-if="!timelineItems.length" class="timeline-empty">
            No tasks yet. Drop something into the board first.
          </div>
          <div v-else class="timeline-list">
            <div
              v-for="task in timelineItems"
              :key="task._id"
              class="timeline-row"
            >
              <div class="timeline-dot" />
              <div class="timeline-main">
                <div class="timeline-top">
                  <span class="timeline-task-title">{{ task.title }}</span>
                  <span class="timeline-status">
                    {{
                      columns.find(column => column.id === task.status)?.title ||
                      'Unknown'
                    }}
                  </span>
                </div>
                <div class="timeline-meta">
                  <span>
                    {{
                      task.createdAt
                        ? new Date(task.createdAt).toLocaleString()
                        : 'no timestamp'
                    }}
                  </span>
                  <span v-if="task.description" class="timeline-description">
                    {{ task.description }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-else class="settings shell">
          <div class="settings-header">
            <span class="settings-title">board settings</span>
            <span class="settings-sub">
              tweak how new cards land and how the streak behaves
            </span>
          </div>

          <div class="settings-group">
            <div class="settings-label">
              Default column for new tasks
            </div>
            <select
              v-model="defaultStatus"
              class="settings-select"
              @change="persistDefaultStatus"
            >
              <option
                v-for="column in columns"
                :key="column.id"
                :value="column.id"
              >
                {{ column.title }}
              </option>
            </select>
            <p class="settings-help">
              This column is used when you press the Drop it in button.
            </p>
          </div>

          <div class="settings-group">
            <div class="settings-label">
              Orbit streak strip
            </div>
            <button
              class="toggle"
              :class="showStreak ? 'toggle-on' : 'toggle-off'"
              type="button"
              @click="
                showStreak = !showStreak;
                persistShowStreak();
              "
            >
              <span class="toggle-thumb" />
              <span class="toggle-text">
                {{ showStreak ? 'Visible' : 'Hidden' }}
              </span>
            </button>
            <p class="settings-help">
              Control whether the seven day activity strip shows under the board.
            </p>
          </div>
        </section>
      </main>
    </div>

    <footer class="global-footer">
      <span class="footer-copy">orbit board · draggable kanban</span>
      <span class="footer-right">crafted for assignment demo</span>
    </footer>
  </div>
</template>

<style scoped>
:root {
  color-scheme: dark;
}

.page {
  flex: 1;
  padding: 24px 40px 40px;
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

.frame {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #050612;
}

.global-header {
  height: 56px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.16), transparent 65%),
    rgba(4, 5, 15, 0.98);
}

.global-logo {
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.global-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-chip {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  opacity: 0.68;
  cursor: pointer;
  user-select: none;
}

.nav-chip-active {
  border-color: rgba(255, 255, 255, 0.38);
  opacity: 1;
}

.global-profile {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.profile-tag {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff8ba7, #ffcd70);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #170c24;
}

.profile-name {
  opacity: 0.86;
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
  gap: 18px;
}

.column {
  padding: 14px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 140ms ease-out, border-color 140ms ease-out,
    background 140ms ease-out;
}

.column-hovered {
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

.activity {
  margin-top: 4px;
  padding: 10px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.activity-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.activity-title {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.activity-sub {
  font-size: 11px;
  opacity: 0.7;
}

.activity-track {
  display: flex;
  gap: 6px;
}

.activity-pill {
  flex: 1 1 0;
  border-radius: 999px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.08), transparent 60%),
    rgba(9, 13, 28, 0.96);
  font-size: 11px;
}

.activity-pill-low {
  border-color: rgba(111, 199, 255, 0.6);
}

.activity-pill-mid {
  border-color: rgba(255, 197, 122, 0.7);
}

.activity-pill-high {
  border-color: rgba(255, 120, 178, 0.9);
  box-shadow: 0 0 16px rgba(255, 120, 178, 0.45);
}

.activity-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7cffd3, #fff6a6);
}

.activity-label {
  text-transform: uppercase;
  letter-spacing: 0.13em;
  opacity: 0.8;
}

.activity-count {
  opacity: 0.78;
}

.timeline {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.timeline-title {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.timeline-sub {
  font-size: 11px;
  opacity: 0.7;
}

.timeline-empty {
  font-size: 13px;
  opacity: 0.7;
  padding: 10px 4px 6px;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-row {
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 10px;
  align-items: start;
  padding: 10px 10px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.05), transparent 60%),
    rgba(9, 12, 28, 0.96);
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-top: 4px;
  background: linear-gradient(135deg, #5cd3ff, #ff8ba7);
  box-shadow: 0 0 14px rgba(92, 211, 255, 0.55);
}

.timeline-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.timeline-task-title {
  font-size: 14px;
  font-weight: 520;
}

.timeline-status {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.78;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 3px 8px;
}

.timeline-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  opacity: 0.76;
}

.timeline-description {
  opacity: 0.86;
}

.settings {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.settings-title {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.settings-sub {
  font-size: 11px;
  opacity: 0.7;
}

.settings-group {
  border-radius: 18px;
  padding: 12px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.04), transparent 60%),
    rgba(9, 12, 28, 0.96);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-label {
  font-size: 13px;
  opacity: 0.9;
}

.settings-select {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(7, 10, 26, 0.9);
  color: inherit;
  padding: 10px 12px;
  outline: none;
}

.settings-help {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(7, 10, 26, 0.9);
  padding: 8px 10px;
  color: inherit;
  cursor: pointer;
}

.toggle-thumb {
  width: 26px;
  height: 16px;
  border-radius: 999px;
  position: relative;
  background: rgba(255, 255, 255, 0.14);
}

.toggle-thumb::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  transition: left 160ms ease-out, background 160ms ease-out;
}

.toggle-on .toggle-thumb {
  background: rgba(111, 199, 255, 0.3);
}

.toggle-on .toggle-thumb::after {
  left: 12px;
  background: rgba(255, 205, 112, 0.92);
}

.toggle-text {
  font-size: 12px;
  letter-spacing: 0.06em;
}

.global-footer {
  height: 42px;
  padding: 0 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(244, 243, 255, 0.76);
  background: rgba(3, 5, 14, 0.98);
}

.footer-copy {
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.footer-right {
  opacity: 0.8;
}

@media (max-width: 960px) {
  .global-header {
    padding: 0 16px;
  }

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
