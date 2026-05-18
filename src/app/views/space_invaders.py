"""Space Invaders view (route).

Serves the Space Invaders game page on the home route.
Demonstrates the React Islands pattern where Flask serves HTML with
a data-island mount point that React hydrates on the client.
"""
from flask import Blueprint, render_template
from ..controllers import HelloController
from ..schemas import HelloResponse

space_invaders_bp = Blueprint('space_invaders', __name__)


@space_invaders_bp.route('/')
def index():  # type: ignore[no-untyped-def]
    """Render the Space Invaders game page with the hello island.

    Serves HTML that includes both:
    - [data-island="space-invaders"] element for the game
    - [data-island="hello"] element for the hello form

    Both islands are hydrated by the frontend JavaScript.
    """
    hellos = HelloController.get_all()
    hellos_data = [HelloResponse.model_validate(h).model_dump() for h in hellos]
    return render_template('space-invaders/index.html', hellos=hellos_data)
