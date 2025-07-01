#!/usr/bin/env tsx

import { extractRecipeWithFallback } from '../lib/recipe-extractor'

async function testPythonAIExtraction() {
  console.log('🧪 TESTING PYTHON + AI EXTRACTION')
  console.log('='.repeat(50))
  
  // Test URLs - variety of popular recipe sites
  const testUrls = [
    'https://www.allrecipes.com/recipe/25473/the-perfect-basic-burger/',
    // Add more test URLs as needed
  ]
  
  for (const url of testUrls) {
    console.log(`\n🔍 Testing URL: ${url}`)
    console.log('-'.repeat(80))
    
    try {
      const startTime = performance.now()
      const { recipe, log } = await extractRecipeWithFallback(url)
      const endTime = performance.now()
      
      console.log('\n🎯 FINAL RESULTS:')
      console.log('Title:', recipe.title)
      console.log('Steps:', recipe.steps.length)
      console.log('Total Ingredients:', recipe.subcomponents.reduce((total, sub) => total + sub.ingredients.length, 0))
      console.log('Steps with Ingredients:', recipe.steps.filter(step => step.ingredients.length > 0).length)
      console.log('Source URL:', recipe.sourceUrl)
      console.log('Total Time:', `${(endTime - startTime).toFixed(2)}ms`)
      
      // Show step-by-step ingredient mapping (key feature of AI enhancement)
      console.log('\n🧩 STEP-BY-STEP INGREDIENT MAPPING:')
      recipe.steps.forEach((step, index) => {
        console.log(`Step ${index + 1}: ${step.instruction.substring(0, 60)}...`)
        if (step.ingredients.length > 0) {
          step.ingredients.forEach(ing => {
            console.log(`  - ${ing.quantity} ${ing.ingredient}`)
          })
        } else {
          console.log('  - No specific ingredients for this step')
        }
      })
      
    } catch (error) {
      console.error('Test failed:', error)
    }
    
    console.log('\n' + '='.repeat(80))
  }
}

// Run the test
testPythonAIExtraction().catch(console.error) 