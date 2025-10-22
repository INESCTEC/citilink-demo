"""
Create this as a separate file to run the Celery worker
"""
from app import create_app
from celery_app import create_celery_app

# Create Flask app and Celery with app context
flask_app = create_app()
celery = create_celery_app(flask_app)

if __name__ == '__main__':
    # This allows running: python worker.py worker
    celery.start()