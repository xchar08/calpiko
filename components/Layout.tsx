// components/Layout.tsx
import { FC, ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-obsidian-bg text-obsidian-fg">
      <header className="p-4 border-b border-obsidian-border">
        <h1 className="text-3xl font-bold">Calpiko</h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}

export default Layout
