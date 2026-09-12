# Git & GitHub Rules — SyndicateBrain 24h Build

Everyone reads this once before W0. It is four pages and it will save you four hours.

---

## 1. The mental model

Three different things get confused in hackathons. They are not the same thing:

| Thing | What it is | How often |
| :--- | :--- | :--- |
| **Commit** | A savepoint on *your own* branch. Costs nothing. Nobody else sees it. | Every ~20 min, or whenever something works |
| **Push** | Your commits leave your laptop and land on GitHub. Still nobody's problem but yours. | Immediately after every commit |
| **Merge** | Your work enters `main` and becomes everyone's problem. | Only when a task is green |

Your **checkpoint** is a commit, not a merge. Commit + push constantly — that is your undo history and your laptop-dies insurance. Merging is a completely separate decision.

> **Rule: `git commit && git push` every 20 minutes, no exceptions, even for broken code on your own branch.** A branch nobody has pushed is one spilled coffee away from being deleted work.

---

## 2. When to merge — the actual answer

**Akshath's instinct was "merge every hour no matter the progress." That is the wrong trigger, and here's why:** a time-triggered merge forces you to merge half-finished work. Half-finished work in `main` breaks `main`. `main` breaking at W11 costs the team 40 minutes. So a pure clock trigger manufactures the exact problem merging is supposed to prevent.

But the instinct behind it is right — long-lived branches are the #1 cause of 4 a.m. merge hell. So the rule is **task-triggered with a hard time ceiling:**

### The rule

> **Merge when a task is green. And no branch may live longer than 90 minutes, period.**
>
> If you hit 90 minutes and your task isn't green, that is not a reason to keep going — **it is a signal your task was too big.** Split it. Merge the half that works behind a flag or as dead-but-compiling code, branch again for the rest.

Why 90 and not 120: the original plan said 2 hours on a 24-hour clock. We have 16 working hours, so everything scales by ~0.65. 90 minutes.

### "Green" means exactly this, no interpretation

1. `npm run build` / `python -m brain.main` starts without error
2. The thing you built does the one thing it's supposed to do, once, by hand
3. You have not touched a file you don't own (see §4)
4. Your branch has `main` merged into it and the app still starts

That's it. Not "tested". Not "pretty". Four checks, ninety seconds.

### The merge cadence in practice

```
W1    schemas + mocks land        → everyone branches off this
W1-16 each person: branch → 60-90 min → PR → merged → branch again
```

You will each open roughly **8–12 PRs** over 16 hours. If you open 3, your branches are too big. If you open 30, you are spending more time on git than on code.

---

## 3. Branch commands — copy-paste these

### Start a task

```bash
git checkout main
git pull origin main          # ALWAYS. Never branch off a stale main.
git checkout -b harleen/T31-layout
```

Branch name is `<yourname>/<task-id>-<two-words>`. Lowercase. Never work on `main` directly. Never.

### While working

```bash
git add -A
git commit -m "T31: three-pane layout renders"
git push -u origin harleen/T31-layout      # first push
git push                                    # every push after
```

Commit message standard is the whole standard: **task ID, colon, one line, present tense.** `T31: status bar shows vault hash`. Nobody will ever read these except to answer "when did this break", so the task ID is the only part that truly matters.

### Finish a task — this order matters

```bash
git add -A && git commit -m "T31: done"
git push

git fetch origin
git merge origin/main         # bring main INTO your branch, resolve here
# ---> if there are conflicts, you fix them HERE, on your branch,
#      where breaking things costs nobody anything
npm run build                 # still works? good.
git push

gh pr create --fill           # or open it in the GitHub web UI
```

Then message the group: `T31 PR up`. Then **immediately branch for your next task off `main`** — do not sit idle waiting for the merge.

### Akshath merges it

```bash
gh pr merge <n> --squash --delete-branch
```

**Squash merges only.** One task = one commit on `main`. History stays readable, reverting a bad task is one command.

---

## 4. The rule that actually prevents conflicts

**Merge conflicts happen when two people edit the same file. So nobody edits a file they don't own.**

| Owner | Owns exclusively |
| :--- | :--- |
| **Akshath** | `brain/schemas.py`, `brain/mocks.py`, `brain/main.py`, `brain/guard.py`, `brain/llm/`, `brain/agents/`, `web/src/graph/engine.ts`, `web/src/graph/styles.ts`, `web/src/timeline/`, `CLAUDE.md`, `README.md` |
| **Harleen** | `web/src/styles/`, `web/src/layout/`, `web/src/editor/`, `web/src/tree/`, `web/src/search/` |
| **Hermaine** | `brain/graph/`, `brain/analytics/`, `brain/export/` |
| **AKTA** | `brain/resolve/`, `web/src/inspector/` |
| **Shourya** | `brain/vault.py`, `brain/ingest/`, `brain/cdr/`, `brain/prefilter/` |
| **Mehul** | `data/`, `web/src/panels/centrality/`, `web/src/states/` |

**Need a change in someone else's file? Turn your chair and ask them. They make it.** Ten seconds of asking beats forty minutes of untangling a conflict at hour 13.

`brain/schemas.py` is Akshath's alone. Everyone reads it constantly; only he writes it. If the contract changes he says it out loud to the whole room.

**New file? Put it in a directory you own.** If it genuinely doesn't belong to anyone, ask Akshath — he assigns it an owner before you write a line.

---

## 5. Hard rules, no discussion

1. **`main` is always demo-able.** If you break `main`, dropping everything to fix it is your top priority, above whatever you were doing.
2. **No force-push to `main`. Ever.** No exceptions, no "but I just need to".
3. **No force-push to a shared branch.** Your own branch that only you touch, fine.
4. **No rebase gymnastics after W8.** `git merge origin/main` into your branch. It makes uglier history and it always works. Interactive rebase at hour 13 with no sleep is how repos die.
5. **Akshath is the only person who merges PRs.** Everyone else opens them. This is not about trust, it's about `main` having exactly one gatekeeper.
6. **Never `git checkout .` or `git reset --hard` to "clean up".** You will delete two hours of someone's work. If you think you need it, ask first.
7. **`.gitignore` from W0:** `node_modules/`, `__pycache__/`, `.venv/`, `*.duckdb`, `vaults/`, `.DS_Store`, `dist/`, `*.pdf` (except fixtures). Nobody commits a 900MB model blob.

---

## 6. When it goes wrong

**"I have a conflict and I don't understand it."** Don't guess. Don't accept-all-theirs. `git merge --abort`, then find the file's owner — by §4 there is exactly one — and let them resolve it. 

**"I committed to `main` by accident."**
```bash
git branch mysave              # save your work FIRST
git reset --hard origin/main   # only safe because you just saved
git checkout mysave
```

**"I need someone's unmerged work."** You almost certainly don't — that's what mocks are for. If you truly do: `git fetch origin && git merge origin/their-branch` into *your* branch. Never into `main`.

**"`main` is broken and we're 30 minutes from demo."**
```bash
git log --oneline -10          # find the last known-good squash commit
git revert <bad-commit>        # revert, don't reset — reset loses other people's work
```
This is why squash merges matter: one task = one commit = one clean revert.

---

## 7. The 60-second pre-demo checklist

At W15, on the demo laptop only:

```bash
git checkout main && git pull origin main
git status              # must say "nothing to commit, working tree clean"
git log --oneline -5    # confirm the last 5 merges are what you expect
make dev                # starts clean
```

Then wifi off, and don't touch git again.
