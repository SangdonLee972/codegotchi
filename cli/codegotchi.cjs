#!/usr/bin/env node
const readline = require('node:readline')
const { collectLocalSnapshot } = require('../electron/collector.cjs')

const frames = [
  ['  [o_o]', '  /| |\\', '   / \\'],
  ['  [o_o]  z', '  /| |\\', '   / \\'],
  ['  [^_^]', ' <|[_]|>', '  /   \\'],
  ['  <@_@>', ' /|===|\\', '  /_|_\\'],
  ['  [#_#]_', ' /| Git |\\', '  /===\\'],
]

const stages = [
  { name: 'Patchling', threshold: 0 },
  { name: 'Build Buddy', threshold: 180 },
  { name: 'Prompt Keeper', threshold: 360 },
  { name: 'Portfolio Engine', threshold: 620 },
]

function scoreFromStats(stats) {
  return (
    stats.commits * 9 +
    stats.notebooks * 13 +
    stats.memoryGb * 2 +
    Math.floor(stats.tokens / 1000) * 5 +
    stats.streak * 20
  )
}

function stageForScore(score) {
  return [...stages].reverse().find((stage) => score >= stage.threshold) || stages[0]
}

function formatTokens(tokens) {
  return `${(tokens / 1000).toFixed(1)}K`
}

function bar(value, max, width = 28) {
  const filled = Math.min(width, Math.max(0, Math.round((value / max) * width)))
  return `${'#'.repeat(filled)}${'.'.repeat(width - filled)}`
}

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H')
}

function render({ showPortfolio = false, frame = 0 } = {}) {
  const snapshot = collectLocalSnapshot()
  const score = scoreFromStats(snapshot.stats)
  const stage = stageForScore(score)
  const face = frames[Math.min(frames.length - 1, Math.max(0, stages.findIndex((item) => item.name === stage.name) + (frame % 2 === 0 ? 0 : 1)))]
  const nextStage = stages.find((item) => item.threshold > score)
  const progressMax = nextStage ? nextStage.threshold : Math.max(score, 1)

  clearScreen()
  console.log('CODEGOTCHI // local terminal companion')
  console.log('======================================')
  console.log('')
  console.log(face.join('\n'))
  console.log('')
  console.log(`${stage.name}  LV ${Math.floor(score / 100) + 1}  ${score.toLocaleString()} growth points`)
  console.log(`[${bar(score, progressMax)}] ${nextStage ? `next: ${nextStage.name}` : 'max demo stage'}`)
  console.log('')
  console.log(`Commits        ${snapshot.stats.commits}`)
  console.log(`Notebooks      ${snapshot.stats.notebooks}`)
  console.log(`Memory         ${snapshot.stats.memoryGb} GB`)
  console.log(`Prompt tokens  ${formatTokens(snapshot.stats.tokens)}`)
  console.log(`Streak         ${snapshot.stats.streak} day${snapshot.stats.streak === 1 ? '' : 's'}`)
  console.log('')
  console.log('Today memory')
  console.log('------------')
  for (const item of snapshot.activity.slice(0, 5)) {
    console.log(`${item.at}  ${item.label}`)
    console.log(`          ${item.detail}`)
  }
  console.log('')
  console.log(`Sources: ${snapshot.dataSources.reposScanned} repos, ${snapshot.dataSources.promptFilesIndexed} prompt files, ${snapshot.dataSources.notebookFilesTouched} notebooks`)
  console.log('Privacy: local metadata only; raw prompt text is not uploaded.')

  if (showPortfolio) {
    console.log('')
    console.log('Portfolio draft')
    console.log('---------------')
    console.log(snapshot.portfolioDraft.summary)
    for (const bullet of snapshot.portfolioDraft.bullets) {
      console.log(`- ${bullet}`)
    }
  }

  console.log('')
  console.log('Keys: r refresh  p portfolio  q quit')
}

function runOnce() {
  render({ showPortfolio: process.argv.includes('--portfolio') })
}

function runInteractive() {
  let showPortfolio = false
  let frame = 0

  render({ showPortfolio, frame })
  const timer = setInterval(() => {
    frame += 1
    render({ showPortfolio, frame })
  }, 10_000)

  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }

  process.stdin.on('keypress', (_text, key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      clearInterval(timer)
      clearScreen()
      process.exit(0)
    }

    if (key.name === 'p') {
      showPortfolio = !showPortfolio
      render({ showPortfolio, frame })
    }

    if (key.name === 'r') {
      render({ showPortfolio, frame })
    }
  })
}

if (process.argv.includes('--once')) {
  runOnce()
} else {
  runInteractive()
}
