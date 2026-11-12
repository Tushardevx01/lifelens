"""APIRoute that commits the request DB session before the response is sent.

FastAPI runs the cleanup of ``yield`` dependencies (including ``get_db``'s
commit) only after the response has been sent. That leaves a window where a
client receives a 2xx response but an immediate follow-up request still sees
the old state, and a failed post-response commit would be reported as success.
Committing in the route handler closes that window.
"""

from fastapi import Request
from fastapi.routing import APIRoute
from starlette.responses import Response

SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


class CommitRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def handler(request: Request) -> Response:
            response = await original(request)
            db = getattr(request.state, "db", None)
            if db is not None and request.method not in SAFE_METHODS:
                if 200 <= response.status_code < 300:
                    await db.commit()
                else:
                    await db.rollback()
            return response

        return handler
