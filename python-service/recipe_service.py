import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from recipe_scrapers import scrape_me, scrape_html, SCRAPERS
import logging
import time
import traceback

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy', 
        'supported_sites': len(SCRAPERS),
        'version': '1.0.0',
        'environment': 'development'
    })

@app.route('/extract', methods=['POST'])
def extract_recipe():
    start_time = time.time()
    
    try:
        data = request.json
        url = data.get('url')
        html = data.get('html')
        
        if not url and not html:
            return jsonify({
                'success': False, 
                'error': 'Either URL or HTML content required'
            }), 400
        
        # Try scraping
        if url:
            logger.info(f"Scraping recipe from URL: {url}")
            scraper = scrape_me(url)
            source_method = 'url_direct'
        else:
            logger.info("Scraping recipe from provided HTML")
            source_url = data.get('source_url', '')
            scraper = scrape_html(html, org_url=source_url)
            source_method = 'html_content'
        
        # Extract recipe data
        recipe_data = {
            'title': safe_extract(scraper.title),
            'ingredients': safe_extract(scraper.ingredients) or [],
            'instructions': safe_extract(scraper.instructions) or [],
            'prep_time': safe_extract(scraper.prep_time),
            'cook_time': safe_extract(scraper.cook_time),
            'total_time': safe_extract(scraper.total_time),
            'yields': safe_extract(scraper.yields),
            'image': safe_extract(scraper.image),
            'nutrients': safe_extract(scraper.nutrients),
            'description': safe_extract(scraper.description),
            'canonical_url': safe_extract(scraper.canonical_url),
            'host': safe_extract(scraper.host),
            'site_name': safe_extract(scraper.site_name),
            'author': safe_extract(scraper.author),
            'cuisine': safe_extract(scraper.cuisine),
            'category': safe_extract(scraper.category)
        }
        
        # Validate minimum requirements
        if not recipe_data['title'] or not recipe_data['ingredients']:
            return jsonify({
                'success': False,
                'error': 'Recipe must have title and ingredients',
                'partial_data': recipe_data
            }), 422
        
        duration = time.time() - start_time
        
        return jsonify({
            'success': True,
            'recipe': recipe_data,
            'metadata': {
                'extraction_time': duration,
                'source_method': source_method,
                'scraper_host': recipe_data['host'],
                'scraper_site': recipe_data['site_name'],
                'ingredients_count': len(recipe_data['ingredients']),
                'instructions_count': len(recipe_data['instructions'])
            }
        })
        
    except Exception as e:
        duration = time.time() - start_time
        error_msg = str(e)
        logger.error(f"Recipe extraction failed: {error_msg}")
        logger.error(traceback.format_exc())
        
        return jsonify({
            'success': False,
            'error': error_msg,
            'metadata': {
                'extraction_time': duration,
                'error_type': type(e).__name__
            }
        }), 500

def safe_extract(func):
    """Safely extract data from scraper methods"""
    try:
        result = func()
        return result if result is not None else None
    except Exception as e:
        logger.warning(f"Failed to extract data: {e}")
        return None

@app.route('/supported-sites', methods=['GET'])
def supported_sites():
    return jsonify({
        'sites': list(SCRAPERS.keys()),
        'count': len(SCRAPERS)
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True) 