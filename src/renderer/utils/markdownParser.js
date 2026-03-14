'use strict'
// markdownParser — marked + highlight.js + DOMPurify
// All three libraries are loaded from node_modules via <script> tags in index.html.
// This file configures them and exposes window.renderMarkdown().

;(function setupMarkdown() {
  // Wait until all scripts are loaded
  if (typeof marked === 'undefined') {
    console.warn('marked not loaded — markdown will render as plain text')
    window.renderMarkdown = (text) => {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }
    return
  }

  // Configure marked with highlight.js
  marked.use({
    gfm: true,
    breaks: true,
    highlight: (code, lang) => {
      if (typeof hljs === 'undefined') return code
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    }
  })

  /**
   * Parse markdown string → safe HTML string.
   * DOMPurify sanitizes AI-generated HTML before DOM insertion.
   * @param {string} text
   * @returns {string} sanitized HTML
   */
  window.renderMarkdown = function renderMarkdown(text) {
    if (!text) return ''
    const rawHtml = marked.parse(text)
    if (typeof DOMPurify === 'undefined') return rawHtml
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'del', 's', 'code', 'pre',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote',
        'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'hr', 'span', 'div'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel']
    })
  }
})()
