import { useEffect, useState } from 'react'
import {
  BrainCircuit,
  ClipboardList,
  Flame,
  GitBranch,
  MemoryStick,
  NotebookTabs,
  RotateCcw,
  Sparkles,
  Terminal,
  Trophy,
  Zap,
} from 'lucide-react'
import './App.css'

type Stats = {
  commits: number
  notebooks: number
  memoryGb: number
  tokens: number
  streak: number
}

type Activity = {
  label: string
  detail: string
  at: string
}

type PortfolioDraft = {
  summary: string
  bullets: string[]
}

type Stage = {
  name: string
  title: string
  threshold: number
  face: string
}

const stages: Stage[] = [
  {
    name: 'Patchling',
    title: 'Waiting in the menu bar',
    threshold: 0,
    face: ['  [o_o]', '  /| |\\', '   / \\'].join('\n'),
  },
  {
    name: 'Build Buddy',
    title: 'Remembering today',
    threshold: 180,
    face: ['  {^_^}', ' <|[_]|>', '  /   \\'].join('\n'),
  },
  {
    name: 'Prompt Keeper',
    title: 'Turning prompts into context',
    threshold: 360,
    face: ['  <@_@>', ' /|===|\\', '  /_|_\\'].join('\n'),
  },
  {
    name: 'Portfolio Engine',
    title: 'Ready to draft your work history',
    threshold: 620,
    face: ['  [#_#]_', ' /| Git |\\', '  /===\\'].join('\n'),
  },
]

const starterStats: Stats = {
  commits: 18,
  notebooks: 7,
  memoryGb: 42,
  tokens: 28400,
  streak: 5,
}

const starterPortfolioDraft: PortfolioDraft = {
  summary:
    'Today I explored notebook workflows, pushed production code, and used AI prompts to compress debugging context into shippable decisions.',
  bullets: [
    'Built and iterated across demo commit-level changes.',
    'Ran notebook sessions for research and validation.',
    'Handled prompt tokens as reusable project memory.',
  ],
}

const rivals = [
  { name: 'ada-labs', score: 708, mood: 'merge streak' },
  { name: 'kernel-lane', score: 584, mood: 'memory maxed' },
  { name: 'notebook-nova', score: 506, mood: 'research mode' },
  { name: 'stacktrace-sam', score: 421, mood: 'debug sprint' },
  { name: 'cli-arc', score: 312, mood: 'late-night push' },
]

const events = [
  {
    label: 'Commit landed',
    detail: '+3 commits, +2 streak heat',
    apply: (stats: Stats): Stats => ({
      ...stats,
      commits: stats.commits + 3,
      streak: stats.streak + 1,
    }),
  },
  {
    label: 'Notebook run',
    detail: '+2 notebooks, +6 GB memory',
    apply: (stats: Stats): Stats => ({
      ...stats,
      notebooks: stats.notebooks + 2,
      memoryGb: stats.memoryGb + 6,
    }),
  },
  {
    label: 'Prompt remembered',
    detail: '+7.2K tokens, context indexed',
    apply: (stats: Stats): Stats => ({
      ...stats,
      tokens: stats.tokens + 7200,
    }),
  },
  {
    label: 'Heavy build',
    detail: '+11 GB memory, +1 commit',
    apply: (stats: Stats): Stats => ({
      ...stats,
      commits: stats.commits + 1,
      memoryGb: stats.memoryGb + 11,
    }),
  },
]

function scoreFromStats(stats: Stats) {
  return (
    stats.commits * 9 +
    stats.notebooks * 13 +
    stats.memoryGb * 2 +
    Math.floor(stats.tokens / 1000) * 5 +
    stats.streak * 20
  )
}

function stageForScore(score: number) {
  return [...stages].reverse().find((stage) => score >= stage.threshold) ?? stages[0]
}

function formatTokens(tokens: number) {
  return `${(tokens / 1000).toFixed(1)}K`
}

function nowLabel() {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())
}

function App() {
  const [stats, setStats] = useState(starterStats)
  const [localSnapshot, setLocalSnapshot] = useState<CodegotchiLocalSnapshot | null>(null)
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioDraft>(starterPortfolioDraft)
  const [activity, setActivity] = useState<Activity[]>([
    { label: 'Menu bar agent booted', detail: 'local memory simulator online', at: nowLabel() },
    { label: 'Work context linked', detail: 'prompts, commits, notebooks ready', at: nowLabel() },
  ])
  const isLocalMode = Boolean(localSnapshot)

  const score = scoreFromStats(stats)
  const stage = stageForScore(score)
  const nextStage = stages.find((item) => item.threshold > score)
  const progress = nextStage
    ? Math.min(100, Math.round((score / nextStage.threshold) * 100))
    : 100
  const leaderboard = [
    { name: 'you', score, mood: stage.name.toLowerCase() },
    ...rivals,
  ].sort((a, b) => b.score - a.score)

  useEffect(() => {
    const localApi = window.codegotchi
    if (localApi) {
      const applySnapshot = (snapshot: CodegotchiLocalSnapshot) => {
        setLocalSnapshot(snapshot)
        setStats(snapshot.stats)
        setActivity(snapshot.activity)
        setPortfolioDraft(snapshot.portfolioDraft)
      }

      localApi.getLocalSnapshot().then(applySnapshot).catch(() => {
        setActivity((items) => [
          { label: 'Local scan failed', detail: 'falling back to demo simulator', at: nowLabel() },
          ...items.slice(0, 5),
        ])
      })

      return localApi.onLocalSnapshot(applySnapshot)
    }

    const timer = window.setInterval(() => {
      const event = events[Math.floor(Math.random() * events.length)]
      setStats(event.apply)
      setActivity((items) => [
        { label: event.label, detail: event.detail, at: nowLabel() },
        ...items.slice(0, 5),
      ])
    }, 2600)

    return () => window.clearInterval(timer)
  }, [])

  function refreshLocalSnapshot() {
    if (!window.codegotchi) {
      setStats(starterStats)
      setPortfolioDraft(starterPortfolioDraft)
      return
    }

    window.codegotchi.getLocalSnapshot().then((snapshot) => {
      setLocalSnapshot(snapshot)
      setStats(snapshot.stats)
      setActivity(snapshot.activity)
      setPortfolioDraft(snapshot.portfolioDraft)
    })
  }

  function triggerEvent(index: number) {
    const event = events[index]
    setStats(event.apply)
    setActivity((items) => [
      { label: event.label, detail: event.detail, at: nowLabel() },
      ...items.slice(0, 5),
    ])
  }

  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Primary">
        <a className="brand" href="/" aria-label="Codegotchi home">
          <Terminal size={20} aria-hidden="true" />
          <span>Codegotchi</span>
        </a>
        <div className="topbar-actions">
          <a className="icon-link" href="https://github.com/" target="_blank" aria-label="GitHub">
            <GitBranch size={19} aria-hidden="true" />
          </a>
          <button className="icon-button" type="button" onClick={refreshLocalSnapshot} aria-label={isLocalMode ? 'Rescan local data' : 'Reset demo'}>
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
      </nav>

      <section className="hero-panel">
        <div className="status-column">
          <div className="signal-row">
            <span className="live-dot" aria-hidden="true" />
            <span>{isLocalMode ? 'Local Mac memory active' : 'Mac menu bar work memory'}</span>
          </div>
          <h1>A tiny ASCII companion that remembers what you built today.</h1>
          <p className="intro">
            {isLocalMode
              ? 'Codegotchi is reading local git activity, prompt-log metadata, notebook touches, and memory usage from this Mac.'
              : 'Codegotchi lives in your macOS status bar, watches opted-in coding signals, remembers your prompts, and turns a hard day of work into summaries, rankings, and portfolio-ready output.'}
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="https://github.com/" target="_blank">
              <GitBranch size={18} aria-hidden="true" />
              Star the prototype
            </a>
            <a className="secondary-action" href="#leaderboard">
              <Trophy size={18} aria-hidden="true" />
              Open weekly ranking
            </a>
          </div>
        </div>

        <section className="pet-console" aria-label="Current Codegotchi">
          <div className="console-header">
            <span>{stage.name}</span>
            <span>LV {Math.floor(score / 100) + 1}</span>
          </div>
          <pre aria-label={`${stage.name} ASCII avatar`}>{stage.face}</pre>
          <div className="stage-copy">
            <strong>{stage.title}</strong>
            <span>{score.toLocaleString()} growth points</span>
          </div>
          <div className="progress-track" aria-label={`${progress}% evolution progress`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="next-stage">{nextStage ? `${nextStage.name} unlocks at ${nextStage.threshold}` : 'Max demo evolution reached'}</p>
        </section>
      </section>

      <section className="metrics-grid" aria-label="Activity metrics">
        <article>
          <Sparkles size={20} aria-hidden="true" />
          <span>Commits</span>
          <strong>{stats.commits}</strong>
        </article>
        <article>
          <NotebookTabs size={20} aria-hidden="true" />
          <span>Notebooks</span>
          <strong>{stats.notebooks}</strong>
        </article>
        <article>
          <MemoryStick size={20} aria-hidden="true" />
          <span>Memory</span>
          <strong>{stats.memoryGb} GB</strong>
        </article>
        <article>
          <BrainCircuit size={20} aria-hidden="true" />
          <span>Prompt tokens</span>
          <strong>{formatTokens(stats.tokens)}</strong>
        </article>
      </section>

      <section className="workbench">
        <section className="panel controls-panel" aria-label="Demo controls">
          <div className="panel-title">
            <Zap size={18} aria-hidden="true" />
            <h2>Status bar actions</h2>
          </div>
          <div className="control-grid">
            <button type="button" onClick={() => triggerEvent(0)}>
              <Sparkles size={18} aria-hidden="true" />
              Commit
            </button>
            <button type="button" onClick={() => triggerEvent(1)}>
              <NotebookTabs size={18} aria-hidden="true" />
              Notebook
            </button>
            <button type="button" onClick={() => triggerEvent(2)}>
              <BrainCircuit size={18} aria-hidden="true" />
              Remember
            </button>
            <button type="button" onClick={() => triggerEvent(3)}>
              <MemoryStick size={18} aria-hidden="true" />
              Memory
            </button>
          </div>
          {localSnapshot ? (
            <p className="privacy-note">
              Local scan: {localSnapshot.dataSources.reposScanned} repos, {localSnapshot.dataSources.promptFilesIndexed} prompt files, {localSnapshot.dataSources.notebookFilesTouched} notebooks.
            </p>
          ) : (
            <p className="privacy-note">Demo mode is simulated. Open the Electron app to feed Codegotchi with local-only activity metadata.</p>
          )}
        </section>

        <section className="panel activity-panel" aria-label="Live activity">
          <div className="panel-title">
            <Flame size={18} aria-hidden="true" />
            <h2>Today memory</h2>
          </div>
          <ol className="activity-list">
            {activity.map((item) => (
              <li key={`${item.at}-${item.label}-${item.detail}`}>
                <time>{item.at}</time>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel portfolio-panel" aria-label="Generated portfolio output">
          <div className="panel-title">
            <ClipboardList size={18} aria-hidden="true" />
            <h2>Portfolio draft</h2>
          </div>
          <div className="portfolio-output">
            <p>{portfolioDraft.summary}</p>
            <ul>
              {portfolioDraft.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            {localSnapshot ? <small>{localSnapshot.privacyNote}</small> : null}
          </div>
        </section>

        <section id="leaderboard" className="panel leaderboard-panel" aria-label="Leaderboard">
          <div className="panel-title">
            <Trophy size={18} aria-hidden="true" />
            <h2>Weekly league</h2>
          </div>
          <ol className="leaderboard">
            {leaderboard.map((player, index) => (
              <li className={player.name === 'you' ? 'is-you' : ''} key={player.name}>
                <span className="rank">{index + 1}</span>
                <div>
                  <strong>{player.name}</strong>
                  <span>{player.mood}</span>
                </div>
                <b>{player.score}</b>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  )
}

export default App
