// kids/js/lobby_tailwind_config.js - lobby.html 인라인 Tailwind 설정 이전 (Tailwind CDN 바로 다음에 로드, 클래식 스크립트)
const _rgb = (v) => `rgb(var(--c-${v}) / <alpha-value>)`;
const _colorKeys = [
  "on-tertiary-container","on-surface-variant","surface-container-low","on-tertiary-fixed","primary",
  "inverse-on-surface","surface","tertiary-container","secondary-fixed","surface-dim","primary-container",
  "on-tertiary","on-secondary","on-surface","secondary-container","on-error","on-primary-fixed",
  "primary-fixed-dim","tertiary-fixed-dim","error","surface-container-high","surface-tint","on-background",
  "secondary","outline","on-secondary-container","on-tertiary-fixed-variant","primary-fixed",
  "on-secondary-fixed-variant","inverse-surface","on-secondary-fixed","surface-variant","outline-variant",
  "tertiary-fixed","on-error-container","surface-container","surface-bright","secondary-fixed-dim",
  "on-primary","inverse-primary","surface-container-highest","error-container","on-primary-container",
  "surface-container-lowest","tertiary","on-primary-fixed-variant","background"
];
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: Object.fromEntries(_colorKeys.map(k => [k, _rgb(k)])),
      borderRadius: { "DEFAULT": "var(--r-default)", "lg": "var(--r-lg)", "xl": "var(--r-xl)", "full": "9999px" },
      spacing: {
        "margin-tablet": "2rem", "margin": "var(--space-margin)", "margin-mobile": "1rem",
        "space-xl": "var(--space-xl)", "space-lg": "var(--space-lg)", "space-md": "var(--space-md)",
        "space-sm": "var(--space-sm)", "space-xs": "var(--space-xs)",
        "gutter-tablet": "1.5rem", "gutter": "var(--space-gutter)", "gutter-mobile": "0.75rem"
      },
      fontFamily: {
        "display-hero": ["var(--font-headline)"], "display-lg": ["var(--font-headline)"], "display-lg-mobile": ["var(--font-headline)"],
        "headline-lg": ["var(--font-headline)"], "headline-lg-mobile": ["var(--font-headline)"], "headline-md": ["var(--font-headline)"],
        "title-lg": ["var(--font-title)"], "title-md": ["var(--font-title)"],
        "body-lg": ["var(--font-body)"], "body-md": ["var(--font-body)"], "body-sm": ["var(--font-body)"],
        "label-lg": ["var(--font-label)"], "label-md": ["var(--font-label)"], "label-sm": ["var(--font-label)"]
      },
      fontSize: {
        "display-hero": ["40px", { lineHeight: "48px", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "headline-lg-mobile": ["26px", { lineHeight: "34px", fontWeight: "700" }],
        "headline-md": ["22px", { lineHeight: "30px", fontWeight: "700" }],
        "title-lg": ["19px", { lineHeight: "26px", fontWeight: "700" }],
        "title-md": ["15px", { lineHeight: "22px", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "label-lg": ["15px", { lineHeight: "20px", fontWeight: "700" }],
        "label-md": ["13px", { lineHeight: "18px", fontWeight: "700" }],
        "label-sm": ["11px", { lineHeight: "16px", fontWeight: "600" }]
      }
    }
  }
};
