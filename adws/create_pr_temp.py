#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# Agregar el directorio adws al path
sys.path.insert(0, str(Path(__file__).parent))

from github import create_pull_request

title = "Refactor: migrate GitHub API and add challenge pages"
body = """## Summary
- Migrated GitHub API integration from gh CLI to Python requests library
- Added challenge pages (PITE and PITER) with registration forms
- Updated navigation to include challenges link
- Enhanced styling for challenge cards and forms

## Changes

### GitHub API Migration
The `adws/github.py` module has been completely refactored to use the Python `requests` library instead of the GitHub CLI (`gh`). This change provides:
- More control over API requests and error handling
- Better integration with Python code
- Reduced dependency on external CLI tools
- Support for authentication via PAT token in `.env`

Key changes:
- Replaced `run_gh_command()` with `make_github_request()` using requests
- Updated all GitHub operations (get issue, create PR, post comment, etc.)
- Added proper error handling and response parsing
- Updated environment variables to use `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME`

### Challenge Pages
Added three new HTML pages for user challenges:
- `retos.html` - Landing page showing available challenges (PITE and PITER)
- `pite-retos.html` - Registration form for PITE challenge
- `piter-retos.html` - Registration form for PITER challenge

Features:
- Responsive card layout for challenge selection
- Form validation for name, lastname, and GitHub username
- Consistent navigation across all pages
- Styling for forms and cards in `css/styles.css`

## Testing

### GitHub API Testing
```bash
# Run the test in github.py
python adws/github.py

# Or test with uv
uv run adws/github.py
```

### Web Pages Testing
1. Open `index.html` in browser
2. Click "Retos" in navigation
3. Verify challenge cards appear and are clickable
4. Click on each challenge card
5. Verify forms render correctly
6. Test form validation (try submitting empty fields)
7. Test on mobile viewport for responsiveness

### Environment Setup
Ensure `.env` contains:
```
GITHUB_REPO_OWNER=your-owner
GITHUB_REPO_NAME=your-repo
GITHUB_PAT=your-personal-access-token
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)
"""

try:
    pr_data = create_pull_request("main", title, body, base="main")
    print(f"\n✅ PR Created Successfully!")
    print(f"PR #{pr_data['number']}: {pr_data['url']}")
except Exception as e:
    print(f"❌ Error creating PR: {e}")
    sys.exit(1)
