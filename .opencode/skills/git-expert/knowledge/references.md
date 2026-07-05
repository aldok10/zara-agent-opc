# Git Expert References

Subskills: branching, commits, learn-from-repo, versioning, worktrees, advanced-operations, github-workflows, security.

---

## Git Internals & Fundamentals

1. Chacon, S. & Straub, B. (2014). *Pro Git* (2nd ed.). Apress. https://git-scm.com/book/en/v2
2. Git Documentation -- Official Reference. https://git-scm.com/docs
3. Git Internals -- Plumbing and Porcelain. https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain
4. Git Objects (blobs, trees, commits, tags). https://git-scm.com/book/en/v2/Git-Internals-Git-Objects
5. Git References (HEAD, branches, remotes, tags). https://git-scm.com/book/en/v2/Git-Internals-Git-References
6. The Git DAG -- Understanding commit graphs. https://think-like-a-git.net/
7. Git source code repository. https://github.com/git/git
8. Git 2.45 release notes -- new features and improvements. https://github.blog/open-source/git/highlights-from-git-2-45/
9. Git 2.44 release notes. https://github.blog/open-source/git/highlights-from-git-2-44/
10. Git 2.43 release notes. https://github.blog/open-source/git/highlights-from-git-2-43/
11. Gitformat-pack -- Pack file format specification. https://git-scm.com/docs/gitformat-pack
12. Git transfer protocols. https://git-scm.com/book/en/v2/Git-Internals-Transfer-Protocols
13. Git maintenance and gc. https://git-scm.com/docs/git-maintenance
14. Git rerere -- reuse recorded resolution. https://git-scm.com/docs/git-rerere
15. Pope, T. (2008). *A Note About Git Commit Messages* -- commit message conventions. https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html

## Branching Strategies

16. Driessen, V. (2010). *A successful Git branching model* (Git Flow). https://nvie.com/posts/a-successful-git-branching-model/
17. GitHub Flow -- Lightweight branching model. https://docs.github.com/en/get-started/using-github/github-flow
18. Hammant, P. *Trunk-Based Development*. https://trunkbaseddevelopment.com/
19. OneFlow -- An alternative to Git Flow. https://www.endoflineblog.com/oneflow-a-git-branching-model-and-workflow
20. Release Flow -- Microsoft's branching strategy. https://devblogs.microsoft.com/devops/release-flow-how-we-do-branching-on-the-vsts-team/
21. GitLab Flow -- Combining feature-driven and environment branches. https://about.gitlab.com/topics/version-control/what-is-gitlab-flow/
22. Nx monorepo documentation -- affected commands and project graph. https://nx.dev/concepts/mental-model
23. Turborepo documentation -- caching and task orchestration. https://turbo.build/repo/docs
24. Feature flags as an alternative to long-lived branches. https://martinfowler.com/articles/feature-toggles.html
25. Ship/Show/Ask -- A branching strategy. https://martinfowler.com/articles/ship-show-ask.html
26. Google's monorepo branching at scale. https://cacm.acm.org/research/why-google-stores-billions-of-lines-of-code-in-a-single-repository/
27. Scaled trunk-based development with feature flags (LaunchDarkly). https://launchdarkly.com/blog/introduction-to-trunk-based-development/
28. Branch by abstraction pattern. https://martinfowler.com/bliki/BranchByAbstraction.html
29. Short-lived feature branches. https://trunkbaseddevelopment.com/short-lived-feature-branches/
30. Environment branching patterns. https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow

## Conventional Commits & Versioning

31. Conventional Commits specification v1.0.0. https://www.conventionalcommits.org/en/v1.0.0/
32. Semantic Versioning 2.0.0 specification. https://semver.org/
33. Keep a Changelog format. https://keepachangelog.com/en/1.1.0/
34. semantic-release -- automated version management. https://github.com/semantic-release/semantic-release
35. release-please -- Google's release automation. https://github.com/googleapis/release-please
36. changesets -- versioning for monorepos. https://github.com/changesets/changesets
37. commitlint -- lint commit messages. https://commitlint.js.org/
38. commitizen -- structured commit prompts. https://commitizen-tools.github.io/commitizen/
39. Angular commit message guidelines. https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit
40. Lerna versioning for monorepos. https://lerna.js.org/docs/features/version-and-publish
41. CalVer -- Calendar Versioning. https://calver.org/
42. git-cliff -- changelog generator from conventional commits. https://git-cliff.org/
43. auto -- automated releases based on semantic versioning. https://intuit.github.io/auto/
44. Standard Version (deprecated but influential). https://github.com/conventional-changelog/standard-version
45. Gitmoji -- emoji guide for commit messages. https://gitmoji.dev/

## GitHub & Collaboration

46. GitHub Actions documentation. https://docs.github.com/en/actions
47. GitHub Actions workflow syntax. https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
48. GitHub CLI (gh) reference. https://cli.github.com/manual/
49. CODEOWNERS documentation. https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
50. Branch protection rules. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-a-branch-protection-rule/about-protected-branches
51. GitHub rulesets (successor to branch protection). https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
52. GitHub Environments and deployment protection. https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
53. Pull request best practices. https://docs.github.com/en/pull-requests/collaborating-with-pull-requests
54. GitHub Actions reusable workflows. https://docs.github.com/en/actions/using-workflows/reusing-workflows
55. GitHub Actions composite actions. https://docs.github.com/en/actions/creating-actions/creating-a-composite-action
56. GitHub merge queue. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
57. GitHub Actions security hardening. https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions
58. act -- run GitHub Actions locally. https://github.com/nektos/act
59. GitHub API (REST and GraphQL). https://docs.github.com/en/rest
60. GitHub Apps vs Personal Access Tokens. https://docs.github.com/en/apps/overview
61. GitHub Copilot integration in workflows. https://docs.github.com/en/copilot
62. GitHub Projects and automation. https://docs.github.com/en/issues/planning-and-tracking-with-projects
63. GitHub Container Registry (ghcr.io). https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
64. GitHub Actions caching strategies. https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows
65. GitHub Dependabot documentation. https://docs.github.com/en/code-security/dependabot

## Advanced Operations

66. git bisect documentation. https://git-scm.com/docs/git-bisect
67. git-filter-repo -- rewrite repository history. https://github.com/newren/git-filter-repo
68. Git submodules documentation. https://git-scm.com/book/en/v2/Git-Tools-Submodules
69. Git subtree documentation. https://git-scm.com/book/en/v2/Git-Tools-Subtree-Merging
70. Git worktrees documentation. https://git-scm.com/docs/git-worktree
71. Husky -- modern Git hooks. https://typicode.github.io/husky/
72. Lefthook -- fast Git hooks manager. https://github.com/evilmartians/lefthook
73. Git LFS (Large File Storage). https://git-lfs.com/
74. Sparse checkout documentation. https://git-scm.com/docs/git-sparse-checkout
75. Partial clone (blobless, treeless). https://git-scm.com/docs/partial-clone
76. git stash -- advanced usage patterns. https://git-scm.com/docs/git-stash
77. git rebase interactive -- squashing, reordering, editing. https://git-scm.com/docs/git-rebase
78. git cherry-pick -- applying individual commits. https://git-scm.com/docs/git-cherry-pick
79. git reflog -- recovery operations. https://git-scm.com/docs/git-reflog
80. git bundle -- offline repository transport. https://git-scm.com/docs/git-bundle

## Security

81. Git commit signing with GPG. https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work
82. SSH commit signing (Git 2.34+). https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification
83. git-secrets -- prevent committing secrets. https://github.com/awslabs/git-secrets
84. gitleaks -- secret detection in git repos. https://github.com/gitleaks/gitleaks
85. truffleHog -- find leaked credentials. https://github.com/trufflesecurity/trufflehog
86. GitHub secret scanning. https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning
87. Dependabot security updates configuration. https://docs.github.com/en/code-security/dependabot/dependabot-security-updates
88. Git credential storage and helpers. https://git-scm.com/docs/gitcredentials
89. SLSA (Supply-chain Levels for Software Artifacts) for git. https://slsa.dev/
90. Sigstore -- keyless signing for git commits and artifacts. https://www.sigstore.dev/

## Performance & Scale

91. Microsoft Scalar -- Git at scale. https://github.com/microsoft/scalar
92. VFS for Git (Virtual File System). https://github.com/microsoft/VFSForGit
93. Git performance tuning -- pack.threads, core.preloadIndex. https://git-scm.com/docs/git-config
94. Commit graph and generation numbers. https://git-scm.com/docs/commit-graph
95. Multi-pack indexes. https://git-scm.com/docs/multi-pack-index
96. Shallow clones and depth limiting. https://git-scm.com/docs/shallow
97. Git protocol v2 -- performance improvements. https://git-scm.com/docs/protocol-v2
98. Filesystem monitor (fsmonitor). https://git-scm.com/docs/git-fsmonitor--daemon
99. Split index feature. https://git-scm.com/docs/git-update-index
100. git gc and pack optimization. https://git-scm.com/docs/git-gc
101. Large monorepo best practices (Meta, Google, Microsoft). https://engineering.fb.com/2014/01/07/core-infra/scaling-mercurial-at-facebook/
102. Git replace -- grafting history. https://git-scm.com/docs/git-replace
103. Git alternates -- sharing object databases. https://git-scm.com/docs/gitrepository-layout
104. Fetch negotiation algorithms. https://git-scm.com/docs/technical/pack-heuristics
105. Background maintenance scheduling. https://git-scm.com/docs/git-maintenance

---

Total: 105 references.
