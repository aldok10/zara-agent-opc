# .gitignore Templates by Stack

## Go

```gitignore
# Binary output
/bin/
/dist/
*.exe
*.dll
*.so
*.dylib

# Test and coverage
*.test
*.out
coverage.html

# Vendor (if not committed)
/vendor/

# IDE
.idea/
.vscode/
*.swp
```

## Node.js / TypeScript

```gitignore
node_modules/
dist/
build/
.next/
.nuxt/
.output/

# Env and secrets
.env
.env.local
.env.*.local

# Logs and debug
*.log
npm-debug.log*

# Coverage
coverage/
.nyc_output/

# OS
.DS_Store
Thumbs.db
```

## Python

```gitignore
__pycache__/
*.py[cod]
*$py.class
*.so

# Virtual environments
.venv/
venv/
env/

# Distribution
dist/
build/
*.egg-info/

# Testing
.pytest_cache/
.coverage
htmlcov/
.mypy_cache/
.ruff_cache/
```

## Java / Kotlin

```gitignore
# Build output
target/
build/
out/
*.class
*.jar
*.war

# Gradle
.gradle/
gradle-app.setting

# IDE
.idea/
*.iml
.settings/
.classpath
.project

# Logs
*.log
hs_err_pid*
```

## Universal (add to all projects)

```gitignore
# Secrets
*.pem
*.key
*.p12
.env*
!.env.example

# OS artifacts
.DS_Store
Thumbs.db
*~

# Editor
.idea/
.vscode/settings.json
*.swp
*.swo
```
