# AGENTS.md

- For OpenSpec propose/apply/verify/archive workflows, use the local `openspec-git-discipline` skill to enforce proposal commits before apply and merge-before-archive discipline.

## Claude Code Mirror

`.claude/skills/`, `.claude/commands/`, and `.claude/agents/` are mirrors for
Claude Code's native discovery paths. Source of truth stays in
`.agents/skills/`, `.opencode/skills/`, `.opencode/commands/`, and
`.opencode/agent/`. When you edit a skill/command there, re-copy it into the
matching `.claude/` path by hand (or re-run the same copy step) — there's no
sync tooling, just keep the two copies aligned manually.
