import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/providers/trpc';
import {
  Bookmark,
  BookmarkX,
  FolderOpen,
  Plus,
  StickyNote,
  Loader2,
  Search,
  X,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function BookmarksPage() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState<number | null>(null);
  const [editCollectionName, setEditCollectionName] = useState('');
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [anyError, setAnyError] = useState(false);

  // Timeout hook
  const useTimeout = (loading) => {
    useEffect(() => {
      if (loading) {
        const timer = setTimeout(() => setHasTimedOut(true), 15000);
        return () => clearTimeout(timer);
      }
    }, [loading]);
  };

  // Queries with enabled flag
  const { data: bookmarks, isLoading: bmLoading, isError: bmError, refetch: refetchBookmarks } = trpc.bookmark.list.useQuery(
    selectedCollection !== undefined ? { collectionId: selectedCollection } : undefined,
    { enabled: isAuthenticated, staleTime: 1000 * 30 }
  );
  useTimeout(bmLoading);

  const { data: collections, isLoading: colLoading, isError: colError, refetch: refetchCollections } = trpc.collection.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  useTimeout(colLoading);

  const { data: notes, isLoading: notesLoading, isError: notesError, refetch: refetchNotes } = trpc.note.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  useTimeout(notesLoading);

  // Aggregate errors
  useEffect(() => {
    if (bmError || colError || notesError) setAnyError(true);
  }, [bmError, colError, notesError]);

  const retryAll = () => {
    utils.bookmark.list.invalidate();
    utils.collection.list.invalidate();
    utils.note.list.invalidate();
    setHasTimedOut(false);
    setAnyError(false);
  };

  const createCollection = trpc.collection.create.useMutation({
    onSuccess: () => {
      utils.collection.list.invalidate()
      setNewCollectionName('')
      setShowNewCollection(false)
    },
  })

  const updateCollection = trpc.collection.update.useMutation({
    onSuccess: () => {
      utils.collection.list.invalidate()
      setEditingCollectionId(null)
    },
  })

  const deleteCollection = trpc.collection.delete.useMutation({
    onSuccess: (_, variables) => {
      utils.collection.list.invalidate()
      if (selectedCollection === variables.id) {
        setSelectedCollection(undefined)
      }
    },
  })

  const deleteBookmark = trpc.bookmark.delete.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  })

  const filteredBookmarks = bookmarks?.filter((bm) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      bm.repoOwner.toLowerCase().includes(q) ||
      bm.repoName.toLowerCase().includes(q)
    )
  })

  if (!isAuthenticated) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-20 text-center">
        <Bookmark size={32} className="mx-auto mb-4 text-[#333333]" />
        <h2 className="text-lg font-bold text-[#E2E2E2] mb-2">Sign in to save bookmarks</h2>
        <p className="text-sm text-[#8B8B8B] mb-6">Bookmark your favorite repositories and organize them into collections.</p>
        <a href="/login" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E2E2E2] text-[#050505] text-sm font-medium rounded hover:bg-white transition-colors">Sign In</a>
      </div>
    );
  }

  if (hasTimedOut || anyError) {
    return (
      <Alert className="max-w-[1200px] mx-auto my-8">
        <AlertTitle>{hasTimedOut ? 'Request timed out' : 'Error loading data'}</AlertTitle>
        <AlertDescription>Please try again.</AlertDescription>
        <Button onClick={retryAll} className="mt-4">Retry</Button>
      </Alert>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#E2E2E2] mb-1">
            Bookmarks
          </h1>
          <p className="text-sm text-[#8B8B8B]">
            {bookmarks?.length || 0} saved repositories
          </p>
        </div>
        <button
          onClick={() => setShowNewCollection(!showNewCollection)}
          className="flex items-center gap-2 px-4 py-2 bg-[#4ADE80] text-[#050505] text-sm font-medium rounded hover:bg-[#22C55E] transition-colors w-fit"
        >
          <Plus size={14} />
          New Collection
        </button>
      </div>

      {/* New Collection Form */}
      {showNewCollection && (
        <div className="mb-6 p-4 bg-[#0A0A0A] border border-[#222222] rounded-lg">
          <div className="flex gap-3">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name..."
              className="flex-1 px-3 py-2 bg-[#111111] border border-[#222222] rounded text-sm text-[#E2E2E2] placeholder-[#555555] focus:outline-none focus:border-[#4ADE80]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCollectionName.trim()) {
                  createCollection.mutate({ name: newCollectionName.trim() })
                }
              }}
            />
            <button
              onClick={() => {
                if (newCollectionName.trim()) {
                  createCollection.mutate({ name: newCollectionName.trim() })
                }
              }}
              className="px-4 py-2 bg-[#4ADE80] text-[#050505] text-sm font-medium rounded hover:bg-[#22C55E] transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Collections */}
        <div className="lg:w-60 flex-shrink-0">
          <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-4">
            <h3 className="text-[10px] font-mono text-[#555555] uppercase tracking-wider mb-3">
              Collections
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCollection(undefined)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors text-left ${
                  selectedCollection === undefined
                    ? 'bg-[#111111] text-[#4ADE80]'
                    : 'text-[#8B8B8B] hover:text-[#E2E2E2] hover:bg-[#111111]'
                }`}
              >
                <FolderOpen size={12} />
                All Bookmarks
              </button>
              {collections?.map((col) => (
                <div key={col.id} className="group">
                  {editingCollectionId === col.id ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        type="text"
                        value={editCollectionName}
                        onChange={(e) => setEditCollectionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editCollectionName.trim()) {
                            updateCollection.mutate({ id: col.id, name: editCollectionName.trim() })
                          }
                          if (e.key === 'Escape') setEditingCollectionId(null)
                        }}
                        autoFocus
                        className="flex-1 min-w-0 px-2 py-1 text-xs bg-[#0A0A0A] border border-[#4ADE80] rounded text-[#E2E2E2] focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (editCollectionName.trim()) {
                            updateCollection.mutate({ id: col.id, name: editCollectionName.trim() })
                          }
                        }}
                        className="p-1 text-[#4ADE80] hover:text-[#22C55E] flex-shrink-0"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => setEditingCollectionId(null)}
                        className="p-1 text-[#555555] hover:text-[#E2E2E2] flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button
                        onClick={() => setSelectedCollection(col.id)}
                        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors text-left ${
                          selectedCollection === col.id
                            ? 'bg-[#111111] text-[#4ADE80]'
                            : 'text-[#8B8B8B] hover:text-[#E2E2E2] hover:bg-[#111111]'
                        }`}
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: col.color || '#4ADE80' }}
                        />
                        <span className="truncate">{col.name}</span>
                      </button>
                      <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
                        <button
                          onClick={() => {
                            setEditingCollectionId(col.id)
                            setEditCollectionName(col.name)
                          }}
                          className="p-1 rounded text-[#555555] hover:text-[#8B8B8B] hover:bg-[#111111] transition-colors"
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          onClick={() => deleteCollection.mutate({ id: col.id })}
                          className="p-1 rounded text-[#555555] hover:text-[#EF4444] hover:bg-[#111111] transition-colors"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes Summary */}
          {notes && notes.length > 0 && (
            <div className="mt-4 bg-[#0A0A0A] border border-[#222222] rounded-lg p-4">
              <h3 className="text-[10px] font-mono text-[#555555] uppercase tracking-wider mb-3">
                Recent Notes
              </h3>
              <div className="space-y-2">
                {notes.slice(0, 5).map((note) => (
                  <Link
                    key={note.id}
                    to={`/repo/${note.repoOwner}/${note.repoName}`}
                    className="block text-xs text-[#8B8B8B] hover:text-[#E2E2E2] transition-colors truncate"
                  >
                    <div className="flex items-center gap-1.5">
                      <StickyNote size={10} />
                      <span className="truncate">{note.content}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookmarks..."
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#222222] rounded text-sm text-[#E2E2E2] placeholder-[#555555] focus:outline-none focus:border-[#4ADE80]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-[#E2E2E2]"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Bookmark Cards */}
          {bmLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-[#4ADE80] animate-spin" />
            </div>
          ) : filteredBookmarks && filteredBookmarks.length > 0 ? (
            <div className="space-y-3">
              {filteredBookmarks.map((bm) => {
                const hasNote = notes?.some(
                  (n) =>
                    n.repoOwner === bm.repoOwner && n.repoName === bm.repoName
                )
                return (
                  <div
                    key={bm.id}
                    className="group bg-[#0A0A0A] border border-[#222222] rounded-lg p-4 hover:border-[#333333] transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <Link
                        to={`/repo/${bm.repoOwner}/${bm.repoName}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[#E2E2E2] hover:text-[#4ADE80] transition-colors">
                            {bm.repoOwner}/
                            <span className="font-bold">{bm.repoName}</span>
                          </span>
                          {hasNote && (
                            <StickyNote
                              size={12}
                              className="text-[#EAB308] flex-shrink-0"
                            />
                          )}
                        </div>
                        {bm.repoData && typeof bm.repoData === 'object' && (
                          <div className="flex items-center gap-4 text-xs text-[#555555]">
                            {(bm.repoData as any).stars !== undefined && (
                              <span>
                                {(bm.repoData as any).stars.toLocaleString()}{' '}
                                stars
                              </span>
                            )}
                            {(bm.repoData as any).language && (
                              <span>{(bm.repoData as any).language}</span>
                            )}
                          </div>
                        )}
                      </Link>
                      <button
                        onClick={() => deleteBookmark.mutate({ id: bm.id })}
                        className="p-1.5 rounded hover:bg-[#111111] text-[#555555] hover:text-[#EF4444] transition-colors flex-shrink-0 ml-2"
                      >
                        <BookmarkX size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <Bookmark size={32} className="mx-auto mb-4 text-[#333333]" />
              <p className="text-sm text-[#8B8B8B] mb-2">
                {searchQuery ? 'No matching bookmarks' : 'No bookmarks yet'}
              </p>
              {!searchQuery && (
                <p className="text-xs text-[#555555]">
                  Start exploring and bookmark repositories you find interesting.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
