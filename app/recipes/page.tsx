import Link from "next/link"
import { ChevronLeft, Clock, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// Mock saved recipes - in a real app, this would come from Supabase
const savedRecipes = [
  {
    id: "demo",
    title: "Pasta Carbonara",
    source: "example.com/pasta-carbonara",
    lastCooked: "2 days ago",
    prepTime: "10 min",
    cookTime: "20 min",
  },
  {
    id: "recipe-2",
    title: "Chicken Stir Fry",
    source: "example.com/chicken-stir-fry",
    lastCooked: "1 week ago",
    prepTime: "15 min",
    cookTime: "15 min",
  },
  {
    id: "recipe-3",
    title: "Chocolate Chip Cookies",
    source: "example.com/chocolate-chip-cookies",
    lastCooked: "3 weeks ago",
    prepTime: "15 min",
    cookTime: "12 min",
  },
]

export default function RecipesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <h1 className="font-medium">My Recipes</h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Saved Recipes</h2>

          {savedRecipes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't saved any recipes yet</p>
              <Link href="/">
                <Button>Extract a Recipe</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {savedRecipes.map((recipe) => (
                <Card key={recipe.id}>
                  <CardHeader>
                    <CardTitle>{recipe.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      <span>{recipe.source}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Prep: {recipe.prepTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Cook: {recipe.cookTime}</span>
                      </div>
                      <div className="text-muted-foreground">Last cooked: {recipe.lastCooked}</div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/cook/${recipe.id}`} className="w-full">
                      <Button className="w-full">Start Cooking</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
