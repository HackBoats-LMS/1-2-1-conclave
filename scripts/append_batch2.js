const fs = require('fs');
const path = require('path');

// 1. Update progress.json
const progressPath = path.join('.audit', 'progress.json');
let progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

const batch2Files = [
  'app/admin/AdminArchiveSection.tsx',
  'app/admin/AdminAutoShiftingManager.tsx',
  'app/admin/AdminLiveReferralsClient.tsx',
  'app/admin/AdminPinModal.tsx',
  'app/admin/archive/page.tsx'
];

let findingsCountMap = {
  'app/admin/AdminArchiveSection.tsx': 1
};

progress = progress.map(item => {
  if (batch2Files.includes(item.file_path)) {
    return { ...item, status: 'completed', findings_count: findingsCountMap[item.file_path] || 0 };
  }
  return item;
});

fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));

// 2. Append to master_optimization_report.md
const reportPath = path.join('.audit', 'master_optimization_report.md');
const newFinding = `
### [SEVERITY: HIGH] - app/admin/AdminArchiveSection.tsx (Lines 281-286 & 316-320)
- **Problem Type:** Chatty / Blocking Clientside Rendering (O(N) search on un-debounced input)
- **Root Cause:** When an event is "drilled down", the app fetches ALL users from the API and stores them in React state. The search input filters this massive array on every single keystroke synchronously (\`onChange\`), freezing the browser's main thread and causing severe input lag (jank) for large member lists.
- **Original Code:**
\`\`\`tsx
    <input
      type="text"
      placeholder="Search members..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      // ...
    />
    // ...
    {expandedUsers.filter(u => {
      const q = searchQuery.toLowerCase();
      return u.Name?.toLowerCase().includes(q) || u.Email?.toLowerCase().includes(q);
    }).map(...)}
\`\`\`
- **Optimized Code:**
\`\`\`tsx
    // 1. Wrap the filter logic in useMemo to prevent re-filtering on unrelated renders
    // 2. Use React 18 useTransition or a debounce hook for the input to keep the UI thread unblocked
    import { useTransition, useMemo } from 'react';

    const [isPending, startTransition] = useTransition();
    const [inputValue, setInputValue] = useState("");
    const [deferredQuery, setDeferredQuery] = useState("");

    const handleSearch = (e) => {
      setInputValue(e.target.value);
      startTransition(() => {
        setDeferredQuery(e.target.value.toLowerCase());
      });
    };

    const filteredUsers = useMemo(() => {
      if (!deferredQuery) return expandedUsers;
      return expandedUsers.filter(u => 
        u.Name?.toLowerCase().includes(deferredQuery) || 
        u.Email?.toLowerCase().includes(deferredQuery)
      );
    }, [expandedUsers, deferredQuery]);
\`\`\`
- **Performance Impact:** Eliminates main-thread blocking by deferring the heavy O(N) array filter, ensuring 60fps typing responsiveness regardless of archive directory size.
`;

fs.appendFileSync(reportPath, newFinding);
console.log('Batch 2 completed');
