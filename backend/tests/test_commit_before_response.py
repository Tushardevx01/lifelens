"""Regression tests: mutations must be committed before the response is sent."""

from httpx import AsyncClient


async def test_created_entry_is_immediately_readable(
    client: AsyncClient, auth_headers: dict, sample_entry_data: dict
):
    created = await client.post(
        "/api/entries/", json=sample_entry_data, headers=auth_headers
    )
    assert created.status_code == 201, created.text

    fetched = await client.get(
        f"/api/entries/{sample_entry_data['date']}", headers=auth_headers
    )
    assert fetched.status_code == 200, fetched.text
    assert fetched.json()["date"] == sample_entry_data["date"]


async def test_deleted_entry_is_immediately_gone(
    client: AsyncClient, auth_headers: dict, sample_entry_data: dict
):
    created = await client.post(
        "/api/entries/", json=sample_entry_data, headers=auth_headers
    )
    assert created.status_code == 201, created.text

    deleted = await client.delete(
        f"/api/entries/{sample_entry_data['date']}", headers=auth_headers
    )
    assert deleted.status_code == 200, deleted.text

    fetched = await client.get(
        f"/api/entries/{sample_entry_data['date']}", headers=auth_headers
    )
    assert fetched.status_code == 404, fetched.text
