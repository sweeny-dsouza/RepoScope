import { useParams, Link } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react'
import { useRepoData } from '@/hooks/useRepoData';
import NotFound from '@/pages/NotFound';

// Adjust render order: loading first, then error, then not found

import { trpc } from '@/providers/trpc'
import HealthScoreRing from '@/components/HealthScoreRing'
import DifficultyBadge from '@/components/DifficultyBadge'
import { ArrowLeft, Star, GitFork, Eye, AlertCircle, ExternalLink, Bookmark, BookmarkCheck, Loader2, GitBranch, FileText, Circle, StickyNote, Plus, Pencil, Trash2, Check, X, } from 'lucide-react';

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = ['#4ADE80', '#3B82F6', '#EAB308', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4']

export default function RepoDetailPage() {
  const { owner, name } = useParams<{ owner: string; name: string }>();
  const { isAuthenticated } = useAuth();

  const {
    repo,
    repoLoading,
    languages,
    contributors,
    health,
    difficulty,
    aiSummary,
    aiError,
    commitActivity,
  } = useRepoData(owner, name);
  // Bookmarks
  const { data: bookmarks } = trpc.bookmark.list.useQuery(undefined, {
    enabled: isAuthenticated,
  })
  const utils = trpc.useUtils();

  // Record view (track repo page views)
  const recordView = trpc.user.recordView.useMutation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (isAuthenticated && owner && name) {
      recordView.mutate({ repoOwner: owner, repoName: name });
    }
  }, [owner, name, isAuthenticated, recordView]);

  const isBookmarked = bookmarks?.some(
    (b) => b.repoOwner === owner && b.repoName === name
  )

  const createBookmark = trpc.bookmark.create.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  })
  const deleteBookmark = trpc.bookmark.delete.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  })

  const handleBookmark = () => {
    if (!isAuthenticated || !owner || !name) return
    if (isBookmarked) {
      const bm = bookmarks?.find(
        (b) => b.repoOwner === owner && b.repoName === name
      )
      if (bm) deleteBookmark.mutate({ id: bm.id })
    } else {
      createBookmark.mutate({
        repoOwner: owner,
        repoName: name,
        repoData: repo
          ? {
              stars: repo.stars,
              forks: repo.forks,
              language: repo.language,
              description: repo.description,
            }
          : undefined,
      })
    }
  }

  // Notes
  const { data: notes } = trpc.note.list.useQuery(
    { repoOwner: owner!, repoName: name! },
    { enabled: isAuthenticated && !!owner && !!name }
  )
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteIsGoal, setNewNoteIsGoal] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editIsGoal, setEditIsGoal] = useState(false)

  const createNote = trpc.note.create.useMutation({
    onSuccess: () => {
      utils.note.list.invalidate()
      setNewNoteContent('')
      setNewNoteIsGoal(false)
    },
  })
  const updateNote = trpc.note.update.useMutation({
    onSuccess: () => {
      utils.note.list.invalidate()
      setEditingNoteId(null)
    },
  })
  const deleteNote = trpc.note.delete.useMutation({
    onSuccess: () => utils.note.list.invalidate(),
  })

  const startEditing = (note: { id: number; content: string; isLearningGoal: boolean | null }) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
    setEditIsGoal(note.isLearningGoal ?? false)
  }

  // Render loading state first
  if (repoLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="text-[#4ADE80] animate-spin" />
      </div>
    );
  }


  // Repository not found
  if (!repo && repoError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[#E2E2E2]">
        Repository data unavailable.
      </div>
    );
  }
  if (!repo) {
    return <NotFound />;
  }

  const langData = (languages || []).slice(0, 6).map((l, i) => ({
    name: l.name,
    value: l.percentage,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Back button */}
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-xs text-[#8B8B8B] hover:text-[#E2E2E2] transition-colors mb-6"
      >
        <ArrowLeft size={12} />
        Back to Explore
      </Link>

      {/* Header Block */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <img
              src={repo.ownerAvatar}
              alt={repo.owner}
              className="w-12 h-12 rounded-full border border-[#222222]"
            />
            <div>
              <h1 className="text-xl font-bold text-[#E2E2E2]">
                <span className="text-[#8B8B8B] font-normal">{repo.owner}/</span>
                {repo.name}
              </h1>
              <div className="flex items-center gap-3 mt-1.5">
                {repo.language && (
                  <span className="flex items-center gap-1 text-xs text-[#8B8B8B]">
                    <Circle size={8} fill="#4ADE80" stroke="none" />
                    {repo.language}
                  </span>
                )}
                {difficulty && (
                  <DifficultyBadge rating={difficulty.rating} size="sm" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleBookmark}
                className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium border transition-colors ${
                  isBookmarked
                    ? 'border-[#4ADE80] text-[#4ADE80] bg-[#4ADE80]/5'
                    : 'border-[#222222] text-[#8B8B8B] hover:text-[#E2E2E2] hover:border-[#333333]'
                }`}
              >
                {isBookmarked ? (
                  <BookmarkCheck size={14} />
                ) : (
                  <Bookmark size={14} />
                )}
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
            )}
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#E2E2E2] text-[#050505] rounded text-xs font-medium hover:bg-white transition-colors"
            >
              <ExternalLink size={12} />
              View on GitHub
            </a>
          </div>
        </div>

        <p className="text-sm text-[#8B8B8B] leading-relaxed mb-4">
          {repo.description || 'No description available.'}
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-[#222222]">
          <div className="flex items-center gap-1.5 text-sm text-[#8B8B8B]">
            <Star size={14} className="text-[#EAB308]" />
            <span className="font-mono text-[#E2E2E2]">
              {repo.stars.toLocaleString()}
            </span>
            stars
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[#8B8B8B]">
            <GitFork size={14} />
            <span className="font-mono text-[#E2E2E2]">
              {repo.forks.toLocaleString()}
            </span>
            forks
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[#8B8B8B]">
            <Eye size={14} />
            <span className="font-mono text-[#E2E2E2]">
              {repo.watchers.toLocaleString()}
            </span>
            watchers
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[#8B8B8B]">
            <AlertCircle size={14} />
            <span className="font-mono text-[#E2E2E2]">
              {repo.openIssues.toLocaleString()}
            </span>
            open issues
          </div>
          {repo.license && (
            <div className="flex items-center gap-1.5 text-sm text-[#8B8B8B]">
              <FileText size={14} />
              {repo.license}
            </div>
          )}
        </div>
      </div>

      {/* Health & Complexity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Health Score */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-6 flex flex-col items-center">
          <h3 className="text-[10px] font-mono text-[#555555] uppercase tracking-wider mb-4">
            Health Score
          </h3>
          {health ? (
            <HealthScoreRing score={health.score} />
          ) : (
            <Loader2 size={20} className="text-[#4ADE80] animate-spin" />
          )}
          {health && (
            <div className="mt-4 w-full space-y-1.5">
              {Object.entries(health.breakdown).map(([key, val]) => (
                <div key={key} className="flex justify-between text-[10px]">
                  <span className="text-[#555555] capitalize">{key}</span>
                  <span className="text-[#8B8B8B] font-mono">
                    {Math.round(val as number)}/
                    {key === 'activity'
                      ? 30
                      : key === 'issueResolution'
                      ? 25
                      : key === 'contributors'
                      ? 20
                      : key === 'documentation'
                      ? 15
                      : 10}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Summary */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-6 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-[#4ADE80]/10 flex items-center justify-center">
              <GitBranch size={12} className="text-[#4ADE80]" />
            </div>
            <h3 className="text-[10px] font-mono text-[#555555] uppercase tracking-wider">
              AI Insight
            </h3>
          </div>
          {aiSummary?.intelligence ? (
            <div className="space-y-4">
              {/* Intelligence Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { category: "Maturity", signal: aiSummary.intelligence.projectMaturity },
                  { category: "Community", signal: aiSummary.intelligence.communityStrength },
                  { category: "Difficulty", signal: aiSummary.intelligence.contributorDifficulty },
                  { category: "Risk", signal: aiSummary.intelligence.riskAssessment },
                  { category: "Growth", signal: aiSummary.intelligence.growthPotential },
                ].map((item, i) => {
                  const colorClass =
                    item.signal.level === "positive"
                      ? "border-[#4ADE80]/30 text-[#4ADE80] bg-[#4ADE80]/5"
                      : item.signal.level === "moderate"
                        ? "border-[#EAB308]/30 text-[#EAB308] bg-[#EAB308]/5"
                        : "border-[#EF4444]/30 text-[#EF4444] bg-[#EF4444]/5";
                  return (
                    <div
                      key={item.category}
                      className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2"
                      style={{
                        animationDuration: "300ms",
                        animationDelay: `${i * 80}ms`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <span className="text-[9px] font-mono text-[#555555] uppercase tracking-wider">
                        {item.category}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-mono border transition-all hover:scale-105 ${colorClass}`}
                      >
                        {item.signal.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Recommendation */}
              <div className="pt-1">
                <p className="text-[10px] font-mono text-[#555555] uppercase tracking-wider mb-1.5">
                  Recommendation
                </p>
                <p className="text-sm text-[#E2E2E2] leading-relaxed">
                  {aiSummary.intelligence.recommendation}
                </p>
              </div>

              {/* Contribution Analysis */}
              {aiSummary.contributionAnalysis && (
                <p className="text-xs text-[#8B8B8B] leading-relaxed border-l-2 border-[#4ADE80] pl-3">
                  {aiSummary.contributionAnalysis}
                </p>
              )}
            </div>
          ) : aiSummary ? (
            <div className="space-y-3">
              <p className="text-sm text-[#E2E2E2] leading-relaxed">
                {aiSummary.summary}
              </p>
              {aiSummary.contributionAnalysis && (
                <p className="text-xs text-[#8B8B8B] leading-relaxed border-l-2 border-[#4ADE80] pl-3">
                  {aiSummary.contributionAnalysis}
                </p>
              )}
            </div>
          ) : aiError ? (
            <p className="text-xs text-[#555555]">
              Analysis unavailable.
            </p>
          ) : (
            <div className="flex items-center gap-2 text-[#8B8B8B]">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Generating analysis...</span>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Commit Activity */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-6">
          <h3 className="text-[10px] font-mono text-[#555555] uppercase tracking-wider mb-4">
            Commit Activity (12 Weeks)
          </h3>
          {commitActivity && commitActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={commitActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                <XAxis
                  dataKey="week"
                  stroke="#555555"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  stroke="#555555"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid #222222',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                  }}
                  labelStyle={{ color: '#8B8B8B' }}
                />
                <Bar dataKey="total" fill="#4ADE80" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-[#555555]">
              No commit data available
            </div>
          )}
        </div>

        {/* Language Distribution */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-6">
          <h3 className="text-[10px] font-mono text-[#555555] uppercase tracking-wider mb-4">
            Language Distribution
          </h3>
          {langData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={langData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {langData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111111',
                      border: '1px solid #222222',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {langData.map((lang) => (
                  <div
                    key={lang.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: lang.color }}
                      />
                      <span className="text-[#8B8B8B]">{lang.name}</span>
                    </div>
                    <span className="text-[#E2E2E2] font-mono">
                      {lang.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-xs text-[#555555]">
              No language data available
            </div>
          )}
        </div>
      </div>

      {/* Top Contributors */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-6">
        <h3 className="text-[10px] font-mono text-[#555555] uppercase tracking-wider mb-4">
          Top Contributors
        </h3>
        {contributors && contributors.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {contributors.map((c) => (
              <div
                key={c.login}
                className="flex items-center gap-2 bg-[#111111] rounded-lg px-3 py-2"
              >
                <img
                  src={c.avatarUrl}
                  alt={c.login}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-xs text-[#E2E2E2]">{c.login}</span>
                <span className="text-[10px] text-[#555555] font-mono">
                  {c.contributions} commits
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#555555]">
            No contributor data available
          </p>
        )}
      </div>

      {/* Notes Section */}
      {isAuthenticated && (
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-6 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <StickyNote size={14} className="text-[#EAB308]" />
            <h3 className="text-[10px] font-mono text-[#555555] uppercase tracking-wider">
              My Notes
            </h3>
            <span className="text-[10px] text-[#555555] font-mono ml-auto">
              {notes?.length || 0} note{notes?.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Existing notes */}
          {notes && notes.length > 0 && (
            <div className="space-y-3 mb-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-[#111111] border border-[#222222] rounded p-3"
                >
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#333333] rounded text-sm text-[#E2E2E2] placeholder-[#555555] focus:outline-none focus:border-[#4ADE80] resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-[#8B8B8B] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editIsGoal}
                            onChange={(e) => setEditIsGoal(e.target.checked)}
                            className="accent-[#4ADE80]"
                          />
                          Learning goal
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-[#8B8B8B] hover:text-[#E2E2E2] transition-colors"
                          >
                            <X size={12} />
                            Cancel
                          </button>
                          <button
                            onClick={() => updateNote.mutate({ id: note.id, content: editContent, isLearningGoal: editIsGoal })}
                            disabled={!editContent.trim() || updateNote.isPending}
                            className="flex items-center gap-1 px-3 py-1 bg-[#4ADE80] text-[#050505] text-xs font-medium rounded hover:bg-[#22C55E] disabled:opacity-50 transition-colors"
                          >
                            {updateNote.isPending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-[#E2E2E2] leading-relaxed flex-1">{note.content}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEditing(note)}
                            className="p-1 rounded hover:bg-[#222222] text-[#555555] hover:text-[#8B8B8B] transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => deleteNote.mutate({ id: note.id })}
                            className="p-1 rounded hover:bg-[#222222] text-[#555555] hover:text-[#EF4444] transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      {note.isLearningGoal && (
                        <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-mono text-[#EAB308] bg-[#EAB308]/10 px-2 py-0.5 rounded">
                          Learning Goal
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* New note form */}
          <div className="space-y-2">
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Add a note about this repository..."
              rows={3}
              className="w-full px-3 py-2 bg-[#111111] border border-[#222222] rounded text-sm text-[#E2E2E2] placeholder-[#555555] focus:outline-none focus:border-[#4ADE80] resize-none transition-colors"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[#8B8B8B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newNoteIsGoal}
                  onChange={(e) => setNewNoteIsGoal(e.target.checked)}
                  className="accent-[#4ADE80]"
                />
                Mark as learning goal
              </label>
              <button
                onClick={() => {
                  if (newNoteContent.trim() && owner && name) {
                    createNote.mutate({
                      repoOwner: owner,
                      repoName: name,
                      content: newNoteContent.trim(),
                      isLearningGoal: newNoteIsGoal,
                    })
                  }
                }}
                disabled={!newNoteContent.trim() || createNote.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4ADE80] text-[#050505] text-xs font-medium rounded hover:bg-[#22C55E] disabled:opacity-50 transition-colors"
              >
                {createNote.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
