/// <reference types="vite/client" />

type CodegotchiStats = {
  commits: number
  notebooks: number
  memoryGb: number
  tokens: number
  streak: number
}

type CodegotchiActivity = {
  label: string
  detail: string
  at: string
}

type CodegotchiPortfolioDraft = {
  summary: string
  bullets: string[]
}

type CodegotchiLocalSnapshot = {
  source: 'local'
  collectedAt: string
  stats: CodegotchiStats
  activity: CodegotchiActivity[]
  portfolioDraft: CodegotchiPortfolioDraft
  dataSources: {
    reposScanned: number
    activeRepos: string[]
    promptDirsScanned: number
    promptFilesIndexed: number
    notebookFilesTouched: number
  }
  privacyNote: string
}

interface Window {
  codegotchi?: {
    getLocalSnapshot: () => Promise<CodegotchiLocalSnapshot>
    onLocalSnapshot: (callback: (snapshot: CodegotchiLocalSnapshot) => void) => () => void
  }
}
