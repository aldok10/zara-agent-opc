---
description: Quick standup — what happened, what's next, any blockers
---

Generate a quick standup update based on my recent activity.

Check:
!`git log --oneline --since="yesterday" --author="$(git config user.name)"`
!`git diff --stat`
!`git stash list`

Format as:
- **Done**: what was completed (from git log)
- **Doing**: what's in progress (from unstaged changes, stash)
- **Next**: suggest what to tackle next (from context/memory)
- **Blockers**: anything that seems stuck

Keep it to 3-5 bullet points total. No fluff.
