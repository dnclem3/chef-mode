"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import StepTimer from "@/components/step-timer"
import PrepBowl from "@/components/prep-bowl"
import { useMobile } from "@/hooks/use-mobile"
import type { Recipe, Step, Subcomponent } from "@/lib/recipeParser"

// Mock recipe data - in a real app, this would come from an API
const mockRecipe: Recipe = {
  title: "Vegan Crunchwrap Supreme",
  subcomponents: [
    {
      name: "Spicy Sofritas Tofu",
      ingredients: [
        { quantity: "3 tbsp", ingredient: "olive oil" },
        { quantity: "16 oz", ingredient: "extra-firm tofu, pressed and crumbled" },
        { quantity: "2 tbsp", ingredient: "taco seasoning (+ 1 tsp salt if unsalted)" },
        { quantity: "2", ingredient: "chipotle peppers, minced" },
        { quantity: "⅓–½ cup", ingredient: "salsa" }
      ]
    },
    {
      name: "Cashew Queso",
      ingredients: [
        { quantity: "1 cup", ingredient: "cashews" },
        { quantity: "½ cup", ingredient: "water" },
        { quantity: "1 can", ingredient: "diced green chiles" },
        { quantity: "1 tsp", ingredient: "taco seasoning (+ pinch salt if unsalted)" }
      ]
    },
    {
      name: "Crunchwrap Assembly",
      ingredients: [
        { quantity: "4–6", ingredient: "large burrito-size flour tortillas" },
        { quantity: "as needed", ingredient: "tostadas or tortilla chips" },
        { quantity: "optional", ingredient: "roasted vegetables" },
        { quantity: "optional", ingredient: "black beans" },
        { quantity: "optional", ingredient: "avocado slices" },
        { quantity: "optional", ingredient: "fresh tomatoes, cabbage slaw, lettuce, cilantro" },
        { quantity: "as needed", ingredient: "salsa" }
      ]
    }
  ],
  steps: [
    {
      instruction: "Heat oil over medium-high in a large nonstick skillet. Add crumbled tofu and break apart. Stir in taco seasoning, chipotles, and salsa. Cook until hot and fragrant, then let sit undisturbed to brown and crisp.",
      ingredients: [
        { quantity: "3 tbsp", ingredient: "olive oil" },
        { quantity: "16 oz", ingredient: "crumbled tofu" },
        { quantity: "2 tbsp", ingredient: "taco seasoning" },
        { quantity: "2", ingredient: "chipotle peppers, minced" },
        { quantity: "⅓–½ cup", ingredient: "salsa" }
      ],
      time: {
        duration: "10+ minutes",
        action: "brown tofu"
      }
    },
    {
      instruction: "Blend cashews, water, diced green chiles, and taco seasoning until smooth for the queso.",
      ingredients: [
        { quantity: "1 cup", ingredient: "cashews" },
        { quantity: "½ cup", ingredient: "water" },
        { quantity: "1 can", ingredient: "green chiles" },
        { quantity: "1 tsp", ingredient: "taco seasoning" }
      ],
      time: {
        duration: "2 minutes",
        action: "blend queso"
      }
    },
    {
      instruction: "Lay a tortilla on a flat surface. Layer tofu, queso, crunchy element (tostada/chips), and any extras (beans, veggies, avocado, salsa, fresh toppings).",
      ingredients: [
        { quantity: "1", ingredient: "large tortilla" },
        { quantity: "", ingredient: "prepared tofu" },
        { quantity: "", ingredient: "cashew queso" },
        { quantity: "", ingredient: "tostadas or chips" },
        { quantity: "", ingredient: "optional extras: roasted veggies, beans, avocado, fresh toppings" }
      ],
      time: null
    },
    {
      instruction: "Fold edges of tortilla toward center to make a sealed wrap.",
      ingredients: [],
      time: null
    },
    {
      instruction: "Heat a little oil in skillet, place seam-side down, and cook until golden and crispy on both sides. Slice in half and serve.",
      ingredients: [],
      time: {
        duration: "few minutes per side",
        action: "crispy wrap"
      }
    }
  ]
}

export default function CookPage({ params }: { params: { id: string } }) {
  const [phase, setPhase] = useState<"prep" | "cook">("prep")
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [savedToAccount, setSavedToAccount] = useState(false)
  const isMobile = useMobile()
  const [currentSubcomponentIndex, setCurrentSubcomponentIndex] = useState(0)

  const isInPrepPhase = phase === "prep"
  const currentSubcomponent = isInPrepPhase ? mockRecipe.subcomponents[currentSubcomponentIndex] : null
  const currentStep = !isInPrepPhase ? mockRecipe.steps[currentStepIndex] : null

  const totalSteps = mockRecipe.subcomponents.length + mockRecipe.steps.length
  const completedSteps = isInPrepPhase ? currentSubcomponentIndex : mockRecipe.subcomponents.length + currentStepIndex
  const progress = (completedSteps / totalSteps) * 100

  const handleNext = () => {
    if (isInPrepPhase) {
      if (currentSubcomponentIndex < mockRecipe.subcomponents.length - 1) {
        setCurrentSubcomponentIndex(currentSubcomponentIndex + 1)
      } else {
        setPhase("cook")
        setCurrentSubcomponentIndex(0)
        setCurrentStepIndex(0)
      }
    } else {
      if (currentStepIndex < mockRecipe.steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (isInPrepPhase) {
      if (currentSubcomponentIndex > 0) {
        setCurrentSubcomponentIndex(currentSubcomponentIndex - 1)
      }
    } else {
      if (currentStepIndex > 0) {
        setCurrentStepIndex(currentStepIndex - 1)
      } else {
        setPhase("prep")
        setCurrentStepIndex(0)
        setCurrentSubcomponentIndex(mockRecipe.subcomponents.length - 1)
      }
    }
  }

  const handleSaveRecipe = () => {
    // In a real app, this would save to Supabase
    setSavedToAccount(true)
    setTimeout(() => setSavedToAccount(false), 3000)
  }

  // Handle swipe gestures for mobile
  useEffect(() => {
    if (!isMobile) return

    let touchStartX = 0
    let touchEndX = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX
      handleSwipe()
    }

    const handleSwipe = () => {
      const swipeThreshold = 50
      if (touchEndX - touchStartX > swipeThreshold) {
        // Swipe right
        handlePrevious()
      } else if (touchStartX - touchEndX > swipeThreshold) {
        // Swipe left
        handleNext()
      }
    }

    document.addEventListener("touchstart", handleTouchStart, false)
    document.addEventListener("touchend", handleTouchEnd, false)

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isMobile, currentStepIndex, currentSubcomponentIndex, phase])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-lg">Exit</span>
          </Link>
          <h1 className="font-medium text-xl">{mockRecipe.title}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveRecipe}
            className={`text-lg ${savedToAccount ? "text-emerald-600" : ""}`}
          >
            <Save className="h-5 w-5 mr-2" />
            {savedToAccount ? "Saved" : "Save"}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-3 bg-white/60 backdrop-blur-sm">
        <div className="flex justify-between items-center text-lg text-muted-foreground mb-2">
          <div className="font-medium">
            {isInPrepPhase ? "Preparation" : "Cooking"} - {isInPrepPhase ? "Component" : "Step"}{" "}
            {isInPrepPhase ? currentSubcomponentIndex + 1 : currentStepIndex + 1} of{" "}
            {isInPrepPhase ? mockRecipe.subcomponents.length : mockRecipe.steps.length}
          </div>
          <div>
            {completedSteps} of {totalSteps} total steps
          </div>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
      </div>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          {isInPrepPhase && currentSubcomponent && (
            <div className="mb-8">
              <PrepBowl
                name={currentSubcomponent.name}
                ingredients={currentSubcomponent.ingredients}
              />
            </div>
          )}

          {!isInPrepPhase && currentStep && (
            <div className="mb-8">
              <h2 className="text-4xl font-bold mb-6 text-gray-800">Step {currentStepIndex + 1}</h2>
              <p className="text-xl text-gray-700 mb-6">{currentStep.instruction}</p>

              {currentStep.ingredients.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-3">Ingredients for this step:</h3>
                  <ul className="space-y-2">
                    {currentStep.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                        <span className="text-lg">
                          {ingredient.quantity && (
                            <span className="font-medium">{ingredient.quantity} </span>
                          )}
                          {ingredient.ingredient}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentStep.time && (
                <div className="mt-6">
                  <StepTimer
                    duration={currentStep.time.duration}
                    action={currentStep.time.action}
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-auto flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={isInPrepPhase ? currentSubcomponentIndex === 0 : currentStepIndex === 0 && phase === "prep"}
              className="text-lg"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                isInPrepPhase
                  ? currentSubcomponentIndex === mockRecipe.subcomponents.length - 1 && phase === "cook"
                  : currentStepIndex === mockRecipe.steps.length - 1
              }
              className="text-lg"
            >
              Next
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
