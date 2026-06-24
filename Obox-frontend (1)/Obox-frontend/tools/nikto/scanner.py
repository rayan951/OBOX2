import os
import re
import shutil
import subprocess


ALLOWED_NIKTO_PROFILES = {
    "surface": {"flags": ["-Display", "V"], "tuning": "123b"},
    "injection": {"tuning": "49"},
    "rce_upload": {"tuning": "78"},
    "cgi_deep": {"flags": ["-C", "all"]},
    "evasion": {"flags": ["-evasion", "1"]},
    "mutate_files": {"flags": ["-mutate", "1"]},
    "mutate_users": {"flags": ["-mutate", "6"]},
    "ssl": {"flags": ["-ssl"]},
    "no_dns": {"flags": ["-nolookup"]},
}


SAFE_SCAN_FLAGS = ["-ask", "no", "-maxtime", "120", "-Display", "V", "-Tuning", "123b"]
TUNING_ORDER = "0123456789abc"


def _is_valid_target(target_url):
    value = (target_url or "").strip()
    return bool(re.fullmatch(r"https?://[a-zA-Z0-9._~:/?#\[\]@!$&'()*+,;=%-]+", value))


def _resolve_nikto_binary():
    for candidate in ["nikto", "nikto.pl", "nikto.bat"]:
        binary = shutil.which(candidate)
        if binary:
            return binary

    for path in [
        "/usr/bin/nikto",
        "/usr/local/bin/nikto",
        "/usr/share/nikto/program/nikto.pl",
        r"C:\\nikto\\program\\nikto.pl",
    ]:
        if os.path.exists(path):
            return path

    return None


def _build_nikto_flags(selected_profiles, safe_scan):
    if safe_scan:
        return SAFE_SCAN_FLAGS

    selected_profiles = selected_profiles or []
    flags = ["-ask", "no"]
    tuning_chars = set()

    for profile in selected_profiles:
        profile_data = ALLOWED_NIKTO_PROFILES.get(profile, {})
        flags.extend(profile_data.get("flags", []))
        tuning_chars.update(c for c in profile_data.get("tuning", "") if c in TUNING_ORDER)

    if not selected_profiles:
        return ["-ask", "no", "-Display", "V", "-Tuning", "123b"]

    if tuning_chars:
        merged_tuning = "".join(c for c in TUNING_ORDER if c in tuning_chars)
        flags.extend(["-Tuning", merged_tuning])

    return flags


def run_nikto_scan(target_url, selected_profiles=None, safe_scan=False):
    target_url = (target_url or "").strip()
    if not _is_valid_target(target_url):
        return "Erreur : URL invalide. Exemple attendu: https://site.tld"

    nikto_binary = _resolve_nikto_binary()
    if not nikto_binary:
        return (
            "Erreur : Nikto introuvable.\n"
            "- Kali/Linux : sudo apt install nikto\n"
            "- Windows : installe Nikto puis ajoute-le au PATH"
        )

    nikto_flags = _build_nikto_flags(selected_profiles, safe_scan)

    args = [nikto_binary, "-h", target_url, *nikto_flags]

    try:
        process = subprocess.run(args, capture_output=True, text=True, timeout=180)
        output = (process.stdout or "") + ("\n" + process.stderr if process.stderr else "")
        return output.strip() if output.strip() else "Aucune sortie Nikto."
    except subprocess.TimeoutExpired:
        return "Erreur : Nikto a depasse le temps limite (180s)."
    except Exception as e:
        return f"Erreur systeme : {str(e)}"
