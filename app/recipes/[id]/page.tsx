"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { StepTimer } from "@/components/step-timer"
import type { Recipe } from "@/lib/recipeParser"

// Sample recipe data - in a real app, this would come from a database or API
const recipesData: Record<string, Recipe> = {
  "1": {
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
}

interface CheckedIngredients {
  [componentIndex: number]: Set<number>
}

export default function RecipePage({ params }: { params: { id: string } }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [checkedIngredients, setCheckedIngredients] = useState<CheckedIngredients>({})

  const recipe = recipesData[params.id as keyof typeof recipesData]

  if (!recipe) {
    return <div className="container mx-auto px-4 py-8">Recipe not found</div>
  }

  const totalSteps = recipe.steps.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const toggleIngredient = (componentIndex: number, ingredientIndex: number) => {
    setCheckedIngredients(prev => {
      const newChecked = { ...prev }
      if (!newChecked[componentIndex]) {
        newChecked[componentIndex] = new Set()
      }
      const componentChecked = new Set(newChecked[componentIndex])
      if (componentChecked.has(ingredientIndex)) {
        componentChecked.delete(ingredientIndex)
      } else {
        componentChecked.add(ingredientIndex)
      }
      newChecked[componentIndex] = componentChecked
      return newChecked
    })
  }

  const isIngredientChecked = (componentIndex: number, ingredientIndex: number) => {
    return checkedIngredients[componentIndex]?.has(ingredientIndex) || false
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to recipes
        </Link>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/2">
            <h1 className="text-3xl font-bold mb-4">{recipe.title}</h1>
          </div>

          <div className="md:w-1/2">
            {recipe.subcomponents.map((component, componentIndex) => (
              <Card key={componentIndex} className="mb-4">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">{component.name}</h2>
                  <ul className="space-y-2">
                    {component.ingredients.map((ingredient, ingredientIndex) => (
                      <li key={ingredientIndex} className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-full bg-transparent"
                          onClick={() => toggleIngredient(componentIndex, ingredientIndex)}
                        >
                          {isIngredientChecked(componentIndex, ingredientIndex) && <Check className="h-4 w-4" />}
                        </Button>
                        <span className={isIngredientChecked(componentIndex, ingredientIndex) ? "line-through text-muted-foreground" : ""}>
                          {ingredient.quantity && (
                            <span className="font-medium">{ingredient.quantity} </span>
                          )}
                          {ingredient.ingredient}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">
            Step {currentStep + 1} of {totalSteps}
          </h2>
          {recipe.steps[currentStep].time && (
            <StepTimer
              duration={recipe.steps[currentStep].time.duration}
              action={recipe.steps[currentStep].time.action}
            />
          )}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="mb-6">
        <div>
          <p className="text-xl mb-6">{recipe.steps[currentStep].instruction}</p>

          {recipe.steps[currentStep].ingredients.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">Ingredients for this step:</h3>
                <ul className="space-y-2">
                  {recipe.steps[currentStep].ingredients.map((ingredient, index) => (
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
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous Step
            </Button>

            <Button
              onClick={handleNextStep}
              disabled={currentStep === totalSteps - 1}
              className="flex items-center gap-2"
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
