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

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Handle recipe extraction requests"""
        start_time = time.time()
        
        try:
            # Check if recipe-scrapers is available
            if not SCRAPERS_AVAILABLE:
                self.send_error_response(500, 'Recipe scrapers not available')
                return
            
            # Parse request data
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error_response(400, 'No request body')
                return
                
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            url = data.get('url')
            html = data.get('html')
            
            if not url and not html:
                self.send_error_response(400, 'Either URL or HTML content required')
                return
            
            # Perform extraction
            if url:
                self.log_info(f"Scraping recipe from URL: {url}")
                scraper = scrape_me(url)
                source_method = 'url_direct'
            else:
                self.log_info("Scraping recipe from provided HTML")
                source_url = data.get('source_url', '')
                scraper = scrape_html(html, org_url=source_url)
                source_method = 'html_content'
            
            # Extract recipe data with safe extraction
            recipe_data = {
                'title': self.safe_extract(scraper.title),
                'ingredients': self.safe_extract(scraper.ingredients) or [],
                'instructions': self.safe_extract(scraper.instructions) or [],
                'prep_time': self.safe_extract(scraper.prep_time),
                'cook_time': self.safe_extract(scraper.cook_time),
                'total_time': self.safe_extract(scraper.total_time),
                'yields': self.safe_extract(scraper.yields),
                'image': self.safe_extract(scraper.image),
                'nutrients': self.safe_extract(scraper.nutrients),
                'description': self.safe_extract(scraper.description),
                'canonical_url': self.safe_extract(scraper.canonical_url),
                'host': self.safe_extract(scraper.host),
                'site_name': self.safe_extract(scraper.site_name),
                'author': self.safe_extract(scraper.author),
                'cuisine': self.safe_extract(scraper.cuisine),
                'category': self.safe_extract(scraper.category)
            }
            
            # Validate minimum requirements
            if not recipe_data['title'] or not recipe_data['ingredients']:
                self.send_error_response(422, 'Recipe must have title and ingredients', recipe_data)
                return
            
            duration = time.time() - start_time
            
            response_data = {
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
            
            self.send_success_response(response_data)
            
        except json.JSONDecodeError:
            self.send_error_response(400, 'Invalid JSON in request body')
        except Exception as e:
            duration = time.time() - start_time
            error_msg = str(e)
            self.log_error(f"Recipe extraction failed: {error_msg}")
            self.log_error(traceback.format_exc())
            
            error_response = {
                'success': False,
                'error': error_msg,
                'metadata': {
                    'extraction_time': duration,
                    'error_type': type(e).__name__
                }
            }
            
            self.send_error_response(500, error_msg, error_response)

    def do_GET(self):
        """Handle health check and info requests"""
        if self.path == '/api/python-extract':
            # Health check
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            health_data = {
                'status': 'healthy',
                'scrapers_available': SCRAPERS_AVAILABLE,
                'supported_sites_count': len(SCRAPERS) if SCRAPERS_AVAILABLE else 0,
                'version': '1.0.0',
                'environment': 'production'
            }
            
            self.wfile.write(json.dumps(health_data).encode())
        else:
            self.send_error_response(404, 'Not found')

    def safe_extract(self, func):
        """Safely extract data from scraper methods"""
        try:
            result = func()
            return result if result is not None else None
        except Exception as e:
            self.log_warning(f"Failed to extract data: {e}")
            return None

    def send_success_response(self, data):
        """Send successful JSON response"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def send_error_response(self, status_code, message, data=None):
        """Send error JSON response"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        error_data = {
            'success': False,
            'error': message
        }
        
        if data:
            error_data.update(data)
        
        self.wfile.write(json.dumps(error_data).encode())

    def log_info(self, message):
        """Log info message"""
        print(f"INFO: {message}")

    def log_warning(self, message):
        """Log warning message"""
        print(f"WARNING: {message}")

    def log_error(self, message):
        """Log error message"""
        print(f"ERROR: {message}") 