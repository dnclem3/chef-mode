import Link from 'next/link'
import { Button } from './button'

export function MainNav() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Recipe Walker
        </Link>
        
        <div className="flex gap-4">
          <Button variant="ghost" asChild>
            <Link href="/recipes">Recipes</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/extract">Extract Recipe</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/cook">Cook Mode</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
} 