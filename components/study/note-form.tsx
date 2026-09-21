"use client"

import * as React from "react"
import Image from "next/image"
import { BoldIcon, ImagePlusIcon, ItalicIcon, ListIcon, QuoteIcon, Trash2Icon } from "lucide-react"
import { noteSchema, type NoteInput } from "@/lib/validators"
import { noteText, sanitizeNoteHtml, toEditorHtml } from "@/lib/notes"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type NoteFormProps = {
  initialValues?: Partial<NoteInput>
  onSubmit: (input: NoteInput) => void | Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

type EditorCommand = "bold" | "italic" | "insertUnorderedList" | "formatBlock"

// converte a imagem escolhida em um preview local para a etapa demonstrativa.
function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Não foi possível carregar a imagem."))
    reader.readAsDataURL(file)
  })
}

export function NoteForm({ initialValues, onSubmit, onCancel, submitLabel = "Salvar anotação" }: NoteFormProps) {
  // mantém o conteúdo, a imagem e os estados do mini-construtor de anotações.
  const editorRef = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [values, setValues] = React.useState({ title: initialValues?.title ?? "", content: initialValues?.content ?? "", imageDataUrl: initialValues?.imageDataUrl })
  const [error, setError] = React.useState("")
  const [dragging, setDragging] = React.useState(false)

  React.useEffect(() => {
    // carrega texto antigo ou formatado dentro do editor visual.
    if (editorRef.current) {
      editorRef.current.innerHTML = toEditorHtml(initialValues?.content ?? "")
    }
  }, [initialValues?.content])

  function updateEditorContent() {
    // sincroniza o HTML editado com o estado usado no salvamento.
    const content = editorRef.current?.innerHTML ?? ""
    setValues((current) => ({ ...current, content }))
  }

  function runCommand(command: EditorCommand, value?: string) {
    // aplica um comando de formatação no trecho selecionado do editor.
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    updateEditorContent()
  }

  async function attachImage(file?: File) {
    // valida o arquivo e transforma a imagem em preview local.
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.")
      return
    }
    if (file.size > 1_500_000) {
      setError("A imagem precisa ter no máximo 1,5 MB.")
      return
    }
    try {
      setError("")
      const imageDataUrl = await readImage(file)
      setValues((current) => ({ ...current, imageDataUrl }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar a imagem.")
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // higieniza o HTML e valida título e conteúdo antes de salvar.
    event.preventDefault()
    const content = sanitizeNoteHtml(values.content)
    const parsed = noteSchema.safeParse({ ...values, content })
    if (!parsed.success || !noteText(content)) {
      setError(values.title.trim() && noteText(content) ? "Confira os dados da anotação." : "Preencha título e conteúdo.")
      return
    }
    setError("")
    await onSubmit(parsed.data)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={Boolean(error && !values.title.trim())}>
          <FieldLabel htmlFor="note-title">Título</FieldLabel>
          <Input id="note-title" value={values.title} onValueChange={(value) => setValues((current) => ({ ...current, title: value }))} placeholder="Ex.: HTML semântico" />
        </Field>
        <Field data-invalid={Boolean(error && !noteText(values.content))}>
          <div className="flex items-end justify-between gap-3"><FieldLabel htmlFor="note-content">Conteúdo</FieldLabel><span className="text-xs text-muted-foreground">editor rápido</span></div>
          <div className="overflow-hidden border border-border bg-background">
            <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2" aria-label="Ferramentas de formatação">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Negrito" onClick={() => runCommand("bold")}><BoldIcon /></Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Itálico" onClick={() => runCommand("italic")}><ItalicIcon /></Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Lista" onClick={() => runCommand("insertUnorderedList")}><ListIcon /></Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Citação" onClick={() => runCommand("formatBlock", "blockquote")}><QuoteIcon /></Button>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <span className="px-2 text-xs text-muted-foreground">selecione um trecho para formatar</span>
            </div>
            <div ref={editorRef} id="note-content" role="textbox" aria-label="Conteúdo" aria-multiline="true" contentEditable suppressContentEditableWarning onInput={updateEditorContent} className="min-h-44 p-4 text-sm leading-7 outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_blockquote]:border-l-2 [&_blockquote]:border-signal [&_blockquote]:pl-4 [&_blockquote]:italic [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-bold" data-placeholder="Escreva o que você aprendeu, organize uma ideia ou registre uma dúvida..." />
          </div>
          <FieldDescription>Você pode escrever, formatar trechos e anexar uma imagem abaixo.</FieldDescription>
        </Field>
      </FieldGroup>

      <div className={cn("border border-dashed border-border bg-muted/10 p-4 transition-colors", dragging && "border-brand bg-signal/10")} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void attachImage(event.dataTransfer.files[0]) }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold text-brand"><ImagePlusIcon className="size-4" /> Imagem de apoio</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Arraste uma imagem para cá ou selecione um arquivo de até 1,5 MB.</p></div><Input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => void attachImage(event.target.files?.[0])} /><Button type="button" variant="outline" className="rounded-none" onClick={() => fileInputRef.current?.click()}><ImagePlusIcon data-icon="inline-start" />Adicionar imagem</Button></div>
        {values.imageDataUrl && <div className="relative mt-4 overflow-hidden border border-border"><Image src={values.imageDataUrl} alt="Imagem anexada à anotação" width={960} height={540} unoptimized className="max-h-64 w-full object-cover" /><Button type="button" variant="secondary" size="icon-sm" aria-label="Remover imagem" className="absolute top-2 right-2 rounded-none" onClick={() => setValues((current) => ({ ...current, imageDataUrl: undefined }))}><Trash2Icon /></Button></div>}
      </div>

      <FieldError>{error}</FieldError>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="submit" className="rounded-none">{submitLabel}</Button>{onCancel && <Button type="button" variant="outline" className="rounded-none" onClick={onCancel}>Cancelar</Button>}</div>
    </form>
  )
}
