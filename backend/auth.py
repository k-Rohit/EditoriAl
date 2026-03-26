"""
Supabase JWT auth dependency for FastAPI.
Verifies the Bearer token from the Authorization header.
"""

import os
import jwt
from fastapi import Depends, HTTPException, Request


SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency that extracts and verifies the Supabase JWT.
    Returns the decoded payload (contains sub, email, etc.).
    """
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(500, "Server auth not configured (missing SUPABASE_JWT_SECRET)")

    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")

    token = auth_header[7:]
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
