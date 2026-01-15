export interface StatEntry {
  name: string
  count: number
  lastEntry: string
  frequency: string
  rawDates?: Date[]
}

export function calculateMetadata(dates: Date[], referenceDate: Date): { lastEntry: string, frequency: string } {
  if (dates.length === 0) {
    return { lastEntry: "N/A", frequency: "N/A" }
  }

  dates.sort((a, b) => a.getTime() - b.getTime())
  const lastEntry = formatRelativeTime(dates[dates.length - 1], referenceDate)

  let frequency = "N/A"
  if (dates.length > 1) {
    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]
    const totalDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    if (totalDays > 0) {
      const avgDays = totalDays / (dates.length - 1)
      if (avgDays < 1) {
        const hours = Math.round(avgDays * 24)
        frequency = hours === 1 ? "1 hour" : `${hours} hours`
      } else {
        const days = Math.round(avgDays)
        frequency = days === 1 ? "1 day" : `${days} days`
      }
    }
  }
  return { lastEntry, frequency }
}

export interface WeeklyDataPoint {
  week: string
  count: number
}

export interface GroupWeeklyData {
  name: string
  data: WeeklyDataPoint[]
}

export interface Article {
  title: string
  date: Date
  template: string
  category?: string
  geo?: string
}

export interface TaxonomyNode {
  id: string
  name: string
  slug: string
  depth: number
  parentId: string | null
  children: string[]
  taxonomy: 'category' | 'geo'
  path: string
}

export interface TaxonomyTree {
  nodes: Map<string, TaxonomyNode>
  roots: string[] // IDs of root nodes
  nameToId: Map<string, string> // Map category/geo name to ID for lookup
}

export interface HierarchicalStatEntry extends StatEntry {
  id: string
  depth: number
  hasChildren: boolean
  parentId: string | null
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split(" ")[0]
  const [year, month, day] = parts.split("-").map(Number)
  if (year && month && day) {
    return new Date(year, month - 1, day)
  }
  return null
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

function cleanTemplateName(template: string): string {
  let clean = template
  if (clean.startsWith("templates/post-")) {
    clean = clean.slice(15)
  }
  if (clean.endsWith(".php")) {
    clean = clean.slice(0, -4)
  }
  return clean
}

export function formatRelativeTime(date: Date, referenceDate: Date = new Date()): string {
  const diffMs = referenceDate.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears >= 1) {
    return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`
  }
  if (diffMonths >= 1) {
    return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`
  }
  if (diffWeeks >= 1) {
    return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`
  }
  if (diffDays >= 1) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`
  }
  return diffHours <= 1 ? "1 hour ago" : `${diffHours} hours ago`
}

export function calculateStats(entries: Array<{ value: string; date: Date }>): StatEntry[] {
  const statsMap = new Map<string, { count: number; dates: Date[] }>()

  for (const entry of entries) {
    const { value, date } = entry
    if (!statsMap.has(value)) {
      statsMap.set(value, { count: 0, dates: [] })
    }
    const stats = statsMap.get(value)!
    stats.count++
    if (date) stats.dates.push(date)
  }

  // Find the maximum date across all entries to use as reference
  let maxDate = new Date(0)
  for (const [, data] of statsMap) {
    for (const date of data.dates) {
      if (date.getTime() > maxDate.getTime()) {
        maxDate = date
      }
    }
  }

  const results: StatEntry[] = []

  for (const [name, data] of statsMap) {
    const { count, dates } = data

    const metadata = calculateMetadata(dates, maxDate)

    results.push({ name, count, lastEntry: metadata.lastEntry, frequency: metadata.frequency, rawDates: dates })
  }

  return results.sort((a, b) => b.count - a.count)
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split("T")[0]
}

function getWeeklyDistribution(
  entries: Array<{ value: string; date: Date }>,
): Map<string, GroupWeeklyData> {
  const groupedByName = new Map<string, Map<string, number>>()

  // Group by name and week
  for (const entry of entries) {
    if (true) { // Replaced date filter with true to include all
      if (!groupedByName.has(entry.value)) {
        groupedByName.set(entry.value, new Map())
      }
      const weekStart = getWeekStart(entry.date)
      const weekMap = groupedByName.get(entry.value)!
      weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + 1)
    }
  }

  // Generate all weeks in the dataset range
  const allWeeks: string[] = []
  if (entries.length === 0) return new Map()

  const sortedDates = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime())
  const current = new Date(sortedDates[0].date)
  current.setDate(current.getDate() - current.getDay() + 1) // Start of first week
  const now = new Date(sortedDates[sortedDates.length - 1].date)

  while (current <= now) {
    allWeeks.push(getWeekStart(current))
    current.setDate(current.getDate() + 7)
  }

  // Convert to array format with all weeks filled
  const result = new Map<string, GroupWeeklyData>()
  for (const [name, weekMap] of groupedByName) {
    const data: WeeklyDataPoint[] = allWeeks.map((week) => ({
      week,
      count: weekMap.get(week) || 0,
    }))
    result.set(name, { name, data })
  }

  return result
}

export interface TimelineEntry {
  date: Date
  title: string
}

export interface TimelineDataPoint {
  name: string
  entries: TimelineEntry[]
}

export function getTimelineDistribution(
  entries: Array<{ value: string; date: Date; title: string }>,
): Map<string, TimelineEntry[]> {
  const groupedByName = new Map<string, TimelineEntry[]>()

  for (const entry of entries) {
    if (!groupedByName.has(entry.value)) {
      groupedByName.set(entry.value, [])
    }
    groupedByName.get(entry.value)!.push({ date: entry.date, title: entry.title })
  }

  return groupedByName
}

export async function parseTaxonomyCSV(): Promise<TaxonomyTree> {
  const response = await fetch('/taxonomy.csv')
  const csvText = await response.text()
  const lines = csvText.trim().split('\n')

  const nodes = new Map<string, TaxonomyNode>()
  const roots: string[] = []
  const nameToId = new Map<string, string>()

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Parse CSV line (handle quoted values)
    const parts: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        parts.push(current.replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    parts.push(current.replace(/^"|"$/g, ''))

    if (parts.length < 9) continue

    const taxonomy = parts[0] as 'category' | 'geo'
    const termId = parts[1]
    const parentTermId = parts[3]
    const name = parts[5]
    const slug = parts[6]
    const depth = parseInt(parts[7], 10)
    const path = parts[8]

    const id = `${taxonomy}-${termId}`
    const parentId = parentTermId === '0' || parentTermId === 'NULL' ? null : `${taxonomy}-${parentTermId}`

    const node: TaxonomyNode = {
      id,
      name,
      slug,
      depth,
      parentId,
      children: [],
      taxonomy,
      path
    }

    nodes.set(id, node)
    nameToId.set(name, id)

    if (!parentId) {
      roots.push(id)
    }
  }

  // Build parent-child relationships
  for (const [id, node] of nodes) {
    if (node.parentId) {
      const parent = nodes.get(node.parentId)
      if (parent) {
        parent.children.push(id)
      }
    }
  }

  return { nodes, roots, nameToId }
}

export function buildHierarchicalStats(
  flatStats: StatEntry[],
  taxonomy: TaxonomyTree,
  taxonomyType: 'category' | 'geo',
  referenceDate: Date = new Date()
): HierarchicalStatEntry[] {
  // Create a map of name -> stat
  const statsMap = new Map<string, StatEntry>()
  for (const stat of flatStats) {
    statsMap.set(stat.name, stat)
  }

  // Recursively aggregate counts for a node and its descendants
  // Recursively aggregate dates for a node and its descendants
  function collectDates(nodeId: string): Date[] {
    const node = taxonomy.nodes.get(nodeId)
    if (!node) return []

    // Start with the direct dates for this category
    const directStat = statsMap.get(node.name)
    let dates = directStat?.rawDates ? [...directStat.rawDates] : []

    // Add dates from all children recursively
    for (const childId of node.children) {
      dates = dates.concat(collectDates(childId))
    }

    return dates
  }

  // Build hierarchical stats for root categories only (initially)
  const hierarchicalStats: HierarchicalStatEntry[] = []

  for (const rootId of taxonomy.roots) {
    const node = taxonomy.nodes.get(rootId)
    if (!node || node.taxonomy !== taxonomyType) continue

    const allDates = collectDates(rootId)
    const metadata = calculateMetadata(allDates, referenceDate)
    const aggregatedCount = allDates.length

    // Only include categories that have entries (direct or through children)
    if (aggregatedCount > 0) {
      hierarchicalStats.push({
        name: node.name,
        count: aggregatedCount,
        lastEntry: metadata.lastEntry,
        frequency: metadata.frequency,
        id: rootId,
        depth: node.depth,
        hasChildren: node.children.length > 0,
        parentId: null
      })
    }
  }

  // Sort by count descending
  hierarchicalStats.sort((a, b) => b.count - a.count)

  return hierarchicalStats
}

export function getChildStats(
  parentId: string,
  flatStats: StatEntry[],
  taxonomy: TaxonomyTree,
  referenceDate: Date = new Date()
): HierarchicalStatEntry[] {
  const parentNode = taxonomy.nodes.get(parentId)
  if (!parentNode) return []

  const statsMap = new Map<string, StatEntry>()
  for (const stat of flatStats) {
    statsMap.set(stat.name, stat)
  }

  // Recursively aggregate counts for a node and its descendants
  // Recursively aggregate dates for a node and its descendants
  function collectDates(nodeId: string): Date[] {
    const node = taxonomy.nodes.get(nodeId)
    if (!node) return []

    const directStat = statsMap.get(node.name)
    let dates = directStat?.rawDates ? [...directStat.rawDates] : []

    for (const childId of node.children) {
      dates = dates.concat(collectDates(childId))
    }

    return dates
  }

  const childStats: HierarchicalStatEntry[] = []

  for (const childId of parentNode.children) {
    const node = taxonomy.nodes.get(childId)
    if (!node) continue

    const dates = collectDates(childId)
    const metadata = calculateMetadata(dates, referenceDate)
    const aggregatedCount = dates.length

    if (aggregatedCount > 0) {
      childStats.push({
        name: node.name,
        count: aggregatedCount,
        lastEntry: metadata.lastEntry,
        frequency: metadata.frequency,
        id: childId,
        depth: node.depth,
        hasChildren: node.children.length > 0,
        parentId: parentId
      })
    }
  }

  // Sort by count descending
  childStats.sort((a, b) => b.count - a.count)

  return childStats
}

export function processCSVData(csvString: string): {
  categories: StatEntry[]
  geos: StatEntry[]
  templates: StatEntry[]
  totalArticles: number
  categoryWeekly: Map<string, GroupWeeklyData>
  geoWeekly: Map<string, GroupWeeklyData>
  templateWeekly: Map<string, GroupWeeklyData>
  categoryTimeline: Map<string, TimelineEntry[]>
  geoTimeline: Map<string, TimelineEntry[]>
  templateTimeline: Map<string, TimelineEntry[]>
  rawEntries: {
    categories: Array<{ value: string; date: Date; title: string }>
    geos: Array<{ value: string; date: Date; title: string }>
    templates: Array<{ value: string; date: Date; title: string }>
  }
  articles: Article[]
} {
  const lines = csvString.trim().split("\n")
  const categoryEntries: Array<{ value: string; date: Date; title: string }> = []
  const geoEntries: Array<{ value: string; date: Date; title: string }> = []
  const templateEntries: Array<{ value: string; date: Date; title: string }> = []
  const articles: Article[] = []

  // Skip header, parse each line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const parts = line.split(";")
    if (parts.length < 10) continue

    const title = parts[1]
    const dateStr = parts[2]
    const template = parts[3]
    const category = parts[6]
    const geo = parts[8]

    const date = parseDate(dateStr)
    if (!date) continue

    if (category && category !== "NULL") {
      categoryEntries.push({ value: category.trim(), date, title })
    }
    if (geo && geo !== "NULL") {
      geoEntries.push({ value: geo, date, title })
    }
    if (template) {
      const cleanTemplate = cleanTemplateName(template)
      templateEntries.push({ value: cleanTemplate, date, title })

      const article: Article = {
        title,
        date,
        template: cleanTemplate,
        category: (category && category !== "NULL") ? category.trim() : undefined,
        geo: (geo && geo !== "NULL") ? geo : undefined
      }
      articles.push(article)
    }
  }

  const categoryWeekly = getWeeklyDistribution(categoryEntries)
  const geoWeekly = getWeeklyDistribution(geoEntries)
  const templateWeekly = getWeeklyDistribution(templateEntries)

  const categoryTimeline = getTimelineDistribution(categoryEntries)
  const geoTimeline = getTimelineDistribution(geoEntries)
  const templateTimeline = getTimelineDistribution(templateEntries)

  return {
    categories: calculateStats(categoryEntries),
    geos: calculateStats(geoEntries),
    templates: calculateStats(templateEntries),
    totalArticles: lines.length - 1,
    categoryWeekly,
    geoWeekly,
    templateWeekly,
    categoryTimeline,
    geoTimeline,
    templateTimeline,
    rawEntries: {
      categories: categoryEntries,
      geos: geoEntries,
      templates: templateEntries
    },
    articles
  }
}

export function aggregateTimelineData(
  flatTimelineData: Map<string, TimelineEntry[]>,
  taxonomy: TaxonomyTree,
  taxonomyType: 'category' | 'geo'
): Map<string, TimelineEntry[]> {
  const aggregatedMap = new Map<string, TimelineEntry[]>()

  // Helper to collect entries recursively
  function collectEntries(nodeId: string): TimelineEntry[] {
    const node = taxonomy.nodes.get(nodeId)
    if (!node) return []

    // Get entries for the current node name from the flat map
    const directEntries = flatTimelineData.get(node.name) || []

    // Collect entries from all children
    let allEntries = [...directEntries]
    for (const childId of node.children) {
      allEntries = allEntries.concat(collectEntries(childId))
    }

    return allEntries
  }

  // Iterate over all nodes in taxonomy matching the type
  // We want to populate the map for EVERY node in the taxonomy, so that
  // when we look up "Arts" (parent) we get all its children's data too.
  for (const [id, node] of taxonomy.nodes) {
    if (node.taxonomy === taxonomyType) {
      const entries = collectEntries(id)
      if (entries.length > 0) {
        aggregatedMap.set(node.name, entries)
      }
    }
  }

  // Also include non-hierarchical entries (if any) that are not in the taxonomy
  for (const [name, entries] of flatTimelineData) {
    if (!taxonomy.nameToId.has(name) && !aggregatedMap.has(name)) {
      aggregatedMap.set(name, entries)
    }
  }

  return aggregatedMap
}
