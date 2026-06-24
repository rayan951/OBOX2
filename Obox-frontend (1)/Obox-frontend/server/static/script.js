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

        // Couleur bleue pour les caractères (accord avec le logo)
        ctx.fillStyle = "#00b4ff";
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



// ============================================
// 6. REPORTING — Gestion des Vulnérabilités & PDF
// ============================================

var btnAddVuln = document.getElementById("btnAddVuln");
var vulnsContainer = document.getElementById("vulnsContainer");
var vulnCounter = 0;

function updateCvssColor(slider, outputElement) {
    let score = parseFloat(slider.value);
    outputElement.textContent = score.toFixed(1);
    
    let color = "#27ae60"; // green
    if (score >= 4.0) color = "#f1c40f"; // yellow
    if (score >= 7.0) color = "#e67e22"; // orange
    if (score >= 9.0) color = "#c0392b"; // red

    outputElement.style.color = color;
    
    // Fill background gradient for slider
    let percentage = (score / 10) * 100;
    slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #333 ${percentage}%, #333 100%)`;
}

if (btnAddVuln && vulnsContainer) {
    btnAddVuln.addEventListener("click", function() {
        vulnCounter++;
        var div = document.createElement("div");
        div.style.backgroundColor = "rgba(0,0,0,0.4)";
        div.style.border = "1px solid #444";
        div.style.borderRadius = "5px";
        div.style.padding = "20px";
        div.style.position = "relative";
        div.style.marginBottom = "20px";
        div.className = "vuln-dynamic-card";
        
        div.innerHTML = `
            <button type="button" style="position:absolute; top:15px; right:15px; background:transparent; color:#c0392b; border:1px solid #c0392b; border-radius:3px; padding:5px 10px; cursor:pointer; font-weight:bold; transition:all 0.3s;" onmouseover="this.style.background='#c0392b'; this.style.color='#fff';" onmouseout="this.style.background='transparent'; this.style.color='#c0392b';" onclick="this.parentElement.remove()">SUPPRIMER</button>
            <h4 style="margin-top:0; margin-bottom:15px; color:var(--primary-color);">[$] VULNÉRABILITÉ _${vulnCounter}</h4>
            
            <div style="display:flex; flex-direction:column; gap:15px;">
                <input type="text" class="v-title" placeholder="Titre (ex: SQL Injection, XSS...)" style="padding:10px; background:var(--bg-dark); color:var(--text-light); border:1px solid #333; width:100%; box-sizing:border-box; font-family:inherit;">
                
                <!-- Dynamic CVSS Slider -->
                <div style="background:var(--bg-dark); padding:15px; border:1px solid #333; border-radius:4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <label style="color:var(--text-light);">Score CVSS :</label>
                        <span class="v-cvss-display" style="font-size:24px; font-weight:bold; color:#27ae60;">0.0</span>
                    </div>
                    <input type="range" class="v-cvss" min="0" max="10" step="0.1" value="0" style="width:100%; cursor:pointer; outline:none; -webkit-appearance:none; height:8px; border-radius:4px; background:#333;">
                </div>

                <textarea class="v-context" rows="3" placeholder="Description / Contexte..." style="padding:10px; background:var(--bg-dark); color:var(--text-light); border:1px solid #333; width:100%; box-sizing:border-box; font-family:inherit; resize:vertical;"></textarea>
                <textarea class="v-poc" rows="3" placeholder="Preuve de faille (PoC)..." style="padding:10px; background:var(--bg-dark); color:var(--text-light); border:1px solid #333; width:100%; box-sizing:border-box; font-family:monospace; resize:vertical;"></textarea>
                <textarea class="v-reco" rows="3" placeholder="Remédiation recommandée..." style="padding:10px; background:var(--bg-dark); color:var(--text-light); border:1px solid #333; width:100%; box-sizing:border-box; font-family:inherit; resize:vertical;"></textarea>
            </div>
        `;
        
        let slider = div.querySelector(".v-cvss");
        let display = div.querySelector(".v-cvss-display");
        updateCvssColor(slider, display);
        
        slider.addEventListener("input", function() {
            updateCvssColor(slider, display);
        });

        vulnsContainer.appendChild(div);
    });
}

function getCvssSeverity(score) {
    if (score >= 9.0) return { color: "c0392b", text: "Critique" }; 
    if (score >= 7.0) return { color: "e67e22", text: "Elevé" };    
    if (score >= 4.0) return { color: "f1c40f", text: "Moyen" };    
    return { color: "27ae60", text: "Faible" };                     
}


  
  
  
  
  // ============================================
  // GENERATION PDF - Approche Native (Zero Bugs, Qualité Max)
  // ============================================
  var btnPdf = document.getElementById("btnPdf");
  if (btnPdf) {
      btnPdf.addEventListener("click", function() {
          const mission = document.getElementById("missionName").value.trim() || "Mission Inconnue";
          const target = document.getElementById("missionTarget").value.trim() || "Cible Inconnue";
          const date = document.getElementById("missionDate").value || "Date non définie";
          const operator = document.getElementById("missionOperator").value.trim() || "Auditeur Inconnu";
          
          let risk = "N/A";
          const riskSelected = document.querySelector('input[name="risk"]:checked');
          if (riskSelected) risk = riskSelected.value;
  
          const outils = [];
          document.querySelectorAll(".reporting-checkboxes input:checked").forEach(cb => outils.push(cb.value));
          const outilsStr = outils.length > 0 ? outils.join(", ") : "N/A";

          let vulnsHtml = "";
          const vulnForms = document.querySelectorAll(".vuln-dynamic-card");
          vulnForms.forEach((vForm) => {
              const title = vForm.querySelector(".v-title").value || "VULNÉRABILITÉ SANS TITRE";
              const cvss = parseFloat(vForm.querySelector(".v-cvss").value) || 0.0;
              const context = vForm.querySelector(".v-context").value || "N/A";
              const poc = vForm.querySelector(".v-poc").value || "N/A";
              const reco = vForm.querySelector(".v-reco").value || "N/A";
              const sev = getCvssSeverity(cvss);

              vulnsHtml += `
            <div class="vuln-card" style="page-break-inside: avoid; break-inside: avoid;">
                <div class="vuln-header" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <span class="vuln-title">${title.replace(/</g, "&lt;")}</span>
                    <div class="vuln-badge-group">
                        <span class="vuln-badge cvss">CVSS : ${cvss}</span>
                        <span class="vuln-badge severity" style="background-color: ${sev.color}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${sev.text}</span>
                    </div>
                </div>
                <div class="vuln-body">
                    <div class="vuln-section-label">Contexte & Exposition</div>
                    <div class="context-text">${context.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>
                    <div class="vuln-section-label">Preuve de Concept Technique (PoC)</div>
                    <div class="poc-block" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">${poc.replace(/</g, "&lt;")}</div>
                    <div class="vuln-section-label">Mesures de Remédiation Préconisées</div>
                    <div class="reco-block" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
                        <strong>Recommandations de sécurité :</strong><br>
                        ${reco.replace(/</g, "&lt;").replace(/\n/g, "<br>")}
                    </div>
                </div>
            </div>`;
          });

          // Fetch template from UI
          const tmplElement = document.getElementById("pdfCustomTemplate");
          if (!tmplElement) {
              alert("Template introuvable !");
              return;
          }
          let rawTemplate = tmplElement.value;

          // Process template injections safely
          let finalHtml = rawTemplate
              .replace(/__MISSION__/g, () => mission)
              .replace(/__CIBLE__/g, () => target)
              .replace(/__OPERATEUR__/g, () => operator)
              .replace(/__DATE__/g, () => date)
              .replace(/__RISQUE__/g, () => risk)
              .replace(/__OUTILS__/g, () => outilsStr)
              .replace(/__VULNS__/g, () => vulnsHtml);

          // Force background colors on print natively in CSS
          finalHtml += `
          <style>
              @media print {
                  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  @page { margin: 10mm; }
              }
          </style>
          `;

          // Création d'une iframe invisible pour imprimer (MOTEUR NATIF)
          const printIframe = document.createElement('iframe');
          printIframe.style.visibility = 'hidden';
          printIframe.style.position = 'absolute';
          printIframe.style.bottom = '0';
          printIframe.style.right = '0';
          document.body.appendChild(printIframe);

          const iframeDoc = printIframe.contentWindow.document;
          iframeDoc.open();
          iframeDoc.write(finalHtml);
          iframeDoc.close();

          // Lancer l'impression et nettoyer
          setTimeout(() => {
              // Le titre de la popup sert de nom de fichier PDF par défaut dans beaucoup de navigateurs
              iframeDoc.title = 'Rapport_' + mission.replace(/ /g, '_'); 
              printIframe.contentWindow.focus();
              printIframe.contentWindow.print();
              setTimeout(() => {
                  document.body.removeChild(printIframe);
              }, 2000);
          }, 500); // Laisse le temps aux polices CDNs Google de charger
      });
  }
