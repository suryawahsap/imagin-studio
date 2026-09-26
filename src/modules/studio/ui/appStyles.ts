export const tailwindStyles = `
    /* Studio owns these tokens locally so its parity work does not change the shared shell. */

    body {
        background-color: var(--bg-page);
        color: var(--text-primary);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    /* System default cursor */
    html, body {
        cursor: default;
    }
    button, a, [role="button"], select, label {
        cursor: pointer;
    }

    .imagin-card {
        background-color: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
    }

    .imagin-input {
        background-color: var(--bg-element);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        border-radius: 8px;
        transition: all 0.2s ease;
    }

    .imagin-input:focus {
        outline: none;
        border-color: var(--accent-action);
        box-shadow: var(--shadow-focus);
    }

    /* Focus ring — keyboard navigation jelas di sidebar padat tombol kecil */
    button:focus-visible, [role="button"]:focus-visible, [role="radio"]:focus-visible, select:focus-visible, textarea:focus-visible, input:focus-visible {
        outline: 2px solid var(--studio-accent, var(--border-focus));
        outline-offset: 1px;
    }

    /* Micro-animation — footer stage switching fade 150ms */
    .footer-stage {
        animation: footerFadeIn 150ms ease;
    }
    @keyframes footerFadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .imagin-btn-primary {
        background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
        color: #ffffff;
        transition: all 0.2s ease;
    }
    .imagin-btn-primary:hover:not(:disabled) {
        background: #2563eb;
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
    }
    .imagin-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .custom-scrollbar { scrollbar-width: thin; scrollbar-color: var(--border-color) transparent; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
    }

    .bg-checkered {
        background-image:
            linear-gradient(45deg, #e5e5e5 25%, transparent 25%, transparent 75%, #e5e5e5 75%, #e5e5e5),
            linear-gradient(45deg, #e5e5e5 25%, transparent 25%, transparent 75%, #e5e5e5 75%, #e5e5e5);
        background-size: 16px 16px;
        background-position: 0 0, 8px 8px;
        background-color: #ffffff;
    }

    .bg-solid-white {
        background-image: none;
        background-color: #ffffff;
    }

    .preflight-group-label {
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-secondary);
        padding: 8px 0 4px;
        border-top: 1px solid var(--border-color);
        margin-top: 4px;
    }
    .preflight-group-label:first-of-type {
        border-top: none;
        padding-top: 0;
    }

    .json-controls-readonly button:not(.json-allow),
    .json-controls-readonly input,
    .json-controls-readonly select,
    .json-controls-readonly textarea {
        opacity: 0.55;
        pointer-events: none;
        user-select: none;
    }

    /* Local Studio palette: dark and light values mapped to design system tokens */
    .studio-shell {
        --studio-stage: var(--s-canvas);
        --studio-panel: var(--s-sidebar);
        --studio-bar: var(--s-header);
        --studio-field: var(--s-card-hero);
        --studio-well: var(--s-segmented-well);
        --studio-hover: var(--s-hover);
        --studio-border: var(--border-default);
        --studio-border-strong: var(--border-strong);
        --studio-primary: var(--t-primary);
        --studio-secondary: var(--t-secondary);
        --studio-muted: var(--t-muted);
        --studio-faint: var(--t-muted);
        --studio-accent: var(--accent);
        --studio-accent-hover: var(--accent-hover);
        --studio-success: #34d399;
        --studio-error: #f87171;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        font-size: 12px;
        background-color: var(--studio-stage);
        color: var(--studio-primary);
    }
    [data-theme="light"] .studio-shell {
        --studio-success: #047857;
        --studio-error: #b91c1c;
    }
    [data-theme="light"] .studio-shell .imagin-btn-primary,
    [data-theme="light"] .studio-shell .cyber-gradient-btn { background: #2563eb; color: #ffffff; }
    [data-theme="light"] .studio-shell .imagin-btn-primary:hover:not(:disabled),
    [data-theme="light"] .studio-shell .cyber-gradient-btn:hover { background: #1d4ed8; }
    .studio-shell .cyber-gradient-btn { background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%); }
    .studio-shell .cyber-gradient-btn:hover { filter: none; background: #2563eb; box-shadow: 0 0 12px rgba(59,130,246,.4); }

    .studio-shell [data-purpose="generation-controls"] {
        background: var(--studio-panel);
        border-color: var(--studio-border);
    }
    .studio-shell [data-purpose="stage-view"] { background: var(--studio-stage); }
    .studio-shell [data-purpose="inspector-panel"] {
        background: var(--studio-panel);
        border-color: var(--studio-border);
    }
    .studio-shell .studio-workspace-tabs {
        background: var(--studio-panel);
        border-color: var(--studio-border);
    }
    .studio-shell .studio-preview-container { background-color: var(--studio-stage); }

    .studio-shell textarea, .studio-shell input, .studio-shell select { color: var(--studio-primary); }
    .studio-shell ::placeholder { color: var(--studio-faint); }

    /* Studio modal and dialog styling */
    .studio-shell .studio-mode-dialog {
        background: var(--studio-panel);
        border-color: var(--studio-border-strong);
        color: var(--studio-primary);
    }
    .studio-shell .studio-mode-dialog button {
        background: var(--studio-well);
        border-color: var(--studio-border);
        color: var(--studio-primary);
    }
    .studio-shell .studio-mode-dialog button:hover {
        background: var(--studio-hover);
        border-color: var(--studio-accent);
    }
`;
