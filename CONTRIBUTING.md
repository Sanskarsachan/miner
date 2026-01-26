# Contributing to CourseHarvester

Thank you for your interest in contributing to CourseHarvester! This document outlines how to get involved.

## How to Contribute

### 1. Report Bugs

If you find a bug, please:
1. Check if it's already been reported in [GitHub Issues](https://github.com/yourusername/course-harvester/issues)
2. Create a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if relevant
   - Your environment (OS, browser, file type)

### 2. Suggest Features

Have an idea? Open a GitHub Discussion:
1. Go to the [Discussions](https://github.com/yourusername/course-harvester/discussions) tab
2. Start a new discussion
3. Describe your feature and why it's valuable
4. Wait for community feedback

### 3. Improve Documentation

Documentation is always welcome:
1. Found a typo or unclear section?
2. Have a better explanation?
3. Simply edit the relevant `.md` file and submit a PR

### 4. Submit Code Changes

#### Setup Development Environment

```bash
# Clone the repo
git clone https://github.com/yourusername/course-harvester.git
cd course-harvester

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3001
```

#### Make Your Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. Make your changes with clear, descriptive commits:
   ```bash
   git commit -m "feat: add [feature name]
   
   - Bullet point 1
   - Bullet point 2"
   ```

3. Test locally:
   ```bash
   # Test the feature in the browser
   # Check for console errors
   # Test with different file types
   ```

4. Push to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```

5. Open a Pull Request with:
   - Clear title describing changes
   - Description of what changed and why
   - Any relevant issue numbers (#123)
   - Screenshots if UI changes

#### Code Standards

- **Style**: Follow existing code style (no formatter enforced yet)
- **Comments**: Add comments for complex logic
- **Functions**: Keep functions small and focused
- **Variables**: Use clear, descriptive names
- **Error Handling**: Always wrap API calls in try-catch

Example:
```javascript
// Extract courses from Gemini response with robust parsing
function parseCoursesFromText(text) {
  // Find first valid JSON array in response
  const arrText = extractJsonArray(text)
  if (!arrText) {
    console.error('No JSON array found in response')
    throw new Error('Invalid JSON response from Gemini')
  }
  
  // Parse and validate
  const parsed = JSON.parse(arrText)
  if (!Array.isArray(parsed)) {
    throw new Error('Parsed value is not an array')
  }
  
  return parsed
}
```

### 5. Areas for Contribution

**High Priority (Help Wanted)**:
- [ ] Add unit and integration tests
- [ ] Implement retry logic with exponential backoff
- [ ] Add semantic chunking for PDFs
- [ ] Improve extraction accuracy with better prompts
- [ ] Add confidence scoring to results

**Medium Priority**:
- [ ] Add more export formats (Excel, SQL, XML)
- [ ] Implement result caching
- [ ] Add batch processing for multiple files
- [ ] Create REST API for programmatic access
- [ ] Add user authentication for deployment

**Nice to Have**:
- [ ] OCR support for scanned PDFs
- [ ] Multi-language support
- [ ] Custom field extraction
- [ ] Web API documentation
- [ ] Deployment templates (Docker, K8s)

## Development Workflow

### Commit Message Format

Follow Conventional Commits:
```
type(scope): description

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (no logic change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build, dependencies, etc.

Examples:
```
feat(chunking): add semantic PDF chunking

- Split PDFs by section headers instead of character count
- Preserve section context in prompts
- Improves accuracy for multi-section documents

Closes #42
```

```
fix(parsing): handle Gemini markdown responses

- Add bracket-depth matching for JSON extraction
- Tolerate markdown code blocks in responses
- Fixes "Invalid JSON" errors

Fixes #38
```

### Testing

Before submitting a PR:

```bash
# Run linter (if configured)
npm run lint

# Build the project
npm run build

# Test manually in the browser
# - Upload different file types
# - Test edge cases
# - Check console for errors
```

### Documenting Changes

1. Update README.md if changing features
2. Update ARCHITECTURE.md if changing architecture
3. Add code comments for complex logic
4. Update CHANGELOG (once created)

## Pull Request Process

1. **Update your branch**:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Push changes**:
   ```bash
   git push origin feature/amazing-feature
   ```

3. **Create PR** on GitHub:
   - Fill in the PR template
   - Link related issues
   - Describe testing performed
   - Add screenshots if UI changes

4. **Address feedback**:
   - Respond to reviewer comments
   - Make requested changes
   - Push updates to the same branch
   - Don't create a new PR

5. **Merge**:
   - Maintainers will merge when approved
   - Your commits will be in main branch
   - You'll be credited in release notes

## Community Guidelines

- **Be respectful**: Treat all contributors with respect
- **Be constructive**: Provide helpful feedback
- **Be patient**: Maintainers are volunteers
- **Stay on topic**: Keep discussions relevant
- **Search first**: Check for duplicates before reporting

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Feature ideas**: Start a Discussion
- **Bugs**: Open an Issue with full details
- **Technical help**: Ask in Issues (with details)

## Recognition

Contributors will be:
- Mentioned in release notes
- Added to CONTRIBUTORS.md
- Given credit in commit messages

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Contributing Guide v1.0**
**Last Updated**: January 26, 2026

Thank you for making CourseHarvester better! 🎉
