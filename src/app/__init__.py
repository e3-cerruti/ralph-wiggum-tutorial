"""Flask application factory and initialization."""
import os
from flask import Flask, request
from .config import config
from .models.base import db
from .logging_config import configure_logging


def _compute_vite_dev_server_url(app_config: dict[str, object]) -> str:
    """Compute the Vite dev server URL based on the request context.

    If accessed via a Codespaces forwarded URL, replace port 5000 with 5173.
    If accessed via localhost, use localhost:5173.
    """
    configured_url = app_config.get('VITE_DEV_SERVER')
    if isinstance(configured_url, str) and configured_url != '__VITE_DEV_SERVER_URL__':
        # Use explicitly configured URL
        return configured_url

    # Check for Codespaces forwarded headers FIRST (before localhost check)
    # X-Forwarded-Host contains the actual forwarded hostname
    forwarded_host = request.headers.get('X-Forwarded-Host')
    if forwarded_host:
        if '-5000' in forwarded_host:
            proto = request.headers.get('X-Forwarded-Proto', 'https')
            vite_host = forwarded_host.replace('-5000', '-5173')
            return f'{proto}://{vite_host}'

    # If accessing via localhost, use localhost:5173
    if 'localhost' in request.host or '127.0.0.1' in request.host:
        return 'http://localhost:5173'

    # Fallback
    return 'http://localhost:5173'


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask application.

    Uses the application factory pattern for flexibility in testing
    and deployment scenarios.

    Args:
        config_name: Configuration to use ('development', 'testing', 'production').
                    Defaults to FLASK_ENV environment variable or 'development'.

    Returns:
        Configured Flask application instance.
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Configure logging before other initialization
    configure_logging(app)

    # Initialize extensions
    db.init_app(app)

    # Initialize Flask-Migrate
    from flask_migrate import Migrate
    Migrate(app, db)

    # Register error handlers
    from .errors import register_error_handlers
    register_error_handlers(app)

    # Add context processor to compute Vite dev server URL per-request
    @app.context_processor
    def inject_vite_url() -> dict[str, str]:
        """Inject the computed Vite dev server URL into template context."""
        return {'VITE_DEV_SERVER': _compute_vite_dev_server_url(app.config)}

    # Register blueprints
    from .views import register_blueprints
    register_blueprints(app)

    return app
