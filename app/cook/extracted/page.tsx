"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Recipe } from "@/lib/recipeParser"
import PrepBowl from "@/components/prep-bowl"
import StepTimer from "@/components/step-timer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Save } from "lucide-react"

export default function ExtractedRecipePage() {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [phase, setPhase] = useState<'ingredients' | 'steps'>('ingredients')
  const router = useRouter()

  useEffect(() => {
    const storedRecipe = localStorage.getItem('extracted-recipe')
    if (!storedRecipe) {
      router.push('/extract')
      return
    }
    setRecipe(JSON.parse(storedRecipe))
  }, [router])

  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-muted-foreground">Loading recipe...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStepData = recipe.steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === recipe.steps.length - 1

  const handlePrevStep = () => {
    if (isFirstStep) {
      setPhase('ingredients')
    } else {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleNextStep = () => {
    if (phase === 'ingredients') {
      setPhase('steps')
    } else if (!isLastStep) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleSaveRecipe = () => {
    // TODO: Implement recipe saving to database
    router.push('/recipes')
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">{recipe.title}</h1>
        {/* 
        <Button onClick={handleSaveRecipe} className="bg-emerald-600">
          <Save className="mr-2 h-5 w-5" />
          Save Recipe
        </Button>
        */}
      </div>

      {phase === 'ingredients' ? (
        <div>
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-2 mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipe.subcomponents.map((component, index) => (
                  <PrepBowl
                    key={index}
                    name={component.name}
                    ingredients={component.ingredients}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-2">
            <CardHeader>
              <CardTitle className="text-2xl">
                Step {currentStep + 1} of {recipe.steps.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-xl text-gray-700">{currentStepData.instruction}</p>

              {currentStepData.ingredients.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">Ingredients for this step:</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    {currentStepData.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-lg text-gray-700">
                        {ingredient.quantity && (
                          <span className="font-semibold">{ingredient.quantity} </span>
                        )}
                        {ingredient.ingredient}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentStepData.time && (
                <div className="pt-4">
                  <StepTimer
                    duration={currentStepData.time.duration}
                    action={currentStepData.time.action}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-between items-center pt-4">
        <Button
          onClick={handlePrevStep}
          disabled={phase === 'ingredients'}
          variant="outline"
          className="text-lg"
        >
          <ChevronLeft className="mr-2 h-5 w-5" />
          {isFirstStep ? 'Back to Ingredients' : 'Previous Step'}
        </Button>

        <Button
          onClick={handleNextStep}
          disabled={phase === 'steps' && isLastStep}
          className="text-lg bg-red-500"
        >
          {phase === 'ingredients' ? 'Start Cooking' : 'Next Step'}
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
} 