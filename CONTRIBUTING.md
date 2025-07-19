# 🤝 Contributing to VoxFlow

We're thrilled that you're interested in contributing to VoxFlow! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Setup](#-development-setup)
- [How to Contribute](#-how-to-contribute)
- [Pull Request Guidelines](#-pull-request-guidelines)
- [Code Style](#-code-style)
- [Testing](#-testing)
- [Documentation](#-documentation)
- [Issue Reporting](#-issue-reporting)

## 🤖 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **Python** 3.9 or higher  
- **pnpm** (recommended) or npm
- **Git** for version control
- **Redis** server
- **FFmpeg** for audio processing

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/voxflow_trans.git
   cd voxflow_trans
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/cubetribe/voxflow_trans.git
   ```

## 💻 Development Setup

### 1. Backend Setup

**Node.js API Gateway:**
```bash
cd backend/node-service
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

**Python Voxtral Service:**
```bash
cd backend/python-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
pnpm install
cp .env.example .env.local
# Edit .env.local with your configuration
pnpm dev
```

### 3. Verify Installation

- Frontend: http://localhost:5173
- API Gateway: http://localhost:3000/health
- Python Service: http://localhost:8000/health

## 🛠️ How to Contribute

### Types of Contributions

We welcome several types of contributions:

- 🐛 **Bug Fixes** - Fix issues and improve stability
- ✨ **New Features** - Add new functionality
- 📚 **Documentation** - Improve or add documentation
- 🎨 **UI/UX** - Enhance user interface and experience
- ⚡ **Performance** - Optimize performance and efficiency
- 🧪 **Tests** - Add or improve test coverage
- 🔧 **Tooling** - Improve development tools and processes

### Before You Start

1. **Check existing issues** - Look for existing issues or feature requests
2. **Create an issue** - If none exists, create one to discuss your idea
3. **Get assignment** - Wait for maintainers to assign the issue to you
4. **Start small** - Begin with small, manageable contributions

### Contribution Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following our coding standards

3. **Add tests** for your changes

4. **Update documentation** if necessary

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

## 📝 Pull Request Guidelines

### PR Title Format

Use conventional commits format:
- `feat: add new transcription export format`
- `fix: resolve audio processing memory leak`
- `docs: update API documentation`
- `style: improve button hover effects`
- `refactor: optimize voxtral model loading`
- `test: add unit tests for audio service`
- `chore: update dependencies`

### PR Description Template

```markdown
## 🎯 Description
Brief description of changes

## 🔗 Related Issue
Fixes #(issue number)

## 🧪 Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update

## ✅ Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing (if applicable)

## 📋 Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Responsive design tested (if applicable)

## 📸 Screenshots (if applicable)
Add screenshots for UI changes

## 📝 Additional Notes
Any additional information
```

### Review Process

1. **Automated checks** must pass (CI/CD, linting, tests)
2. **Code review** by at least one maintainer
3. **Manual testing** for significant changes
4. **Documentation review** if docs are updated
5. **Approval** and merge by maintainers

## 🎨 Code Style

### TypeScript/JavaScript

We use ESLint and Prettier for code formatting:

```bash
# Check linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

**Style Guidelines:**
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use descriptive variable and function names
- Add JSDoc comments for complex functions
- Follow existing patterns and conventions

### Python

We use Black, isort, and Flake8 for Python code:

```bash
# Format code
black .

# Sort imports
isort .

# Check linting
flake8 .

# Type checking
mypy .
```

**Style Guidelines:**
- Follow PEP 8 standards
- Use type hints for all functions
- Write descriptive docstrings
- Keep functions focused and small
- Use async/await for I/O operations

### CSS/Styling

We use TailwindCSS with some custom components:

- Use Tailwind utility classes when possible
- Follow mobile-first responsive design
- Use semantic color names from design system
- Maintain consistent spacing scale
- Test dark/light themes

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend/node-service && npm test
cd backend/python-service && pytest

# Frontend tests  
cd frontend && pnpm test

# E2E tests
cd frontend && pnpm test:e2e

# Coverage reports
npm run test:coverage
```

### Writing Tests

**Unit Tests:**
- Test individual functions and components
- Mock external dependencies
- Aim for >90% code coverage
- Include edge cases and error scenarios

**Integration Tests:**
- Test service interactions
- Use real databases when possible
- Test API endpoints thoroughly
- Validate WebSocket communications

**E2E Tests:**
- Test complete user workflows
- Use Playwright for browser automation
- Test critical paths only
- Include accessibility testing

### Test Guidelines

- Write tests before or alongside new features
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests isolated and independent
- Update tests when changing functionality

## 📚 Documentation

### Types of Documentation

1. **Code Comments** - Explain complex logic
2. **API Documentation** - Document all endpoints
3. **README Updates** - Keep main README current
4. **Architecture Docs** - Update design documents
5. **User Guides** - Help end users

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add diagrams for complex concepts
- Keep documentation updated with code changes
- Test all code examples

## 🐛 Issue Reporting

### Before Creating an Issue

1. **Search existing issues** - Check if already reported
2. **Use latest version** - Reproduce on current version
3. **Minimal reproduction** - Create minimal test case
4. **Gather information** - Collect logs and environment details

### Bug Report Template

```markdown
## 🐛 Bug Description
Clear description of the bug

## 🔄 Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## ✅ Expected Behavior
What should happen

## ❌ Actual Behavior
What actually happens

## 🖼️ Screenshots
If applicable

## 🌐 Environment
- OS: [e.g. macOS 14.0]
- Browser: [e.g. Chrome 120]
- Node.js: [e.g. 18.17.0]
- Python: [e.g. 3.11.0]

## 📋 Additional Context
Any other relevant information
```

### Feature Request Template

```markdown
## 💡 Feature Description
Clear description of the feature

## 🎯 Problem Statement
What problem does this solve?

## 💭 Proposed Solution
How should this feature work?

## 🔄 Alternatives Considered
Other solutions you've considered

## 📋 Additional Context
Mockups, examples, references
```

## 🏷️ Labels and Issues

We use labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high/medium/low` - Priority levels
- `area: frontend/backend/docs` - Component areas

## 🎉 Recognition

Contributors are recognized in several ways:

- **README Contributors** - Listed in main README
- **Release Notes** - Mentioned in changelog
- **Discord Recognition** - Special role in community
- **Swag** - Stickers and swag for major contributions

## 💬 Community

Join our community:

- 💬 **Discord**: [VoxFlow Community](https://discord.gg/voxflow)
- 🐦 **Twitter**: [@cubetribe](https://twitter.com/cubetribe)
- 📧 **Email**: developers@cubetribe.com

## ❓ Questions?

If you have questions:

1. Check this contributing guide
2. Search existing issues and discussions
3. Ask in our Discord community
4. Create a GitHub discussion
5. Email the maintainers

Thank you for contributing to VoxFlow! 🎙️✨