"use client"

import { useMemo, useState } from "react"
import { Article, formatRelativeTime } from "@/lib/csv-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Clock, FileText, Globe, Tag } from "lucide-react"

interface RecentArticlesPanelProps {
    articles: Article[]
    referenceDate: Date
}

export function RecentArticlesPanel({ articles, referenceDate }: RecentArticlesPanelProps) {
    const [filter, setFilter] = useState("all")

    const displayArticles = useMemo(() => {
        let result = [...articles].sort((a, b) => b.date.getTime() - a.date.getTime())

        if (filter === "briefing") {
            result = result.filter(a => a.template.toLowerCase().includes("briefing"))
        } else if (filter === "longform") {
            result = result.filter(a => !a.template.toLowerCase().includes("briefing"))
        }

        return result.slice(0, 25)
    }, [articles, filter])

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Articles
                    <Badge variant="secondary" className="ml-2">
                        Last 25
                    </Badge>
                </CardTitle>
                <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-[400px]">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="longform">Longform</TabsTrigger>
                        <TabsTrigger value="briefing">Briefing</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {displayArticles.map((article, i) => (
                        <div
                            key={i}
                            className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                    {formatRelativeTime(article.date, referenceDate)}
                                </span>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {article.template}
                                    </Badge>
                                    {article.category && (
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <Tag className="w-3 h-3" />
                                            {article.category}
                                        </Badge>
                                    )}
                                    {article.geo && (
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <Globe className="w-3 h-3" />
                                            {article.geo}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <h3 className="font-medium leading-tight">{article.title}</h3>
                        </div>
                    ))}

                    {displayArticles.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No articles found matching the selected filter.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
