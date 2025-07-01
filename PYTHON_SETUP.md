# Python Service Integration Setup

This guide will help you set up the Python service integration with recipe-scrapers for both local development and Vercel deployment.

## Quick Start

### 1. Install Python Dependencies (Local Development)

```bash
# Install Python dependencies for local development
npm run python:install
```

### 2. Create Environment Variables

Create a `.env.local` file in the root directory:

```env
# Python service (local development)
PYTHON_SERVICE_URL=http://localhost:5001/extract
PYTHON_SERVICE_TIMEOUT=30000

# Python + AI Enhancement (default: true)
PYTHON_AI_ENHANCEMENT=true

# OpenAI API configuration
OPENAI_API_KEY=your_openai_key_here
```

### 3. Start Development Servers

```bash
# Start both Python service and Next.js (recommended)
npm run dev:full

# Or start them separately:
# Terminal 1:
npm run python:dev

# Terminal 2:
npm run dev
```

## Architecture Overview

The implementation uses a **hybrid Python + AI enhancement strategy** for optimal results:

### Enhanced Flow (New)
1. **Primary**: Python service with recipe-scrapers extracts structured data
2. **Enhancement**: AI maps ingredients to specific cooking steps for better UX
3. **Fallback**: If Python fails → HTML extraction + AI (existing method)

### Extraction Methods
- **Python + AI Enhancement**: Best accuracy + intelligent ingredient mapping (default)
- **Python Basic**: Fast extraction without ingredient mapping (fallback when AI fails)
- **Pure AI**: HTML extraction + AI (ultimate fallback when Python unavailable)

### Benefits of Hybrid Approach
- **Accurate Data**: recipe-scrapers provides precise ingredients and instructions
- **Smart Mapping**: AI enhancement maps ingredients to relevant cooking steps
- **Better UX**: Ingredients appear exactly when needed during cooking
- **Cost Efficient**: Smaller AI calls (structured data vs raw HTML)
- **Graceful Degradation**: Multiple fallback layers ensure reliability

## Local Development

When running locally, the system will:
- Try to connect to Python service at `localhost:5001` (changed from 5000 to avoid macOS AirPlay conflicts)
- Use AI enhancement by default to map ingredients to cooking steps
- If Python service unavailable, gracefully fall back to pure AI extraction
- Log detailed extraction attempts and performance metrics

### Configuration Options

You can control the enhancement behavior via environment variables:

```bash
# Enable/disable AI enhancement (default: true)
PYTHON_AI_ENHANCEMENT=true

# Disable AI enhancement for faster, basic extraction
PYTHON_AI_ENHANCEMENT=false

# Custom Python service URL
PYTHON_SERVICE_URL=http://localhost:5001/extract

# Timeout for Python service calls (default: 30000ms)
PYTHON_SERVICE_TIMEOUT=45000
```

## Production Deployment

### Vercel Functions
The Python functionality is deployed as a Vercel Function at `/api/python-extract`:
- Automatic dependency management via `requirements.txt`
- Configured in `vercel.json` for Python 3.9 runtime
- CORS-enabled for Next.js integration

### Environment Variables (Vercel Dashboard)
Set these in your Vercel project settings:
```
OPENAI_API_KEY=your_openai_key_here
```

## Testing

### Local Testing
```bash
# Test Python service health
curl http://localhost:5001/health

# Test Python service extraction directly
curl -X POST http://localhost:5001/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.allrecipes.com/recipe/25473/the-perfect-basic-burger/"}'

# Test extraction via Next.js API (with AI enhancement)
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.allrecipes.com/recipe/25473/the-perfect-basic-burger/"}'

# Check supported sites
curl http://localhost:5001/supported-sites
```

### Production Testing
```bash
# Test Vercel Python function
curl https://your-app.vercel.app/api/python-extract

# Test main extraction API
curl -X POST https://your-app.vercel.app/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.allrecipes.com/recipe/158968/spinach-and-feta-turkey-burgers/"}'
```

## Benefits

### Data Accuracy & User Experience
- **Higher Accuracy**: recipe-scrapers supports 500+ websites with structured data parsing
- **Smart Ingredient Mapping**: AI enhancement maps ingredients to specific cooking steps
- **Better Cooking Experience**: Ingredients appear exactly when needed during cooking
- **Timing Extraction**: Automatic extraction of cooking times from instructions

### Performance & Cost
- **Better Performance**: Structured data extraction is faster than full HTML processing
- **Cost Efficiency**: Reduces OpenAI API calls by ~70-80% for supported sites
- **Smaller AI Calls**: Enhancement uses structured data vs raw HTML, reducing token usage
- **Graceful Degradation**: Multiple fallback layers ensure reliability

### Development & Deployment
- **Single Deployment**: Everything deployed to Vercel for simplicity
- **Environment-Aware**: Automatically detects local vs production environments
- **Configurable**: Fine-tune enhancement behavior via environment variables

## Supported Sites

The recipe-scrapers library supports hundreds of recipe websites including:
- AllRecipes
- Food Network
- BBC Good Food
- Serious Eats
- King Arthur Baking
- And many more...

Check supported sites: `curl http://localhost:5001/supported-sites`

## Troubleshooting

### Python Service Won't Start
```bash
# Check Python installation
python --version

# Install dependencies manually
cd python-service
pip install -r requirements.txt

# Start service (uses port 5001 to avoid macOS AirPlay conflicts)
python recipe_service.py

# If port 5001 is busy, check what's using it
lsof -i :5001
```

### AI Enhancement Issues
```bash
# Disable AI enhancement if having issues
export PYTHON_AI_ENHANCEMENT=false

# Check OpenAI API key is set
echo $OPENAI_API_KEY

# View detailed logs in browser developer tools or server logs
```

### Vercel Deployment Issues
- Ensure `requirements.txt` is in the root directory
- Check `vercel.json` configuration
- Verify Python runtime version compatibility

### Extraction Failures
The system logs detailed extraction attempts. Check:
- Network connectivity for URL fetching
- Python service health (local development)
- OpenAI API key configuration
- Vercel function logs (production)

## File Structure

```
chef-mode/
├── python-service/          # Local development only
│   ├── requirements.txt     # Python dependencies
│   ├── recipe_service.py    # Flask service
│   └── .gitignore
├── api/
│   ├── extract/
│   │   └── route.ts        # Main extraction API
│   └── python-extract.py   # Vercel Python function
├── lib/
│   └── recipe-extractor.ts # Enhanced with Python integration
├── requirements.txt         # Root level for Vercel
├── vercel.json             # Vercel configuration
└── package.json            # Updated with Python scripts
``` 