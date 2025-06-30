export interface Ingredient {
  quantity: string
  ingredient: string
}

export interface Time {
  duration: string
  action: string
}

export interface Step {
  instruction: string
  ingredients: Ingredient[]
  time: Time | null
}

export interface Subcomponent {
  name: string
  ingredients: Ingredient[]
}

export interface Recipe {
  title: string
  subcomponents: Subcomponent[]
  steps: Step[]
  sourceUrl?: string | null
} 