# Prime - Análisis Rápido del Codebase

Realiza un análisis rápido del codebase para entender la estructura, patrones y archivos clave antes de comenzar a trabajar.

## Instrucciones

- Analizar la estructura y organización del proyecto
- Identificar archivos y directorios clave
- Entender el stack tecnológico y dependencias
- Notar cualquier patrón o convención utilizada
- Identificar puntos de entrada y funcionalidad principal
- Buscar archivos de documentación (README, docs, etc.)
- Mantener el análisis breve y enfocado en insights accionables

## Areas to Analyze

**Project Structure:**
- Root files (package.json, index.html, README, etc.)
- Directory organization
- Asset locations

**Tech Stack:**
- HTML structure and templating
- CSS approach (vanilla, preprocessor, framework)
- JavaScript approach (vanilla, framework, modules)
- Build tools or bundlers (if any)
- Dependencies (if package.json exists)

**Code Patterns:**
- File naming conventions
- Code organization
- Comment style
- Modularity approach

**Entry Points:**
- Main HTML files
- Main CSS files
- Main JavaScript files
- How files are linked together

## Output Format

Provide a brief structured summary:

```
## Project Overview
<1-2 sentences about what the project does>

## Tech Stack
- HTML: <approach>
- CSS: <approach>
- JavaScript: <approach>
- Build: <if applicable>

## Key Files
- <file>: <purpose>
- <file>: <purpose>
- <file>: <purpose>

## Patterns & Conventions
- <pattern 1>
- <pattern 2>
- <pattern 3>

## Notes
<Any important observations or recommendations>
```

## Example Output

```
## Project Overview
A responsive landing page for a web design agency with sections for services, portfolio, and contact.

## Tech Stack
- HTML: Semantic HTML5
- CSS: Vanilla CSS with CSS Grid and Flexbox, organized in separate files
- JavaScript: Vanilla JS for interactive elements, ES6 modules
- Build: None (static site)

## Key Files
- index.html: Main landing page with all sections
- css/styles.css: Main stylesheet (imports other CSS files)
- css/layout.css: Grid and layout definitions
- css/components.css: Component-specific styles
- js/main.js: Main JavaScript entry point
- js/navigation.js: Navigation menu functionality
- js/animations.js: Scroll animations and transitions

## Patterns & Conventions
- BEM methodology for CSS class naming
- Mobile-first responsive design approach
- ES6 modules for JavaScript organization
- Descriptive file names in lowercase with hyphens
- Comments used for section separators

## Notes
- No build process, files are linked directly in HTML
- Heavy use of CSS custom properties for theming
- All images optimized and in WebP format with fallbacks
- Focus on accessibility (semantic HTML, ARIA labels, keyboard navigation)
```
