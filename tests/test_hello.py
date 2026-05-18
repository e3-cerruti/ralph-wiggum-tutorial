"""Tests for Hello routes and functionality.

Tests both the HTML page rendering and JSON API endpoints.
Ensures the MVC pattern works correctly end-to-end.
"""
from __future__ import annotations

import json
from typing import Any

from flask.testing import FlaskClient

Client = FlaskClient[Any]


class TestHelloPage:
    """Tests for the main HTML page."""

    def test_index_returns_html(self, client: Client) -> None:
        """GET / should return HTML page."""
        response = client.get('/')
        assert response.status_code == 200
        assert b'Hello World' in response.data

    def test_index_contains_island_mount(self, client: Client) -> None:
        """Index page should contain React island mount point."""
        response = client.get('/')
        assert b'data-island="hello"' in response.data
        assert b'data-island="space-invaders"' in response.data


class TestHelloAPI:
    """Tests for the Hello JSON API."""

    def test_list_empty(self, client: Client) -> None:
        """GET /api/hello should return empty list initially."""
        response = client.get('/api/hello')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == []

    def test_create_hello(self, client: Client) -> None:
        """POST /api/hello should create a new greeting."""
        response = client.post(
            '/api/hello',
            json={'message': 'Test greeting'},
            content_type='application/json'
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['message'] == 'Test greeting'
        assert 'id' in data
        assert 'created_at' in data

    def test_create_hello_validation(self, client: Client) -> None:
        """POST /api/hello should validate input."""
        # Empty message
        response = client.post(
            '/api/hello',
            json={'message': ''},
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_list_after_create(self, client: Client) -> None:
        """GET /api/hello should return created items."""
        # Create a hello
        client.post(
            '/api/hello',
            json={'message': 'List test'},
            content_type='application/json'
        )

        # List should contain it
        response = client.get('/api/hello')
        data = json.loads(response.data)
        assert len(data) == 1
        assert data[0]['message'] == 'List test'

    def test_get_hello_by_id(self, client: Client) -> None:
        """GET /api/hello/<id> should return specific greeting."""
        # Create a hello
        create_response = client.post(
            '/api/hello',
            json={'message': 'Get by ID test'},
            content_type='application/json'
        )
        hello_id = json.loads(create_response.data)['id']

        # Get by ID
        response = client.get(f'/api/hello/{hello_id}')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Get by ID test'

    def test_get_hello_not_found(self, client: Client) -> None:
        """GET /api/hello/<id> should return 404 for missing ID."""
        response = client.get('/api/hello/99999')
        assert response.status_code == 404

    def test_delete_hello(self, client: Client) -> None:
        """DELETE /api/hello/<id> should remove greeting."""
        # Create a hello
        create_response = client.post(
            '/api/hello',
            json={'message': 'Delete test'},
            content_type='application/json'
        )
        hello_id = json.loads(create_response.data)['id']

        # Delete it
        response = client.delete(f'/api/hello/{hello_id}')
        assert response.status_code == 204

        # Verify it's gone
        get_response = client.get(f'/api/hello/{hello_id}')
        assert get_response.status_code == 404

    def test_delete_not_found(self, client: Client) -> None:
        """DELETE /api/hello/<id> should return 404 for missing ID."""
        response = client.delete('/api/hello/99999')
        assert response.status_code == 404


class TestErrorHandlers:
    """Tests for error handling."""

    def test_404_html(self, client: Client) -> None:
        """404 should return HTML for browser requests."""
        response = client.get('/nonexistent')
        assert response.status_code == 404
        assert b'Page Not Found' in response.data or b'404' in response.data

    def test_404_json(self, client: Client) -> None:
        """404 should return JSON for API requests."""
        response = client.get(
            '/nonexistent',
            headers={'Accept': 'application/json'}
        )
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
