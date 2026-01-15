"use client"

import type React from "react"
import { useMemo, useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { processCSVData, calculateStats, getTimelineDistribution, parseTaxonomyCSV, buildHierarchicalStats, getChildStats, aggregateTimelineData, type StatEntry, type TimelineEntry, type TaxonomyTree, type HierarchicalStatEntry } from "@/lib/csv-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function TimelineChart({
  timelineData,
  stats,
  minDate,
  maxDate
}: {
  timelineData: Map<string, TimelineEntry[]>;
  stats: StatEntry[];
  minDate: Date;
  maxDate: Date;
}) {
  const topCount = 50
  const topNames = useMemo(() => {
    return stats.slice(0, topCount).map(s => s.name)
  }, [stats, topCount])

  const years = useMemo(() => {
    const yrs: Date[] = []
    const startYear = minDate.getFullYear()
    const endYear = maxDate.getFullYear()
    for (let y = startYear; y <= endYear; y++) {
      yrs.push(new Date(y, 0, 1))
    }
    return yrs
  }, [minDate, maxDate])

  const rowHeight = 16
  const labelWidth = 180
  const chartHeight = topNames.length * rowHeight + 80
  const paddingRight = 20

  return (
    <div className="w-full rounded-md border bg-white dark:bg-zinc-950">
      <div className="w-full relative overflow-x-auto" style={{ height: chartHeight }}>
        <ResponsiveSVG
          height={chartHeight}
          topNames={topNames}
          timelineData={timelineData}
          minDate={minDate}
          maxDate={maxDate}
          labelWidth={labelWidth}
          rowHeight={rowHeight}
          paddingRight={paddingRight}
          labels={years}
          stats={stats}
        />
      </div>
    </div>
  )
}

function ResponsiveSVG({
  height,
  topNames,
  timelineData,
  minDate,
  maxDate,
  labelWidth,
  rowHeight,
  paddingRight,
  labels = [],
  stats = []
}: any) {
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      const updateWidth = () => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.clientWidth)
        }
      }
      updateWidth()
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }
  }, [])

  const getX = (date: Date) => {
    if (containerWidth === 0) return 0
    const total = maxDate.getTime() - minDate.getTime()
    if (total === 0) return labelWidth
    const ratio = (date.getTime() - minDate.getTime()) / total
    return labelWidth + ratio * (containerWidth - labelWidth - paddingRight)
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      {containerWidth > 0 && (
        <svg width={containerWidth} height={height}>
          {/* Labels (Years) */}
          {labels.map((yearDate: Date) => {
            const x = getX(yearDate)
            if (x < labelWidth - 5 || x > containerWidth) return null
            return (
              <g key={yearDate.getFullYear()}>
                <line
                  x1={x} y1={40} x2={x} y2={height}
                  stroke="currentColor" strokeOpacity={0.05} strokeDasharray="4 4"
                />
                <text
                  x={x} y={30}
                  fontSize={10} textAnchor="middle"
                  className="fill-muted-foreground font-medium"
                >
                  {yearDate.getFullYear()}
                </text>
              </g>
            )
          })}

          {/* Rows */}
          {topNames.map((name: string, i: number) => {
            const y = 60 + i * rowHeight
            const entries = timelineData.get(name) || []
            const stat = stats[i]
            const depth = (stat as any)?.depth || 0
            const displayName = depth > 0 ? `↳ ${name}` : name

            return (
              <g key={name} className="group">
                <rect
                  x={0} y={y - rowHeight / 2} width={containerWidth} height={rowHeight}
                  fill="transparent"
                  className="group-hover:fill-gray-200 dark:group-hover:fill-gray-800 transition-all"
                />

                <text
                  x={labelWidth - 15} y={y}
                  textAnchor="end" fontSize={10}
                  className={`fill-muted-foreground group-hover:fill-foreground font-medium transition-colors ${depth > 0 ? 'italic opacity-80' : ''}`}
                >
                  {displayName}
                </text>

                {entries.map((entry: TimelineEntry, di: number) => {
                  const cx = getX(entry.date)
                  if (cx < labelWidth - 5 || cx > containerWidth) return null
                  return (
                    <circle
                      key={di}
                      cx={cx}
                      cy={y}
                      r={3}
                      fill="#4f46e5"
                      fillOpacity={0.3}
                      className="transition-opacity hover:fill-opacity-80"
                    >
                      <title>{entry.title} ({entry.date.toLocaleDateString()})</title>
                    </circle>
                  )
                })}
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}


function StatsTable({
  title,
  stats,
  icon,
  timelineData,
  minDate,
  maxDate,
  onToggleExpand,
  expandedIds,
  totalArticles = 0
}: {
  title: string
  stats: StatEntry[]
  icon: React.ReactNode
  timelineData: Map<string, TimelineEntry[]>
  minDate: Date
  maxDate: Date
  onToggleExpand?: (id: string) => void
  expandedIds?: Set<string>
  totalArticles?: number
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto">
            {stats.length} groups
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[300px] overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="text-right font-semibold">Count</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">% Relative</TableHead>
                <TableHead className="font-semibold">Last Entry</TableHead>
                <TableHead className="font-semibold">Frequency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((stat) => {
                const hierarchical = stat as unknown as HierarchicalStatEntry
                const isHierarchical = typeof hierarchical.depth !== 'undefined'
                const paddingLeft = isHierarchical ? `${hierarchical.depth * 1.5}rem` : '0.5rem'
                const hasChildren = hierarchical.hasChildren
                const isExpanded = expandedIds?.has(hierarchical.id)

                const percentage = totalArticles > 0
                  ? ((stat.count / totalArticles) * 100).toFixed(1) + "%"
                  : "0%"

                return (
                  <TableRow
                    key={isHierarchical ? hierarchical.id : stat.name}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium p-2">
                      <div className="flex items-center gap-2" style={{ paddingLeft }}>
                        {hasChildren ? (
                          <button
                            onClick={() => onToggleExpand?.(hierarchical.id)}
                            className="p-0.5 hover:bg-muted rounded text-muted-foreground"
                          >
                            {isExpanded ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </button>
                        ) : (
                          isHierarchical && <span className="w-5" /> // Spacer for alignment
                        )}
                        {stat.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{stat.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-mono text-xs">
                      {percentage}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{stat.lastEntry}</TableCell>
                    <TableCell className="text-muted-foreground">{stat.frequency}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-md border p-0 overflow-hidden">
          <div className="bg-muted/30 px-4 py-2 border-b">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Timeline distribution (All articles)
            </span>
          </div>
          <TimelineChart
            timelineData={timelineData}
            stats={stats}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      </CardContent>
    </Card>
  )
}
function flattenHierarchy(
  nodes: HierarchicalStatEntry[],
  expandedIds: Set<string>,
  flatStats: StatEntry[],
  taxonomy: TaxonomyTree,
  referenceDate: Date
): HierarchicalStatEntry[] {
  let result: HierarchicalStatEntry[] = []

  for (const node of nodes) {
    result.push(node)

    if (expandedIds.has(node.id)) {
      const children = getChildStats(node.id, flatStats, taxonomy, referenceDate)
      const flattenedChildren = flattenHierarchy(children, expandedIds, flatStats, taxonomy, referenceDate)
      result = result.concat(flattenedChildren)
    }
  }

  return result
}

export function CsvAnalysisDashboard() {
  const [data, setData] = useState<any>(null)
  const [taxonomy, setTaxonomy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("2y")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedGeos, setExpandedGeos] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadData() {
      try {
        const [csvResponse, taxonomyData] = await Promise.all([
          fetch("/dataset.csv"),
          parseTaxonomyCSV()
        ])
        const csvText = await csvResponse.text()
        const processed = processCSVData(csvText)
        setData(processed)
        setTaxonomy(taxonomyData)
      } catch (error) {
        console.error("Failed to load dataset:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const {
    filteredCategories, filteredGeos, filteredTemplates,
    totalArticles,
    categoryTimeline, geoTimeline, templateTimeline,
    minDate, maxDate, lastArticleDate
  } = useMemo(() => {
    if (!data) return {
      filteredCategories: [], filteredGeos: [], filteredTemplates: [],
      totalArticles: 0,
      categoryTimeline: new Map(), geoTimeline: new Map(), templateTimeline: new Map(),
      minDate: new Date(), maxDate: new Date(), lastArticleDate: null
    }

    const now = new Date()
    let cutoffDate = new Date(0) // Default for 'all'
    let limitCount = 0

    if (timeRange.startsWith("last-")) {
      limitCount = parseInt(timeRange.split("-")[1], 10)
    } else if (timeRange === "6m") {
      cutoffDate = new Date(now)
      cutoffDate.setMonth(now.getMonth() - 6)
    } else if (timeRange === "1y") {
      cutoffDate = new Date(now)
      cutoffDate.setFullYear(now.getFullYear() - 1)
    } else if (timeRange === "2y") {
      cutoffDate = new Date(now)
      cutoffDate.setFullYear(now.getFullYear() - 2)
    } else if (timeRange === "3y") {
      cutoffDate = new Date(now)
      cutoffDate.setFullYear(now.getFullYear() - 3)
    } else if (timeRange === "4y") {
      cutoffDate = new Date(now)
      cutoffDate.setFullYear(now.getFullYear() - 4)
    } else if (timeRange === "5y") {
      cutoffDate = new Date(now)
      cutoffDate.setFullYear(now.getFullYear() - 5)
    }

    let rawCats = data.rawEntries.categories
    let rawGeos = data.rawEntries.geos
    let rawTemplates = data.rawEntries.templates

    if (limitCount > 0) {
      // Collect ALL entries to sort by date
      const allEntries = [
        ...rawCats,
        ...rawGeos,
        ...rawTemplates
      ].sort((a: any, b: any) => b.date.getTime() - a.date.getTime())

      // Get unique article titles to count properly
      const uniqueTitles = new Set<string>()
      const validDates: Date[] = []

      // Find the date of the Nth article
      let articleCount = 0
      let dateCutoff: Date | null = null

      // This is an approximation because one article can have multiple entries (cats, geos, etc)
      // A more accurate way is to filter by unique articles
      const seenTitles = new Set<string>()
      for (const entry of allEntries) {
        if (!seenTitles.has(entry.title)) {
          seenTitles.add(entry.title)
          articleCount++
          if (articleCount === limitCount) {
            dateCutoff = entry.date
            break
          }
        }
      }

      // If we found a cutoff date, use it; otherwise take everything (if fewer items than limit)
      if (dateCutoff) {
        cutoffDate = dateCutoff
      }

      // Use the cutoff logic below
    }

    const filterEntries = (entries: any[]) => entries.filter(e => e.date >= cutoffDate)

    rawCats = filterEntries(rawCats)
    rawGeos = filterEntries(rawGeos)
    rawTemplates = filterEntries(rawTemplates)
    // Calculate dynamic range for the current view
    const allFilteredDates = [
      ...rawCats.map((e: any) => e.date),
      ...rawGeos.map((e: any) => e.date),
      ...rawTemplates.map((e: any) => e.date)
    ].sort((a, b) => a.getTime() - b.getTime())

    let viewMin = cutoffDate.getTime() === 0 ? (allFilteredDates[0] || new Date()) : cutoffDate
    let viewMax = allFilteredDates[allFilteredDates.length - 1] || new Date()

    const statsCats = calculateStats(rawCats)
    const statsGeos = calculateStats(rawGeos)
    const statsTemplates = calculateStats(rawTemplates)

    let finalCats: StatEntry[] = statsCats
    let finalGeos: StatEntry[] = statsGeos

    if (taxonomy) {
      const rootCats = buildHierarchicalStats(statsCats, taxonomy, 'category', viewMax)
      finalCats = flattenHierarchy(rootCats, expandedCategories, statsCats, taxonomy, viewMax)

      const rootGeos = buildHierarchicalStats(statsGeos, taxonomy, 'geo', viewMax)
      finalGeos = flattenHierarchy(rootGeos, expandedGeos, statsGeos, taxonomy, viewMax)
    }

    let timelineCats = getTimelineDistribution(rawCats)
    let timelineGeos = getTimelineDistribution(rawGeos)
    const timelineTemplates = getTimelineDistribution(rawTemplates)

    if (taxonomy) {
      timelineCats = aggregateTimelineData(timelineCats, taxonomy, 'category')
      timelineGeos = aggregateTimelineData(timelineGeos, taxonomy, 'geo')
    }

    // If we used a limit, verify the exact min date from the filtered set
    if (limitCount > 0 && allFilteredDates.length > 0) {
      viewMin = allFilteredDates[0]
    }

    const start = new Date(viewMin)
    start.setHours(0, 0, 0, 0)
    const end = new Date(viewMax)
    end.setHours(23, 59, 59, 999)

    // Ensure range is not zero for the chart
    if (start.getTime() === end.getTime()) {
      start.setDate(start.getDate() - 1)
      end.setDate(end.getDate() + 1)
    }

    return {
      filteredCategories: finalCats,
      filteredGeos: finalGeos,
      filteredTemplates: statsTemplates,
      totalArticles: new Set([...rawCats, ...rawGeos, ...rawTemplates].map(e => e.title)).size,
      categoryTimeline: timelineCats,
      geoTimeline: timelineGeos,
      templateTimeline: timelineTemplates,
      minDate: start,
      maxDate: end,
      lastArticleDate: viewMax
    }
  }, [data, timeRange, taxonomy, expandedCategories, expandedGeos])

  const toggleCategory = (id: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleGeo = (id: string) => {
    const newExpanded = new Set(expandedGeos)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedGeos(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium">Processing full dataset...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">CSV Data Analysis</h1>
          <p className="text-muted-foreground">
            Analyzing {totalArticles.toLocaleString()} entries from the dataset
            {lastArticleDate && (
              <span className="ml-2">
                • Last article: {lastArticleDate.toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Time Period:</span>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-100">Last 100 Entries</SelectItem>
              <SelectItem value="last-250">Last 250 Entries</SelectItem>
              <SelectItem value="last-500">Last 500 Entries</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="2y">Last 2 Years</SelectItem>
              <SelectItem value="3y">Last 3 Years</SelectItem>
              <SelectItem value="4y">Last 4 Years</SelectItem>
              <SelectItem value="5y">Last 5 Years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6">
        <StatsTable
          title="By Category"
          stats={filteredCategories}
          timelineData={categoryTimeline}
          minDate={minDate}
          maxDate={maxDate}
          onToggleExpand={toggleCategory}
          expandedIds={expandedCategories}
          totalArticles={totalArticles}
          icon={
            <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
        />

        <StatsTable
          title="By Geo"
          stats={filteredGeos}
          timelineData={geoTimeline}
          minDate={minDate}
          maxDate={maxDate}
          onToggleExpand={toggleGeo}
          expandedIds={expandedGeos}
          totalArticles={totalArticles}
          icon={
            <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatsTable
          title="By Template"
          stats={filteredTemplates}
          timelineData={templateTimeline}
          minDate={minDate}
          maxDate={maxDate}
          totalArticles={totalArticles}
          icon={
            <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          }
        />
      </div>
    </div>
  )
}
