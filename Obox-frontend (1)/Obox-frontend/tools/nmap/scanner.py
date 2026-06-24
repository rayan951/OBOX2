import re
import subprocess
import os
import platform
import shutil


ALLOWED_NMAP_FLAGS = {
    "-F": "Fast scan",
    "-sV": "Detection de version",
    "-O": "Detection OS",
    "-Pn": "No ping",
    "-T4": "Timing rapide",
}


SAFE_SCAN_FLAGS = ["-F", "-sV", "--script", "safe", "-T2"]


def _is_valid_target(target_ip):
    """Validation simple: host/ip (caracteres autorises uniquement)."""
    return bool(re.fullmatch(r"[a-zA-Z0-9._:-]+", target_ip or "")) #Empeche command injection


def _resolve_nmap_binary():
    """
    Trouve l'executable nmap selon l'OS.
    Compatible Windows + Kali/Linux.
    """
    # 1) Cas standard: nmap disponible dans le PATH
    for candidate in ["nmap", "nmap.exe"]:
        binary = shutil.which(candidate)
        if binary:
            return binary

    # 2) Chemins frequents Windows
    if platform.system().lower().startswith("win"):
        windows_candidates = [
            r"C:\Program Files\Nmap\nmap.exe",
            r"C:\Program Files (x86)\Nmap\nmap.exe",
        ]

        for path in windows_candidates:
            if os.path.exists(path):
                return path

    # 3) Chemins frequents Linux/Kali
    linux_candidates = [
        "/usr/bin/nmap",
        "/usr/local/bin/nmap",
        "/bin/nmap",
    ]

    for path in linux_candidates:
        if os.path.exists(path):
            return path

    return None


def run_nmap_scan(target_ip, selected_flags=None, safe_scan=False):
    """
    Lance un scan Nmap sur la cible donnee avec options controlees.
    Retourne le résultat sous forme de string.
    """
    target_ip = (target_ip or "").strip()
    if not target_ip:
        return "Erreur : Aucune IP fournie."

    if not _is_valid_target(target_ip):
        return "Erreur : Cible invalide."

    try:
        nmap_binary = _resolve_nmap_binary()
        if not nmap_binary:
            return (
                "Erreur : Nmap introuvable.\\n"
                "- Windows : installe Nmap puis ajoute-le au PATH\\n"
                "- Kali/Linux : sudo apt install nmap"
            )

        selected_flags = selected_flags or []
        safe_scan = bool(safe_scan)

        if safe_scan:
            nmap_flags = SAFE_SCAN_FLAGS
        else:
            nmap_flags = [flag for flag in selected_flags if flag in ALLOWED_NMAP_FLAGS]
            if not nmap_flags:
                nmap_flags = ["-F"]

        args = [nmap_binary, *nmap_flags, target_ip]

        # Exécution
        process = subprocess.run(args, capture_output=True, text=True, timeout=60)

        if process.returncode == 0:
            return process.stdout
        else:
            return f"Erreur Nmap :\n{process.stderr}"

    except Exception as e:
        return f"Erreur système : {str(e)}"