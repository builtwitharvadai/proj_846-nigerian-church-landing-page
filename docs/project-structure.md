nigerian-church-landing-page/
├── index.html                 # Main HTML entry point
├── package.json              # Project dependencies and scripts
├── .gitignore               # Git ignore rules
│
├── styles/                   # CSS modules (mobile-first)
│   ├── main.css             # Main CSS entry point and imports
│   ├── variables.css        # CSS custom properties (design tokens)
│   ├── typography.css       # Font system and text styles
│   ├── layout.css           # Grid, flexbox, and structural styles
│   ├── components.css       # UI component styles
│   ├── images.css           # Responsive image styles
│   └── accessibility.css    # WCAG 2.1 AA compliance styles
│
├── js/                      # JavaScript modules
│   ├── main.js             # Application entry point
│   ├── components/         # UI component modules
│   │   ├── navigation.js   # Mobile navigation and menu
│   │   └── contact-form.js # Form validation and submission
│   └── utils/              # Utility modules
│       ├── lazy-loading.js # Image lazy loading with IntersectionObserver
│       └── validation.js   # Form validation utilities
│
├── content/                 # Editable content files
│   ├── church-info.html    # Church information content
│   └── services-schedule.html # Service times and schedule
│
├── images/                  # Image assets
│   └── README.md           # Image optimization guidelines
│
├── accessibility/           # Accessibility resources
│   └── aria-labels.json    # ARIA label definitions
│
├── scripts/                 # Build and optimization scripts
│   ├── build.js            # Main build script
│   ├── optimize-css.js     # CSS minification and optimization
│   └── optimize-images.js  # Image compression and WebP conversion
│
├── docs/                    # Documentation
│   ├── README.md           # Main documentation
│   ├── content-guide.md    # Content update guidelines
│   ├── deployment.md       # Deployment instructions
│   └── project-structure.md # This file
│
└── config files             # Linting and validation configs
    ├── .eslintrc.json      # JavaScript linting rules
    ├── .stylelintrc.json   # CSS linting rules
    ├── .htmlvalidate.json  # HTML validation rules
    └── .markdownlint.json  # Markdown linting rules