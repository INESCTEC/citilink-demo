# app.py
from flask import Flask, request, make_response, g, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flasgger import Swagger
from mongoengine import connect, disconnect, get_connection
import redis
import os
import time
from werkzeug.middleware.proxy_fix import ProxyFix

from config import Config
from utils.directory import ensure_directories
from database_init import initialize_database, check_database_status

from blueprints.public import public_bp
from blueprints.uploads import uploads_bp
from blueprints.devgate import devgate_bp
from blueprints.newsletter import newsletter_bp
from blueprints.logs import logs_bp
from logger import setup_logger
import uuid

def create_app(config_class=Config):
    logger = setup_logger(__name__)
    logger.info('Starting CitiLink Backend')
    
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # CORS
    CORS(app,
         resources={r"/*": {"origins": ["http://localhost:5173", "http://localhost:80", "http://localhost", "http://20.199.8.215", "https://citilink.inesctec.pt", "http://citilink.inesctec.pt", "https://demo.citilink.inesctec.pt", "https://app.citilink.inesctec.pt", "http://app.citilink.inesctec.pt", "https://api.citilink.inesctec.pt", "http://api.citilink.inesctec.pt"]}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"])
    
    # JWT
    jwt = JWTManager(app)
    
    # Swagger/Flasgger configuration
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": 'apispec',
                "route": '/apispec.json',
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/api/docs/"
    }
    
    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "CitiLink API",
            "description": "API documentation for CitiLink - Platform for exploring municipal council meeting minutes",
            "version": "0.1.0",
            "contact": {
                "name": "CitiLink Team",
                "url": "https://citilink.inesctec.pt"
            }
        },
        "host": app.config.get("API_HOST", "localhost:5059"),
        "basePath": "/",
        "schemes": ["http", "https"],
        "tags": [
            {
                "name": "Public",
                "description": "Public endpoints accessible without authentication"
            },
            {
                "name": "Minutes",
                "description": "Operations related to meeting minutes (atas)"
            },
            {
                "name": "City Councils",
                "description": "Operations related to municipalities"
            },
            {
                "name": "Topics",
                "description": "Operations related to topics"
            },
            {
                "name": "Subjects",
                "description": "Operations related to subjects"
            },
            {
                "name": "Participants",
                "description": "Operations related to participants"
            },
            {
                "name": "Search",
                "description": "Search and filtering operations"
            },
            {
                "name": "Files",
                "description": "File download and viewing operations"
            },
            {
                "name": "Voting",
                "description": "Voting information and statistics"
            }
        ]
    }
    
    Swagger(app, config=swagger_config, template=swagger_template)
    
    logger.info("Waiting for MongoDB to be ready...")
    time.sleep(10)
    
    # db - mongo
    connect(
        host=app.config["MONGO_URI_DEMO"],
        alias="default"
    )

    logger.info(f"Connected to {get_connection(alias='default').address}")
    
    try:
        logger.info("Initializing demo database...")
        init_result_demo = initialize_database(
            db_name="citilink_demo",
            connection_alias="default",
            create_search_idx=True, 
            load_data=True 
        )
        logger.info(f"Demo database initialization: {init_result_demo['status']}")
        if init_result_demo.get('data_loading', {}).get('total_documents'):
            logger.info(f"Loaded {init_result_demo['data_loading']['total_documents']} documents into demo database")
        
    except Exception as e:
        logger.error(f"Database initialization error (non-fatal): {e}")

    
    # dirs
    ensure_directories(app.config)
    
    # blueprints w/ versioning
    app.register_blueprint(public_bp, url_prefix=f'/v0/public')
    app.register_blueprint(devgate_bp, url_prefix=f'/v0/devgate')
    app.register_blueprint(newsletter_bp, url_prefix=f'/v0/newsletter')
    app.register_blueprint(logs_bp, url_prefix=f'/v0/logs')
    
    # sem versão, porque à partida não vai mudar
    app.register_blueprint(uploads_bp, url_prefix='/uploads')
    
    # proxyfix!
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)
    
    return app

app = create_app()

@app.before_request
def ensure_anonymous_id():
    cookie_consent = request.cookies.get('cookieConsent')
    
    if cookie_consent in ['full', 'minimal']:
        user_id = request.cookies.get('anon_user_id')
        if not user_id:
            user_id = str(uuid.uuid4())
            g.set_anon_cookie = True  
        g.anon_user_id = user_id
    else:
        g.anon_user_id = None
        g.set_anon_cookie = False

@app.after_request
def set_anon_id_cookie(response):
    if getattr(g, 'set_anon_cookie', False) and getattr(g, 'anon_user_id', None):
        is_secure = request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https'
        response.set_cookie('anon_user_id', g.anon_user_id, max_age=60*60*24*365, 
                          secure=is_secure, httponly=True, samesite="Lax")  # 1 year
    
    cookie_consent = request.cookies.get('cookieConsent')
    if cookie_consent == 'declined' and request.cookies.get('anon_user_id'):
        is_secure = request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https'
        response.set_cookie('anon_user_id', '', expires=0, secure=is_secure)
    
    return response

if __name__ == "__main__":
    app.run(debug=True)