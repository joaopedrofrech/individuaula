const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "BLOCKQUOTE", "H2", "H3", "DIV"])

// remove marcas e atributos que não fazem parte do editor de anotações.
export function sanitizeNoteHtml(value: string) {
  if (!value.trim()) {
    return ""
  }

  if (typeof DOMParser === "undefined") {
    return value.replace(/<\/?(?!p\b|br\b|strong\b|b\b|em\b|i\b|ul\b|ol\b|li\b|blockquote\b|h2\b|h3\b|div\b)[^>]*>/gi, "").trim()
  }

  const document = new DOMParser().parseFromString(`<div>${value}</div>`, "text/html")
  const root = document.body.firstElementChild
  if (!root) {
    return ""
  }

  root.querySelectorAll("*").forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent ?? ""))
      return
    }
    Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name))
  })

  return root.innerHTML.trim()
}

// transforma o conteúdo salvo em texto para pesquisa e resumos sem carregar HTML.
export function noteText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

// converte anotações antigas em texto editável sem perder quebras de linha.
export function toEditorHtml(value: string) {
  if (!value.trim()) {
    return "<p><br /></p>"
  }
  if (/<[a-z][\s\S]*>/i.test(value)) {
    return sanitizeNoteHtml(value)
  }
  const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return `<p>${escaped.replace(/\n/g, "<br />")}</p>`
}
