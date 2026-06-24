import os
import re
import shutil
import subprocess
import sys


ALLOWED_SQLMAP_FLAGS = {
    "--batch": "Mode non interactif",
    "--dbs": "Lister les bases",
    "--tables": "Lister les tables",
    "--dump": "Extraire les donnees",
    "--random-agent": "User-Agent aleatoire",
}


SAFE_SCAN_FLAGS = ["--batch", "--level=1", "--risk=1", "--random-agent"]


def _is_valid_url(target_url):
    target_url = (target_url or "").strip()
    if not target_url:
        return False
    return bool(re.fullmatch(r"https?://[a-zA-Z0-9._~:/?#\[\]@!$&'()*+,;=%-]+", target_url))


def _resolve_sqlmap_command():
    """Retourne la commande sqlmap compatible Windows/Kali/Linux."""
    for candidate in ["sqlmap", "sqlmap.py", "sqlmap.bat"]:
        binary = shutil.which(candidate)
        if binary:
            if binary.lower().endswith(".py"):
                return [sys.executable, binary]
            return [binary]

    common_paths = [
        "/usr/bin/sqlmap",
        "/usr/local/bin/sqlmap",
        "/usr/share/sqlmap/sqlmap.py",
        r"C:\\sqlmap\\sqlmap.py",
    ]
    for path in common_paths:
        if os.path.exists(path):
            if path.lower().endswith(".py"):
                return [sys.executable, path]
            return [path]

    return None


def run_sqlmap_scan(target_url, selected_flags=None, safe_scan=False):
    """Lance sqlmap avec options controlees."""
    target_url = (target_url or "").strip()
    if not _is_valid_url(target_url):
        return "Erreur : URL invalide. Exemple attendu: https://site.tld/page.php?id=1"

    command_prefix = _resolve_sqlmap_command()
    if not command_prefix:
        return (
            "Erreur : SQLMap introuvable.\\n"
            "- Kali/Linux : sudo apt install sqlmap\\n"
            "- Windows : installe SQLMap puis ajoute-le au PATH"
        )

    selected_flags = selected_flags or []
    safe_scan = bool(safe_scan)

    if safe_scan:
        sqlmap_flags = SAFE_SCAN_FLAGS
    else:
        sqlmap_flags = [flag for flag in selected_flags if flag in ALLOWED_SQLMAP_FLAGS]
        if not sqlmap_flags:
            sqlmap_flags = ["--batch"]

    args = [*command_prefix, "-u", target_url, *sqlmap_flags]

    try:
        process = subprocess.run(args, capture_output=True, text=True, timeout=180)
        output = (process.stdout or "") + ("\n" + process.stderr if process.stderr else "")
        return output.strip() if output.strip() else "Aucune sortie SQLMap."
    except subprocess.TimeoutExpired:
        return "Erreur : SQLMap a depasse le temps limite (180s)."
    except Exception as e:
        return f"Erreur systeme : {str(e)}"
