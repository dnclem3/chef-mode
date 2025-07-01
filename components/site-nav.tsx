import Link from "next/link"
import { ChefHat } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SiteNav() {
  return (
    <header className="container mx-auto px-4 py-6 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-red-500" />
          <span className="font-semibold text-xl">Chef Mode</span>
        </Link>
      </div>
{/* 
      <div className="flex items-center gap-4">
        <Link href="/recipes">
          <Button variant="ghost" size="sm">
            My Recipes
          </Button>
        </Link>
        <Link href="/auth/signin">
          <Button size="sm">Sign In</Button>
        </Link>
      </div>
*/}
    </header>
  )
} 