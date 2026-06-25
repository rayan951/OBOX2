from flask import Flask

def create_app():
    app = Flask(__name__)
    app.secret_key = "obox-secret-key-2026"

    # On importe les routes ici pour éviter les erreurs circulaires
    # Le 'with app.app_context()' n'est pas nécessaire ici mais bonne pratique
    from server.routes import configure_routes
    configure_routes(app)

    return app