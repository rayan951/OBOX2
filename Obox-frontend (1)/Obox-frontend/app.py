from server import create_app

# Création de l'application via la factory
app = create_app()

if __name__ == '__main__':
    # Lancement du serveur
    app.run(debug=True, port=5000)