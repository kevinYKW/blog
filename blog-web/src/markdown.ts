import DOMPurify from 'dompurify'
import { marked } from 'marked'

export function renderMarkdown(content: string) {
  const html = DOMPurify.sanitize(marked.parse(content, { async: false }), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['form', 'input', 'style', 'iframe'],
    FORBID_ATTR: ['style', 'id', 'name'],
  })
  const template = document.createElement('template')
  template.innerHTML = html
  const headings = Array.from(template.content.querySelectorAll('h2, h3'), (heading, index) => {
    heading.id = `section-${index + 1}`
    return { id: heading.id, text: heading.textContent, level: heading.tagName }
  })
  return { html: template.innerHTML, headings }
}
