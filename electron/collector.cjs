const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const home = os.homedir()
const ignoredDirs = new Set([
  '.Trash',
  '.git',
  '.next',
  '.turbo',
  'Applications',
  'Desktop',
  'dist',
  'Library',
  'Movies',
  'Music',
  'node_modules',
  'Pictures',
])
const promptDirNames = new Set(['.codex', '.claude'])
const promptExtensions = new Set(['.json', '.jsonl', '.log', '.md', '.txt'])

function todayStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function toTimeLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function safeReadDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

function safeStat(filePath) {
  try {
    return fs.statSync(filePath)
  } catch {
    return null
  }
}

function runGit(repo, args) {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1800,
    }).trim()
  } catch {
    return ''
  }
}

function scanDirs(root, visitor, maxDepth, depth = 0) {
  if (depth > maxDepth) {
    return
  }

  for (const entry of safeReadDir(root)) {
    if (!entry.isDirectory() || ignoredDirs.has(entry.name)) {
      continue
    }

    const fullPath = path.join(root, entry.name)
    if (visitor(fullPath, entry.name) === false) {
      continue
    }

    scanDirs(fullPath, visitor, maxDepth, depth + 1)
  }
}

function findGitRepos() {
  const repos = new Set()
  const roots = [home, path.join(home, 'Developer')]

  for (const root of roots) {
    if (!fs.existsSync(root)) {
      continue
    }

    scanDirs(root, (dir, name) => {
      if (promptDirNames.has(name)) {
        return false
      }

      if (fs.existsSync(path.join(dir, '.git'))) {
        repos.add(dir)
        return false
      }
      return repos.size < 80
    }, root === home ? 2 : 5)
  }

  return [...repos].slice(0, 80)
}

function findPromptDirs() {
  const dirs = new Set()

  for (const name of promptDirNames) {
    const direct = path.join(home, name)
    if (fs.existsSync(direct)) {
      dirs.add(direct)
    }
  }

  scanDirs(home, (dir, name) => {
    if (promptDirNames.has(name)) {
      dirs.add(dir)
      return false
    }
    return dirs.size < 40
  }, 3)

  return [...dirs].slice(0, 40)
}

function collectPromptMetrics(start) {
  const promptDirs = findPromptDirs()
  let promptFiles = 0
  let estimatedTokens = 0

  for (const dir of promptDirs) {
    scanFiles(dir, 4, (filePath, stat) => {
      const ext = path.extname(filePath).toLowerCase()
      if (!promptExtensions.has(ext) || stat.mtime < start) {
        return
      }

      promptFiles += 1
      estimatedTokens += Math.max(1, Math.round(stat.size / 4))
    })
  }

  return {
    promptDirs,
    promptFiles,
    estimatedTokens,
  }
}

function scanFiles(root, maxDepth, visitor, depth = 0) {
  if (depth > maxDepth) {
    return
  }

  for (const entry of safeReadDir(root)) {
    if (ignoredDirs.has(entry.name)) {
      continue
    }

    const fullPath = path.join(root, entry.name)
    const stat = safeStat(fullPath)
    if (!stat) {
      continue
    }

    if (entry.isDirectory()) {
      scanFiles(fullPath, maxDepth, visitor, depth + 1)
      continue
    }

    if (entry.isFile()) {
      visitor(fullPath, stat)
    }
  }
}

function collectNotebookMetrics(start) {
  const notebooks = []

  scanFiles(home, 3, (filePath, stat) => {
    if (notebooks.length >= 120) {
      return
    }

    if (path.extname(filePath).toLowerCase() === '.ipynb' && stat.mtime >= start) {
      notebooks.push(filePath)
    }
  })

  return notebooks
}

function collectGitMetrics(start) {
  const repos = findGitRepos()
  const commits = []
  const activeRepos = new Set()
  const activeDays = new Set()

  for (const repo of repos) {
    const todayLog = runGit(repo, [
      'log',
      `--since=${start.toISOString()}`,
      '--pretty=format:%ct%x09%s',
      '--no-merges',
    ])

    if (todayLog) {
      activeRepos.add(path.basename(repo))
      for (const line of todayLog.split('\n').filter(Boolean)) {
        const [timestamp, ...subjectParts] = line.split('\t')
        commits.push({
          repo: path.basename(repo),
          subject: subjectParts.join('\t') || 'Commit',
          at: new Date(Number(timestamp) * 1000),
        })
      }
    }

    const recentDays = runGit(repo, [
      'log',
      '--since=21 days ago',
      '--pretty=format:%ad',
      '--date=short',
      '--no-merges',
    ])

    for (const day of recentDays.split('\n').filter(Boolean)) {
      activeDays.add(day)
    }
  }

  commits.sort((a, b) => b.at.getTime() - a.at.getTime())

  return {
    repos,
    commits,
    activeRepos: [...activeRepos],
    streak: countStreak(activeDays),
  }
}

function countStreak(days) {
  let streak = 0
  const cursor = new Date()

  while (streak < 60) {
    const key = cursor.toISOString().slice(0, 10)
    if (!days.has(key)) {
      break
    }

    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

function buildActivity({ commits, notebooks, promptMetrics, usedMemoryGb }) {
  const items = []

  for (const commit of commits.slice(0, 4)) {
    items.push({
      label: `Commit in ${commit.repo}`,
      detail: commit.subject,
      at: toTimeLabel(commit.at),
    })
  }

  if (promptMetrics.promptFiles > 0) {
    items.push({
      label: 'Prompt memory indexed',
      detail: `${promptMetrics.promptFiles} local prompt log files, no raw upload`,
      at: toTimeLabel(),
    })
  }

  if (notebooks.length > 0) {
    items.push({
      label: 'Notebook work found',
      detail: `${notebooks.length} notebooks touched today`,
      at: toTimeLabel(),
    })
  }

  items.push({
    label: 'System memory sampled',
    detail: `${usedMemoryGb} GB currently in use`,
    at: toTimeLabel(),
  })

  return items.slice(0, 6)
}

function buildPortfolioDraft({ commits, notebooks, promptMetrics, activeRepos }) {
  const repoText = activeRepos.length > 0 ? activeRepos.slice(0, 3).join(', ') : 'local projects'
  const subjects = commits.slice(0, 3).map((commit) => commit.subject)

  return {
    summary: `Today I worked across ${repoText}, turning local coding activity and prompt context into shippable progress.`,
    bullets: [
      `Landed ${commits.length} commit-level changes across ${activeRepos.length || 1} active repositories.`,
      `Touched ${notebooks.length} notebook files for research, validation, or data exploration.`,
      `Indexed ${promptMetrics.promptFiles} prompt log files as local-only memory with about ${formatTokens(promptMetrics.estimatedTokens)} estimated tokens.`,
      subjects.length > 0
        ? `Recent work included: ${subjects.join('; ')}.`
        : 'No commit subjects were found today yet; Codegotchi is waiting for the next local activity signal.',
    ],
  }
}

function formatTokens(tokens) {
  return `${(tokens / 1000).toFixed(1)}K`
}

function collectLocalSnapshot() {
  const start = todayStart()
  const gitMetrics = collectGitMetrics(start)
  const notebooks = collectNotebookMetrics(start)
  const promptMetrics = collectPromptMetrics(start)
  const usedMemoryGb = Math.max(1, Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024))
  const stats = {
    commits: gitMetrics.commits.length,
    notebooks: notebooks.length,
    memoryGb: usedMemoryGb,
    tokens: promptMetrics.estimatedTokens,
    streak: gitMetrics.streak,
  }

  return {
    source: 'local',
    collectedAt: new Date().toISOString(),
    stats,
    activity: buildActivity({
      commits: gitMetrics.commits,
      notebooks,
      promptMetrics,
      usedMemoryGb,
    }),
    portfolioDraft: buildPortfolioDraft({
      commits: gitMetrics.commits,
      notebooks,
      promptMetrics,
      activeRepos: gitMetrics.activeRepos,
    }),
    dataSources: {
      reposScanned: gitMetrics.repos.length,
      activeRepos: gitMetrics.activeRepos,
      promptDirsScanned: promptMetrics.promptDirs.length,
      promptFilesIndexed: promptMetrics.promptFiles,
      notebookFilesTouched: notebooks.length,
    },
    privacyNote: 'Local mode reads metadata from git repos and prompt log files on this Mac. Raw prompt text is not sent anywhere.',
  }
}

module.exports = {
  collectLocalSnapshot,
}
