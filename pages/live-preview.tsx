import { useState } from 'react'
import MarkdownRenderer from '../components/MarkdownRenderer'

export default function LivePreview() {
  const [markdown, setMarkdown] = useState(`# Hello!

This is inline math: $E = mc^2$

Here is a block equation:

$$
\\int_0^\\infty e^{-x} dx = 1
$$

Type above and watch this preview update live.
`)

  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-fg p-6">
      <h1 className="text-3xl font-bold mb-4">Live Markdown Preview</h1>
      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        className="w-full h-40 p-4 bg-[#44475a] text-obsidian-fg border border-obsidian-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="mt-6 border border-obsidian-border p-4 bg-[#44475a] rounded">
        <MarkdownRenderer content={markdown} />
      </div>
    </div>
  )
}
