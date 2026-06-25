// ============================================
// OBOX - Toolbox Pentest
// Fichier : script.js
// Rôle    : Gère toutes les interactions du site
//           (animation matrix, menu, accordéon, typing)
// ============================================


// ============================================
// 1. ANIMATION MATRIX (fond animé vert)
// ============================================

// On récupère l'élément <canvas> dans la page
var canvas = document.getElementById("matrix");

// On vérifie que le canvas existe (il n'est pas sur toutes les pages)
if (canvas) {

    // ctx = le "pinceau" qui permet de dessiner sur le canvas
    var ctx = canvas.getContext("2d");

    // Fonction qui adapte la taille du canvas à la fenêtre
    function redimensionnerCanvas() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // On appelle la fonction au démarrage
    redimensionnerCanvas();

    // Et aussi à chaque fois que l'utilisateur redimensionne sa fenêtre
    window.addEventListener("resize", redimensionnerCanvas);

    // Les caractères qui tombent dans l'animation
    var caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>[]{}";

    // Taille de chaque caractère en pixels
    var taillePolice = 13;

    // Tableau qui stocke la position verticale de chaque colonne de caractères
    var colonnes = [];

    // Fonction qui initialise les colonnes (une par tranche de pixels)
    function initialiserColonnes() {
        var nombreColonnes = Math.floor(canvas.width / taillePolice);
        colonnes = [];
        for (var i = 0; i < nombreColonnes; i++) {
            colonnes.push(1);
        }
    }

    // On initialise au démarrage et à chaque redimensionnement
    initialiserColonnes();
    window.addEventListener("resize", initialiserColonnes);

    // Fonction qui dessine une frame de l'animation
    function dessinerMatrix() {
        // Rectangle noir semi-transparent pour faire l'effet "traîne"
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Couleur verte pour les caractères
        ctx.fillStyle = "#00ff9c";
        ctx.font = taillePolice + "px monospace";

        // Pour chaque colonne, on dessine un caractère aléatoire
        for (var i = 0; i < colonnes.length; i++) {
            var indexAleatoire = Math.floor(Math.random() * caracteres.length);
            var caractere = caracteres[indexAleatoire];

            // On dessine le caractère à sa position
            ctx.fillText(caractere, i * taillePolice, colonnes[i] * taillePolice);

            // Quand une colonne atteint le bas, elle repart du haut (aléatoirement)
            if (colonnes[i] * taillePolice > canvas.height && Math.random() > 0.975) {
                colonnes[i] = 0;
            }

            // On descend la colonne d'un cran
            colonnes[i]++;
        }
    }

    // On répète l'animation toutes les 35ms (environ 28 fps)
    setInterval(dessinerMatrix, 35);
}


// ============================================
// 2. MENU HAMBURGER (ouverture/fermeture sidebar)
// ============================================

var boutonMenu = document.getElementById("menuToggle");
var sidebar    = document.getElementById("sidebar");
var overlay    = document.getElementById("overlay");

// Ces éléments n'existent que sur index.html
if (boutonMenu && sidebar && overlay) {

    // Clic sur le bouton hamburger = ouvrir ou fermer le menu
    boutonMenu.addEventListener("click", function() {
        boutonMenu.classList.toggle("active");
        sidebar.classList.toggle("active");
        overlay.classList.toggle("active");
    });

    // Clic sur la zone sombre derrière = fermer le menu
    overlay.addEventListener("click", fermerMenu);
}

// Fonction qui ferme le menu
function fermerMenu() {
    if (boutonMenu) boutonMenu.classList.remove("active");
    if (sidebar)    sidebar.classList.remove("active");
    if (overlay)    overlay.classList.remove("active");
}


// ============================================
// 3. NAVIGATION ENTRE LES SECTIONS
// ============================================
// Sur index.html, seule la section "home" est affichée/cachée.
// Les outils (nmap, hydra...) sont des pages séparées qui s'ouvrent
// dans un nouvel onglet grâce aux liens href dans la sidebar.

var pages = {
    home: document.getElementById("homePage")
};

// Fonction qui affiche une section et cache les autres
function afficherPage(nomPage) {
    // On cache tout
    for (var cle in pages) {
        if (pages[cle]) pages[cle].classList.remove("active");
    }
    // On affiche la bonne section
    if (pages[nomPage]) pages[nomPage].classList.add("active");

    fermerMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Pour chaque lien dans la sidebar
var liensMenu = document.querySelectorAll(".menu-item a");
liensMenu.forEach(function(lien) {
    lien.addEventListener("click", function(e) {
        var outil = lien.getAttribute("data-tool");

        // "Accueil" = on reste sur la même page
        if (outil === "home") {
            e.preventDefault();
            afficherPage("home");
        }
        // Autres outils = le lien s'ouvre dans un nouvel onglet (target="_blank")
    });
});

// Fonction utilisable depuis les boutons HTML (ex: onclick="showHome()")
function showHome() {
    afficherPage("home");
}

// Au chargement, on affiche l'accueil
if (pages.home) {
    pages.home.classList.add("active");
}


// ============================================
// 4. ACCORDÉON (sections dépliables)
// ============================================

var boutonsAccordeon = document.querySelectorAll(".accordion-btn");

boutonsAccordeon.forEach(function(bouton) {
    bouton.addEventListener("click", function() {

        // On récupère le bloc parent de ce bouton
        var item = bouton.closest(".accordion-item");
        var estOuvert = item.classList.contains("open");

        // On ferme tous les blocs ouverts
        document.querySelectorAll(".accordion-item.open").forEach(function(el) {
            el.classList.remove("open");
        });

        // Si le bloc était fermé, on l'ouvre
        if (!estOuvert) {
            item.classList.add("open");
        }
    });
});


// ============================================
// 5. ANIMATION TYPING (phrases défilantes)
// ============================================

var phrases = [
    "Bienvenue sur OBOX — votre arsenal de cybersécurité offensive.",
    "Chaque outil, une arme. Chaque test, une mission.",
    "Scannez. Exploitez. Documentez. Répétez.",
    "Accès autorisé uniquement. Opérez avec éthique et responsabilité.",
    "Red Team ready. Sélectionnez votre outil et commencez l'opération."
];

// L'élément HTML où le texte s'affiche
var zoneTexte = document.getElementById("typingText");

if (zoneTexte) {

    var indexPhrase  = 0;     // index de la phrase en cours
    var indexLettre  = 0;     // nombre de lettres affichées
    var enEffacement = false; // true = on efface, false = on écrit

    function animer() {
        var phraseActuelle = phrases[indexPhrase];

        if (!enEffacement) {
            // On ajoute une lettre
            indexLettre++;
            zoneTexte.textContent = phraseActuelle.slice(0, indexLettre);

            // Phrase complète = on attend 2,2s puis on efface
            if (indexLettre === phraseActuelle.length) {
                enEffacement = true;
                setTimeout(animer, 2200);
                return;
            }

        } else {
            // On enlève une lettre
            indexLettre--;
            zoneTexte.textContent = phraseActuelle.slice(0, indexLettre);

            // Tout effacé = on passe à la phrase suivante
            if (indexLettre === 0) {
                enEffacement = false;
                indexPhrase = (indexPhrase + 1) % phrases.length;
            }
        }

        // Effacement rapide (28ms), écriture plus lente (52ms)
        setTimeout(animer, enEffacement ? 28 : 52);
    }

    // Démarrage après 100ms
    setTimeout(animer, 100);
}