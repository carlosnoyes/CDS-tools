---
name: new-skill
description: Design and write a new Claude Code skill (slash command) for this project. Follows the research → environment inventory → tool surface → write process.
argument-hint: [skill-name] [what it should do]
allowed-tools: Read, Write, Glob, Grep, Bash, WebSearch, WebFetch
---

# New Skill

Your job is to design and write a well-grounded Claude Code skill (slash command) for this project. A good skill is grounded in reality — it knows the exact file paths, tool names, API shapes, and project conventions before writing instructions. Do not write the skill from general knowledge alone.

The user has asked for: **$ARGUMENTS**

If no arguments were given, ask the user what the skill should do before proceeding.

## Step 1 — Understand the skill format

Use the `claude-code-guide` agent (via the Task tool) to look up:

- Skill file location (project-level vs user-level)
- Required and optional frontmatter fields (`name`, `description`, `allowed-tools`, `argument-hint`, `disable-model-invocation`, etc.)
- How `allowed-tools` works — especially how to reference MCP tools by name
- Any other format details relevant to what this skill will need to do

## Step 2 — Inventory the environment

Read the existing project skills to understand conventions and style:

- Read all files matching `.claude/skills/*/SKILL.md`
- Read `.claude/settings.json` to see which MCP servers are configured and their names

If the skill will use an MCP, note the exact server name from `settings.json` — MCP tool names in `allowed-tools` follow the pattern `mcp__<server-name>__<tool-name>`.

## Step 3 — Research the tool surface

If the skill will call specific tools (MCP tools, CLI commands, APIs), look them up before writing:

- For MCP servers: search for the package name + "tools" or "MCP" to find the exact tool names and parameters
- For CLI tools: check `--help` or search for documentation
- For APIs: fetch the relevant docs

**Do not write skill instructions that reference tool names you haven't verified exist.**

## Step 4 — Write the skill

Create the skill at `.claude/skills/<skill-name>/SKILL.md`.

A good skill has:

- **Frontmatter**: `name`, `description` (clear enough to trigger auto-loading when relevant), `allowed-tools` (narrow — only what's needed), `argument-hint` if it takes arguments
- **Grounded steps**: each step references real file paths, real tool names, real parameter names — nothing invented
- **Project context baked in**: IDs, conventions, known gotchas that Claude would otherwise have to rediscover
- **A report step**: the skill should summarize what it did so the output is useful, not silent
- **Guardrails**: explicit rules about what NOT to do (don't guess, don't overwrite, don't reformat, etc.)

## Step 5 — Confirm

Tell the user:
- Where the skill file was created
- How to invoke it (e.g. `/skill-name`)
- A one-sentence summary of what it does
- Any caveats or things that may need manual adjustment
