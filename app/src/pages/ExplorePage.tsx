import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import RepoCard from '@/components/RepoCard'
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  Star,
  Clock,
  Code2,
  X,
  Loader2,
  ChevronDown,
} from 'lucide-react'

const languages = [
  'All',
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'Go',
  'Rust',
  'Ruby',
  'PHP',
  'C++',
  'Swift',
  'Kotlin',
]

const sortOptions = [
  { value: 'stars', label: 'Most Stars', icon: Star },
  { value: 'updated', label: 'Recently Updated', icon: Clock },
  { value: 'forks', label: 'Most Forks', icon: TrendingUp },
]

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [selectedLang, setSelectedLang] = useState(
    searchParams.get('lang') || 'All'
  )
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'stars')
  const [showFilters, setShowFilters] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [page, setPage] = useState(1)
  const [allRepos, setAllRepos] = useState<any[]>([])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  // Update URL params and reset page when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (selectedLang !== 'All') params.set('lang', selectedLang)
    if (sortBy !== 'stars') params.set('sort', sortBy)
    setSearchParams(params, { replace: true })
    setPage(1)
    setAllRepos([])
  }, [debouncedQuery, selectedLang, sortBy])

  const isTrending = searchParams.get('trending') === 'true'

  // Search repos
  const {
    data: searchResults,
    isLoading: searching,
    isError: searchError,
    error: searchErrorObj,
    refetch: refetchSearch,
  } = trpc.github.searchRepos.useQuery(
    {
      query: debouncedQuery || 'stars:>100',
      language: selectedLang === 'All' ? undefined : selectedLang,
      sort: sortBy,
      order: 'desc',
      perPage: 30,
      page,
    },
    { staleTime: 1000 * 60 * 5, enabled: !isTrending || !!debouncedQuery, retry: false }
  );

  // Timeout handling for search query
  const [searchTimeoutError, setSearchTimeoutError] = useState<string | null>(null);
  useEffect(() => {
    if (searching) {
      const timer = setTimeout(() => {
        setSearchTimeoutError('Request timed out after 15 seconds');
      }, 15000);
      return () => clearTimeout(timer);
    } else {
      setSearchTimeoutError(null);
    }
  }, [searching]);

  // Accumulate pages for load-more
  useEffect(() => {
    if (!isTrending && searchResults?.items) {
      if (page === 1) {
        setAllRepos(searchResults.items)
      } else {
        setAllRepos((prev) => {
          const existingIds = new Set(prev.map((r) => r.id))
          const newItems = searchResults.items.filter((r) => !existingIds.has(r.id))
          return [...prev, ...newItems]
        })
      }
    }
  }, [searchResults, page, isTrending])

  // Trending repos
  const { data: trendingRepos, isLoading: trendingLoading, refetch: refetchTrending } =
      trpc.github.getTrending.useQuery(
        {
          language: selectedLang === 'All' ? undefined : selectedLang,
          since: 'weekly',
        },
        { staleTime: 1000 * 60 * 30, enabled: isTrending && !debouncedQuery }
      );
    // Timeout handling for trending query
    const [trendingTimeoutError, setTrendingTimeoutError] = useState<string | null>(null);
    useEffect(() => {
      if (trendingLoading) {
        const timer = setTimeout(() => {
          setTrendingTimeoutError('Trending request timed out after 15 seconds');
        }, 15000);
        return () => clearTimeout(timer);
      } else {
        setTrendingTimeoutError(null);
      }
    }, [trendingLoading]);

  const repos = isTrending && !debouncedQuery ? trendingRepos : allRepos
  const isLoading = isTrending && !debouncedQuery ? trendingLoading : (searching && page === 1)
  const isLoadingMore = searching && page > 1
  const hasMore = !isTrending && searchResults?.totalCount
    ? allRepos.length < searchResults.totalCount
    : false

  // Bookmarks
  const { data: bookmarks } = trpc.bookmark.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  })
  const utils = trpc.useUtils()

  const bookmarkSet = useMemo(() => {
    const set = new Set<string>()
    bookmarks?.forEach((b) => set.add(`${b.repoOwner}/${b.repoName}`))
    return set
  }, [bookmarks])

  const createBookmark = trpc.bookmark.create.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  })
  const deleteBookmark = trpc.bookmark.delete.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  })

  const handleBookmarkToggle = (repo: any) => {
    if (!isAuthenticated) return
    const existing = bookmarks?.find(
      (b) => b.repoOwner === repo.owner && b.repoName === repo.name
    )
    if (existing) {
      deleteBookmark.mutate({ id: existing.id })
    } else {
      createBookmark.mutate({
        repoOwner: repo.owner,
        repoName: repo.name,
        repoData: {
          stars: repo.stars,
          forks: repo.forks,
          language: repo.language,
          description: repo.description,
        },
      })
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#E2E2E2] mb-2">
          {isTrending && !debouncedQuery ? 'Trending Repositories' : 'Explore'}
        </h1>
        <p className="text-sm text-[#8B8B8B]">
          {isTrending && !debouncedQuery
            ? 'The most popular repositories this week'
            : 'Search and discover open-source repositories'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repositories..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#222222] rounded text-sm text-[#E2E2E2] placeholder-[#555555] focus:outline-none focus:border-[#4ADE80] transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-[#E2E2E2]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 border rounded text-sm transition-colors ${
            showFilters
              ? 'border-[#4ADE80] text-[#4ADE80] bg-[#4ADE80]/5'
              : 'border-[#222222] text-[#8B8B8B] hover:text-[#E2E2E2] hover:border-[#333333]'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-[#0A0A0A] border border-[#222222] rounded-lg">
          {/* Language filter */}
          <div className="mb-4">
            <label className="text-[10px] font-mono text-[#555555] uppercase tracking-wider block mb-2">
              Language
            </label>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                    selectedLang === lang
                      ? 'bg-[#4ADE80] text-[#050505] font-medium'
                      : 'bg-[#111111] text-[#8B8B8B] border border-[#222222] hover:border-[#333333] hover:text-[#E2E2E2]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="text-[10px] font-mono text-[#555555] uppercase tracking-wider block mb-2">
              Sort By
            </label>
            <div className="flex gap-2">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                    sortBy === opt.value
                      ? 'bg-[#4ADE80] text-[#050505] font-medium'
                      : 'bg-[#111111] text-[#8B8B8B] border border-[#222222] hover:border-[#333333]'
                  }`}
                >
                  <opt.icon size={12} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {!isLoading && repos && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-[#555555] font-mono">
            {repos.length} result{repos.length !== 1 ? 's' : ''}
            {searchResults?.totalCount
              ? ` of ${searchResults.totalCount.toLocaleString()}`
              : ''}
          </span>
        </div>
      )}

      {/* Repo Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-[#4ADE80] animate-spin" />
        </div>
      ) : repos && repos.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                isBookmarked={bookmarkSet.has(`${repo.owner}/${repo.name}`)}
                onBookmarkToggle={() => handleBookmarkToggle(repo)}
                showActions={isAuthenticated}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isLoadingMore}
                className="flex items-center gap-2 px-6 py-2.5 border border-[#222222] rounded text-sm text-[#8B8B8B] hover:text-[#E2E2E2] hover:border-[#333333] disabled:opacity-50 transition-colors"
              >
                {isLoadingMore ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ChevronDown size={14} />
                )}
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <Code2 size={32} className="mx-auto mb-4 text-[#333333]" />
          <p className="text-sm text-[#8B8B8B] mb-2">
            No repositories found
          </p>
          <p className="text-xs text-[#555555]">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  )
}
