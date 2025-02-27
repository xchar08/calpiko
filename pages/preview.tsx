import MarkdownRenderer from '../components/MarkdownRenderer'

export default function PreviewPage() {
  const sampleMarkdown = `
# Sample Document

Inline math: $E = mc^2$

Block equation:
$$
\\int_{0}^{\\infty} e^{-x}\\, dx = 1
$$
`

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-fg p-6">
      <h1 className="text-4xl font-bold mb-4">Preview Page</h1>
      <MarkdownRenderer content={sampleMarkdown} />
    </div>
  )
}
