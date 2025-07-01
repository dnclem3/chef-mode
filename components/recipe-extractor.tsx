"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChefHat, Loader2, Camera, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function RecipeExtractor() {
  const [url, setUrl] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  /* Photo feature coming soon
  const [showCamera, setShowCamera] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setError("")
      setIsExtracting(true)
      
      try {
        // Convert image to text content (placeholder for OCR)
        const content = "Image OCR not implemented yet"
        
        const response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to extract recipe')
        }
        
        const recipe = await response.json()
        // Store recipe in localStorage for now (later this would go to a database)
        localStorage.setItem('extracted-recipe', JSON.stringify(recipe))
        router.push(`/cook/extracted`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process image')
      } finally {
        setIsExtracting(false)
      }
    }
  }

  const handleCameraCapture = async () => {
    setShowCamera(true)
    setError("")
    setIsExtracting(true)
    
    try {
      // Placeholder for camera capture (would integrate with device camera)
      const content = "Camera capture not implemented yet"
      
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to extract recipe')
      }
      
      const recipe = await response.json()
      localStorage.setItem('extracted-recipe', JSON.stringify(recipe))
      router.push(`/cook/extracted`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process camera capture')
    } finally {
      setIsExtracting(false)
      setShowCamera(false)
    }
  }
  */

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url) {
      setError("Please enter a recipe URL")
      return
    }

    if (!url.startsWith("http")) {
      setError("Please enter a valid URL")
      return
    }

    setIsExtracting(true)
    setError("")

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to extract recipe')
      }
      
      const recipe = await response.json()
      localStorage.setItem('extracted-recipe', JSON.stringify(recipe))
      router.push(`/cook/extracted`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract recipe')
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleExtract} className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-gray-800">Extract a recipe</h2>
            <p className="text-lg text-muted-foreground">
              Paste a URL of any recipe and we'll transform it into a step-by-step cooking experience
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="url"
                placeholder="https://example.com/recipe"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 text-lg py-3"
              />
              <Button type="submit" disabled={isExtracting} className="text-lg px-6 py-3 bg-red-500">
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  "Extract Recipe"
                )}
              </Button>
            </div>
            {/* 
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-muted"></div>
              <span className="text-muted-foreground text-lg">or</span>
              <div className="flex-1 border-t border-muted"></div>
            </div>

             Photo feature coming soon
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
                <label htmlFor="image-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-lg py-3 cursor-pointer bg-white/80 backdrop-blur-sm border-2"
                    asChild
                  >
                    <div>
                      <Upload className="mr-2 h-5 w-5" />
                      Upload Photo
                    </div>
                  </Button>
                </label>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleCameraCapture}
                disabled={isExtracting}
                className="text-lg py-3 bg-white/80 backdrop-blur-sm border-2"
              >
                <Camera className="mr-2 h-5 w-5" />
                Take Photo
              </Button>
            </div>
            */}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Photo feature coming soon
          {selectedImage && (
            <Alert>
              <AlertDescription>Selected image: {selectedImage.name}</AlertDescription>
            </Alert>
          )}

          {(isExtracting || showCamera) && (
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <ChefHat className="h-8 w-8 animate-bounce" />
                </div>
                <p className="text-lg text-muted-foreground">
                  {showCamera ? "Chef is reading your recipe..." : "Chef is getting into the kitchen..."}
                </p>
              </div>
            </div>
          )}
          */}
        </form>
      </CardContent>
    </Card>
  )
}
