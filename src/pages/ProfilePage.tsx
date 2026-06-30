import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/providers/trpc';
import {
  Bookmark,
  StickyNote,
  Settings,
  Loader2,
  Save,
  ChevronRight,
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const languages = [
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
  'C#',
]

const interests = [
  { value: 'web', label: 'Web Dev' },
  { value: 'ai-ml', label: 'AI/ML' },
  { value: 'devtools', label: 'DevTools' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'systems', label: 'Systems' },
  { value: 'data', label: 'Data Science' },
  { value: 'security', label: 'Security' },
  { value: 'blockchain', label: 'Blockchain' },
]

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth()

  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: recentViews, isLoading: recentViewsLoading, isError: recentViewsError, refetch: refetchRecentViews } = trpc.user.getRecentViews.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [anyError, setAnyError] = useState(false);





  // Aggregate errors
  useEffect(() => {
    if (profileError || recentViewsError) setAnyError(true);
  }, [profileError, recentViewsError]);

  const utils = trpc.useUtils();
  const retryAll = () => {
    utils.user.getProfile.invalidate();
    utils.user.getRecentViews.invalidate();
    setHasTimedOut(false);
    setAnyError(false);
  };

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.getProfile.invalidate()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const [selectedLangs, setSelectedLangs] = useState<string[]>([])
  const [expLevel, setExpLevel] = useState<string>('intermediate')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  // Sync with loaded profile
  useEffect(() => {
    if (profile?.profile) {
      setSelectedLangs(profile.profile.primaryLanguages || [])
      setExpLevel(profile.profile.experienceLevel || 'intermediate')
      setSelectedInterests(profile.profile.areasOfInterest || [])
    }
  }, [profile])

  const toggleLang = (lang: string) => {
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    )
  }

  const handleSave = () => {
    updateProfile.mutate({
      primaryLanguages: selectedLangs,
      experienceLevel: expLevel as 'beginner' | 'intermediate' | 'advanced',
      areasOfInterest: selectedInterests,
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-20 text-center">
        <User size={32} className="mx-auto mb-4 text-[#333333]" />
        <h2 className="text-lg font-bold text-[#E2E2E2] mb-2">Sign in to view your profile</h2>
        <p className="text-sm text-[#8B8B8B] mb-6">Manage your skills, bookmarks, and preferences.</p>
        <a href="/login" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E2E2E2] text-[#050505] text-sm font-medium rounded hover:bg-white transition-colors">Sign In</a>
      </div>
    );
  }

  if (hasTimedOut || anyError) {
    return (
      <Alert className="max-w-[720px] mx-auto my-8">
        <AlertTitle>{hasTimedOut ? 'Request timed out' : 'Error loading data'}</AlertTitle>
        <AlertDescription>Please try again.</AlertDescription>
        <Button onClick={retryAll} className="mt-4">Retry</Button>
      </Alert>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-[#111111] border border-[#222222] flex items-center justify-center overflow-hidden">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name || ''} className="w-full h-full object-cover" />
          ) : (
            <User size={24} className="text-[#555555]" />
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#E2E2E2]">
            {user?.name || 'Developer'}
          </h1>
          <p className="text-xs text-[#8B8B8B] font-mono">
            {user?.email || 'No email'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-4 text-center">
          <Bookmark size={16} className="mx-auto mb-2 text-[#4ADE80]" />
          <div className="text-lg font-bold text-[#E2E2E2] font-mono">
            {profile?.bookmarkCount || 0}
          </div>
          <div className="text-[10px] text-[#555555] font-mono uppercase tracking-wider">
            Bookmarks
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-4 text-center">
          <StickyNote size={16} className="mx-auto mb-2 text-[#EAB308]" />
          <div className="text-lg font-bold text-[#E2E2E2] font-mono">
            {profile?.noteCount || 0}
          </div>
          <div className="text-[10px] text-[#555555] font-mono uppercase tracking-wider">
            Notes
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-4 text-center">
          <Settings size={16} className="mx-auto mb-2 text-[#3B82F6]" />
          <div className="text-lg font-bold text-[#E2E2E2] font-mono">
            {expLevel}
          </div>
          <div className="text-[10px] text-[#555555] font-mono uppercase tracking-wider">
            Level
          </div>
        </div>
      </div>

      {/* Skills Settings */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-6 mb-6">
        <h2 className="text-sm font-bold text-[#E2E2E2] mb-6 flex items-center gap-2">
          <Settings size={14} />
          Skill Preferences
        </h2>

        {/* Languages */}
        <div className="mb-6">
          <label className="text-[10px] font-mono text-[#555555] uppercase tracking-wider block mb-3">
            Primary Languages
          </label>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => toggleLang(lang)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  selectedLangs.includes(lang)
                    ? 'bg-[#4ADE80] text-[#050505] font-medium'
                    : 'bg-[#111111] text-[#8B8B8B] border border-[#222222] hover:border-[#333333]'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div className="mb-6">
          <label className="text-[10px] font-mono text-[#555555] uppercase tracking-wider block mb-3">
            Experience Level
          </label>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map(
              (level) => (
                <button
                  key={level}
                  onClick={() => setExpLevel(level)}
                  className={`px-4 py-2 rounded text-xs font-mono capitalize transition-all ${
                    expLevel === level
                      ? 'bg-[#4ADE80] text-[#050505] font-medium'
                      : 'bg-[#111111] text-[#8B8B8B] border border-[#222222] hover:border-[#333333]'
                  }`}
                >
                  {level}
                </button>
              )
            )}
          </div>
        </div>

        {/* Interests */}
        <div className="mb-6">
          <label className="text-[10px] font-mono text-[#555555] uppercase tracking-wider block mb-3">
            Areas of Interest
          </label>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <button
                key={interest.value}
                onClick={() => toggleInterest(interest.value)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  selectedInterests.includes(interest.value)
                    ? 'bg-[#3B82F6] text-white font-medium'
                    : 'bg-[#111111] text-[#8B8B8B] border border-[#222222] hover:border-[#333333]'
                }`}
              >
                {interest.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all ${
            saved
              ? 'bg-[#22C55E] text-white'
              : 'bg-[#4ADE80] text-[#050505] hover:bg-[#22C55E]'
          } disabled:opacity-50`}
        >
          {updateProfile.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <>
              <Save size={14} />
              Saved!
            </>
          ) : (
            <>
              <Save size={14} />
              Save Preferences
            </>
          )}
        </button>
      </div>

      {/* Recent Views */}
      {recentViews && recentViews.length > 0 && (
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-6">
          <h2 className="text-sm font-bold text-[#E2E2E2] mb-4">
            Recently Viewed
          </h2>
          <div className="space-y-1">
            {[...new Map(recentViews.map((v) => [`${v.repoOwner}/${v.repoName}`, v])).values()]
              .slice(0, 10)
              .map((view) => (
                <Link
                  key={`${view.repoOwner}/${view.repoName}`}
                  to={`/repo/${view.repoOwner}/${view.repoName}`}
                  className="flex items-center justify-between px-3 py-2 rounded hover:bg-[#111111] transition-colors group"
                >
                  <span className="text-xs text-[#8B8B8B] group-hover:text-[#E2E2E2] font-mono">
                    {view.repoOwner}/
                    <span className="text-[#E2E2E2]">{view.repoName}</span>
                  </span>
                  <ChevronRight
                    size={12}
                    className="text-[#555555] group-hover:text-[#4ADE80]"
                  />
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
