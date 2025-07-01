from http.server import BaseHTTPRequestHandler
import json
import traceback
import time
from urllib.parse import urlparse

# Import recipe-scrapers
try:
    from recipe_scrapers import scrape_me, scrape_html, SCRAPERS
    SCRAPERS_AVAILABLE = True
except ImportError:
    SCRAPERS_AVAILABLE = False

def extract_recipe(url=None, html=None, source_url=None):
    """Extract recipe data from URL or HTML content"""
    start_time = time.time()
    
    try:
        # Check if recipe-scrapers is available
        if not SCRAPERS_AVAILABLE:
            return {
                'success': False,
                'error': 'Recipe scrapers not available'
            }
        
        if not url and not html:
            return {
                'success': False,
                'error': 'Either URL or HTML content required'
            }
        
        # Perform extraction
        if url:
            print(f"Scraping recipe from URL: {url}")
            scraper = scrape_me(url)
            source_method = 'url_direct'
        else:
            print("Scraping recipe from provided HTML")
            scraper = scrape_html(html, org_url=source_url or '')
            source_method = 'html_content'
        
        # Extract recipe data with safe extraction
        def safe_extract(func):
            try:
                result = func()
                return result if result is not None else None
            except Exception as e:
                print(f"Failed to extract data: {e}")
                return None
        
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
            return {
                'success': False,
                'error': 'Recipe must have title and ingredients',
                'partial_data': recipe_data
            }
        
        duration = time.time() - start_time
        
        return {
            'success': True,
            'recipe': recipe_data,
            'metadata': {
                'extraction_time': duration,
                'source_method': source_method,
                'scraper_host': recipe_data['host'],
                'scraper_site': recipe_data['site_name'],
                'ingredients_count': len(recipe_data['ingredients']),
                'instructions_count': len(recipe_data['instructions']),
                'supported_sites_count': len(SCRAPERS) if SCRAPERS_AVAILABLE else 0
            }
        }
        
    except Exception as e:
        duration = time.time() - start_time
        error_msg = str(e)
        print(f"Recipe extraction failed: {error_msg}")
        print(traceback.format_exc())
        
        return {
            'success': False,
            'error': error_msg,
            'metadata': {
                'extraction_time': duration,
                'error_type': type(e).__name__
            }
        }

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            result = extract_recipe(
                url=data.get('url'),
                html=data.get('html'),
                source_url=data.get('source_url')
            )
            
            self.send_response(200 if result['success'] else 422)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            self.wfile.write(json.dumps(result).encode())
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': 'Invalid JSON in request body'
            }).encode())
        except Exception as e:
            print('❌ Unexpected error:', e)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': str(e)
            }).encode()) 