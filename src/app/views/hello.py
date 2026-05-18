"""Hello views (routes).

Provides both HTML page rendering and JSON API endpoints for Hello resources.
Demonstrates the React Islands pattern where Flask serves HTML with
data-island mount points that React hydrates on the client.
"""
from flask import Blueprint, render_template, jsonify, request, abort
from pydantic import ValidationError
from ..controllers import HelloController
from ..schemas import HelloCreate, HelloResponse

hello_bp = Blueprint('hello', __name__)
hello_api_bp = Blueprint('hello_api', __name__)


@hello_bp.route('/')
def index():  # type: ignore[no-untyped-def]
    """Render the hello page with React island mount point.

    Serves HTML that includes a [data-island="hello"] element
    which the frontend JavaScript will hydrate with React.
    """
    hellos = HelloController.get_all()
    hellos_data = [HelloResponse.model_validate(h).model_dump() for h in hellos]
    return render_template('hello/index.html', hellos=hellos_data)


@hello_api_bp.route('/api/hello', methods=['GET'])
def api_list():  # type: ignore[no-untyped-def]
    """Get all Hello records as JSON.

    Returns:
        JSON array of Hello objects with id, message, created_at
    """
    hellos = HelloController.get_all()
    return jsonify([HelloResponse.model_validate(h).model_dump() for h in hellos])


@hello_api_bp.route('/api/hello', methods=['POST'])
def api_create():  # type: ignore[no-untyped-def]
    """Create a new Hello record.

    Request body:
        {"message": "Your greeting text"}

    Returns:
        201: Created Hello object
        400: Validation error
    """
    try:
        data = HelloCreate.model_validate(request.json)
    except ValidationError as e:
        return jsonify(error="Validation Error", details=e.errors()), 400

    hello = HelloController.create(data)
    return jsonify(HelloResponse.model_validate(hello).model_dump()), 201


@hello_api_bp.route('/api/hello/<int:hello_id>', methods=['GET'])
def api_get(hello_id: int):  # type: ignore[no-untyped-def]
    """Get a single Hello record by ID.

    Args:
        hello_id: Primary key of the Hello record

    Returns:
        200: Hello object
        404: Not found
    """
    hello = HelloController.get_by_id(hello_id)
    if not hello:
        abort(404)
    return jsonify(HelloResponse.model_validate(hello).model_dump())


@hello_api_bp.route('/api/hello/<int:hello_id>', methods=['DELETE'])
def api_delete(hello_id: int):  # type: ignore[no-untyped-def]
    """Delete a Hello record by ID.

    Args:
        hello_id: Primary key of the Hello record

    Returns:
        204: Successfully deleted
        404: Not found
    """
    if HelloController.delete(hello_id):
        return '', 204
    abort(404)
