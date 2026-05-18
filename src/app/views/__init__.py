"""Views (routes) package.

Blueprint registration for all application routes.
Each view module defines a Blueprint with its routes.
"""
from flask import Flask


def register_blueprints(app: Flask) -> None:
    """Register all blueprints with the Flask application.

    Args:
        app: Flask application instance
    """
    from .space_invaders import space_invaders_bp
    from .hello import hello_bp, hello_api_bp

    app.register_blueprint(space_invaders_bp)
    app.register_blueprint(hello_bp, url_prefix='/hello')
    app.register_blueprint(hello_api_bp)
