# Git Commands to Push Changes to Main

## 📋 Step-by-Step Commands

### 1. Check Current Status
```bash
git status
```
This shows which files have been modified, added, or deleted.

### 2. Check Current Branch
```bash
git branch
```
Make sure you're on the `main` branch (or `master`). If not, switch:
```bash
git checkout main
# or
git checkout master
```

### 3. Add All Changes
```bash
# Add all modified and new files
git add .

# OR add specific files/directories
git add server/
git add client/
git add *.md
```

### 4. Commit Changes
```bash
git commit -m "Add S3 video upload/streaming and delete course feature

- Add S3 video upload functionality with presigned URLs
- Add S3 video streaming with enrollment verification
- Add delete course feature for educators
- Support both YouTube and S3 videos (backward compatible)
- Add progress tracking for both video types
- Update frontend: AddCourse, EditCourse, MyCourses, Player
- Update backend: video routes, controllers, S3 config"
```

### 5. Push to Main Branch
```bash
# If main branch exists
git push origin main

# If master branch exists
git push origin master

# If pushing for the first time or setting upstream
git push -u origin main
```

## 🔄 Complete Sequence (Copy & Paste)

```bash
# 1. Check status
git status

# 2. Check branch
git branch

# 3. Add all changes
git add .

# 4. Commit
git commit -m "Add S3 video upload/streaming and delete course feature"

# 5. Push to main
git push origin main
```

## ⚠️ Important Notes

### If You're Not on Main Branch
```bash
# Switch to main
git checkout main

# Or create and switch to main
git checkout -b main
```

### If You Have Uncommitted Changes on Another Branch
```bash
# Option 1: Stash changes, switch, apply
git stash
git checkout main
git stash pop

# Option 2: Commit on current branch, then merge
git commit -m "Your message"
git checkout main
git merge your-branch-name
```

### If Remote Main is Ahead
```bash
# Pull latest changes first
git pull origin main

# Resolve any conflicts, then push
git push origin main
```

### Force Push (⚠️ Use with Caution)
```bash
# Only if you're sure and working alone
git push --force origin main
```

## 📝 Alternative: Create a Feature Branch First

If you prefer to work on a feature branch:

```bash
# Create and switch to feature branch
git checkout -b feature/s3-video-upload

# Add and commit
git add .
git commit -m "Add S3 video upload/streaming and delete course feature"

# Push feature branch
git push origin feature/s3-video-upload

# Then merge to main (on GitHub/GitLab or locally)
git checkout main
git merge feature/s3-video-upload
git push origin main
```

## ✅ Verify After Push

```bash
# Check remote status
git status

# View recent commits
git log --oneline -5

# Verify remote branch
git branch -r
```

## 📜 View Commits in a Branch

### View Commits in Current Branch
```bash
# Show all commits (detailed)
git log

# Show commits in one line (compact)
git log --oneline

# Show last 10 commits
git log --oneline -10

# Show commits with graph
git log --oneline --graph

# Show commits with author and date
git log --oneline --author --date=short
```

### View Commits in Specific Branch
```bash
# View commits in a branch (without switching)
git log branch-name

# View commits in one line
git log branch-name --oneline

# View last 5 commits
git log branch-name --oneline -5

# Compare commits between two branches
git log main..branch-name --oneline

# Show commits that are in branch-name but not in main
git log main..branch-name
```

### View Commits in Remote Branch
```bash
# View commits in remote branch
git log origin/branch-name --oneline

# View commits in remote main
git log origin/main --oneline
```

### View Commits with File Changes
```bash
# Show commits with files changed
git log --stat

# Show commits with actual code changes
git log -p

# Show commits for specific file
git log --oneline -- filename.txt
```

### Useful Log Formats
```bash
# Custom format: hash, author, date, message
git log --pretty=format:"%h - %an, %ar : %s"

# Show commits with branch names
git log --oneline --decorate --graph --all

# Show commits in a date range
git log --since="2024-01-01" --until="2024-12-31" --oneline
```

## 🗑️ Delete a Branch

### Delete Local Branch

```bash
# Delete a branch (if already merged)
git branch -d branch-name

# Force delete a branch (even if not merged) ⚠️
git branch -D branch-name

# Example: Delete feature branch
git branch -d feature/s3-video-upload
```

**Important:** You cannot delete the branch you're currently on. Switch to another branch first:
```bash
# Switch to main first
git checkout main

# Then delete the branch
git branch -d branch-name
```

### Delete Remote Branch

```bash
# Delete remote branch
git push origin --delete branch-name

# Alternative syntax
git push origin :branch-name

# Example: Delete remote feature branch
git push origin --delete feature/s3-video-upload
```

### Delete Both Local and Remote Branch

```bash
# 1. Switch to main
git checkout main

# 2. Delete local branch
git branch -d branch-name

# 3. Delete remote branch
git push origin --delete branch-name
```

### List All Branches (Local & Remote)

```bash
# List local branches
git branch

# List remote branches
git branch -r

# List all branches (local + remote)
git branch -a

# List branches with last commit info
git branch -v

# List branches merged into current branch
git branch --merged

# List branches NOT merged into current branch
git branch --no-merged
```

### Clean Up Remote Tracking Branches

```bash
# Remove remote tracking branches that no longer exist on remote
git remote prune origin

# Or fetch with prune
git fetch --prune
```

## 🎯 Quick One-Liner (If Already on Main)

```bash
git add . && git commit -m "Add S3 video upload/streaming and delete course feature" && git push origin main
```

---

**Note:** Replace `main` with `master` if your repository uses `master` as the default branch.

