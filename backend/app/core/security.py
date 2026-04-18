from supertokens_python import init, InputAppInfo, SupertokensConfig
from supertokens_python.recipe import emailpassword, session, dashboard
from supertokens_python.framework.fastapi import get_middleware
from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session import SessionContainer

from app.core.config import (
    FRONTEND_DOMAIN,
    API_DOMAIN,
    SUPERTOKENS_CONNECTION_URI,
    SUPERTOKENS_API_KEY
)

def init_supertokens():
    """ Initialize SuperTokens Core configurations and recipes. """
    init(
        app_info=InputAppInfo(
            app_name="StockFreq AI",
            api_domain=API_DOMAIN,
            website_domain=FRONTEND_DOMAIN,
            api_base_path="/auth",
            website_base_path="/auth",
        ),
        supertokens_config=SupertokensConfig(
            connection_uri=SUPERTOKENS_CONNECTION_URI,
            api_key=SUPERTOKENS_API_KEY,
        ),
        framework="fastapi",
        recipe_list=[
            emailpassword.init(),
            session.init(),
            dashboard.init(),
        ],
        mode="asgi",
    )
