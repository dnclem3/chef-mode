async function testRecipeExtraction() {
  const testUrl = 'https://www.allrecipes.com/recipe/158968/spinach-and-feta-turkey-burgers/'
  
  try {
    console.log('Testing recipe extraction with URL:', testUrl)
    
    const response = await fetch('http://localhost:3000/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Error:', data.error)
      return
    }

    console.log('Successfully extracted recipe:')
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error testing recipe extraction:', error)
  }
}

testRecipeExtraction() 