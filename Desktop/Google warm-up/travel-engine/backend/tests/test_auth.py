import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "newuser@travel.com",
        "password": "securepassword",
        "full_name": "New User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newuser@travel.com"
    assert data["user"]["full_name"] == "New User"
    assert "hashed_password" not in data["user"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"email": "dup@travel.com", "password": "pass123"}
    await client.post("/api/auth/register", json=payload)
    resp = await client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "login@travel.com",
        "password": "mypassword",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "login@travel.com",
        "password": "mypassword",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "wrongpass@travel.com",
        "password": "correct",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "wrongpass@travel.com",
        "password": "wrong",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    resp = await client.post("/api/auth/login", json={
        "email": "nobody@travel.com",
        "password": "pass",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "not-an-email",
        "password": "pass123",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_token_contains_user_id(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "tokencheck@travel.com",
        "password": "pass123",
    })
    data = resp.json()
    assert data["user"]["id"] is not None
    assert len(data["user"]["id"]) > 10  # UUID format
