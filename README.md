# ResumeBuilder Pro 🚀

A modern, interactive, ATS-friendly Resume Builder web application built with **HTML5, Tailwind CSS, Vanilla JavaScript (ES6 Modules), LocalStorage, SortableJS, and native browser print**.

---

## ✨ Features & Capabilities

### 🛡️ 1. ATS Compatibility Checker & Job Matcher

- **ATS Compatibility Score (0–100)**: Evaluates resume structure, layout, contact information, essential sections, keywords, and overall ATS readiness.
- **2-Column Layout Detection**: Automatically detects two-column templates and displays an ATS warning because some ATS systems may read content in the     wrong order. Recommends switching to a single-column template.
- **ATS-Friendly Formatting Check**: Checks section headings, content structure, readability, excessive decoration, emojis, and other potential ATS compatibility issues.
- **Job Description Keyword Matcher**: Paste any job description into the ATS tool to scan for required skills, technologies, and relevant keywords.
- **Keyword Match Percentage**: Shows the percentage of matched keywords between the resume and the target job description.
- **Matched vs Missing Keywords**: Shows matched keywords and missing keywords, with a “+ Add to Skills” option for missing skills.
- **Dynamic ATS Results**: Recalculates the score and warnings whenever the resume content, template, or job description changes.

### 📄 2. Dual PDF Generation & 1-Page Overflow Protection
- **Print / Save as PDF**: Native browser print output with selectable text, links, and print-aware A4 pagination.
- **Native Browser Print Fallback**: Dedicated **"Print"** button with specialized `@media print` rules, producing 100% vector, crystal-clear PDFs directly from your browser's print engine.
- **1-Page Visual Overflow Warning**: Real-time height detector alerts you when resume content spills past 1 standard A4 page (297mm), helping you maintain concise 1-page resumes that recruiters prefer.

### 🎨 3. 4 Distinct Professional Templates & Dynamic Accent Colors
- **Modern Clean**: Single-column layout with clean dividers, refined typography, and balanced spacing.
- **Executive Split**: Asymmetric two-column layout with a stylish contact & skills sidebar and spacious main content.
- **Tech Specialist**: Developer-focused theme with tech pill badges, GitHub repository links, and monospace highlights.
- **Classic Elegance**: Traditional serif header typography and formal structure suited for law, medicine, academia, and executive positions.
- **Dynamic Accent Color Swatches**: 6 curated colors (Indigo, Sky Blue, Emerald, Rose, Amber, Slate) with real-time recoloring across all templates.

### 🔄 4. Drag & Drop AND Keyboard Accessible Reordering
- **Mouse / Touch Drag & Drop**: Powered by **SortableJS** with smooth visual drag indicators.
- **Keyboard-Accessible Up (↑) / Down (↓) Buttons**: Full WCAG-friendly buttons on every section header with explicit `aria-label` attributes.
- Automatically synchronizes with `resumeData.meta.sectionOrder` and re-orders the live preview instantly.

### 💾 5. JSON Backup & Multi-Profile Transfer
- **Export JSON**: Download your complete resume profile as a `.json` backup file.
- **Import JSON**: Upload and restore saved JSON files, enabling multiple resume profiles without backend requirements.

### ⚡ 6. High Performance & Input Validation
- **Debounced Live Preview (200ms)**: Typing updates are debounced to guarantee buttery-smooth 60fps performance even on slower laptops.
- **Live Summary Character Counter**: Enforces ATS-recommended brevity with a live `0 / 450 characters` counter and dynamic warning colors.
- **Real-time Email & Phone Validation**: Visual feedback indicators for email formatting and standard phone numbers.

### 📱 7. Responsive Mobile Switcher & Empty States
- **Mobile Tab Switcher**: Seamless `[Editor & Forms] | [Live A4 Preview]` toggle on mobile screens (< 768px).
- **Inviting Empty State**: Beautiful canvas empty state guiding new users to start typing or click **Sample Data**.
- **Dark & Light Mode**: Complete theme toggle with persistent `localStorage` support.

---

## 📁 Folder Structure

```
resume-builder/
│
├── index.html              # Responsive split-screen UI, ATS modal, and controls
├── /css
│   └── style.css           # A4 dimensions, print media rules, paper shadows & micro-interactions
├── /js
│   ├── main.js             # Bootstrap, Lucide icons init, template & accent bindings, mobile switcher
│   ├── state.js            # Central resumeData state, localStorage sync, sample data, JSON import/export
│   ├── formHandlers.js     # Form input bindings, debounce, character counter, reusable createRepeatableField
│   ├── renderPreview.js    # Live preview dispatcher, zoom controller, and overflow monitor
│   ├── templates.js        # 4 distinct resume design templates & empty state
│   ├── dragDrop.js         # SortableJS drag-and-drop & keyboard up/down section reordering
│   ├── pdfExport.js        # Native browser print and 1-page overflow check
│   ├── completeness.js     # Real-time profile completeness calculator & suggestions
│   ├── atsChecker.js       # ATS Compatibility Score, multi-column parser checks & Job Matcher
│   └── theme.js            # Dark/light mode switcher with persistent preference
├── /assets
│   └── favicon.svg         # SVG favicon
└── README.md               # Documentation and deployment guide
```

---

## 📊 Data Model

Everything in the application reads and writes to a central `resumeData` object:

```javascript
const resumeData = {
  personal: {
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    summary: ""
  },
  education: [
    { school: "", degree: "", year: "", grade: "" }
  ],
  experience: [
    { company: "", role: "", duration: "", description: "" }
  ],
  skills: [ "JavaScript", "React" ],
  projects: [
    { title: "", description: "", link: "" }
  ],
  achievements: [
    { title: "", description: "" }
  ],
  links: {
    linkedin: "",
    github: "",
    portfolio: ""
  },
  meta: {
    template: "template1",
    theme: "light",
    accentColor: "#4f46e5",
    sectionOrder: ["personal", "experience", "education", "skills", "projects", "achievements", "links"]
  }
};
```

---

## 🚀 How to Run Locally

Because the application uses native ES6 JavaScript modules (`import`/`export`), run it via any local web server:

### Option 1: Using Python
```bash
python -m http.server 4173
```
Then open `http://localhost:4173` in your browser.

### Option 2: Using Node.js
```bash
npx serve .
```

---

## 🌐 Deployment

The application is completely client-side and can be hosted for free on:
- **Vercel** (`vercel`)
- **Netlify** (Drag-and-drop folder or Git)
- **GitHub Pages** (Settings > Pages > Branch: `main`)
