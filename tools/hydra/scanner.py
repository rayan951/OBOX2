import os
import platform
import re
import shutil
import subprocess


ALLOWED_HYDRA_FLAGS = {
    "-f": "Stop au premier succes",
    "-u": "Essais rapides par utilisateur",
    "-I": "Ignorer restore file",
    "-V": "Sortie verbeuse",
    "-e nsr": "Essais null/login reverse",
}


SAFE_SCAN_FLAGS = ["-f", "-I", "-t", "2"]
DEFAULT_HYDRA_SERVICES = sorted({
    "adam6500", "asterisk", "cisco", "cisco-enable", "cvs", "firebird", "ftp", "ftps",
    "http-get", "http-head", "http-post-form", "http-proxy", "http-proxy-urlenum",
    "https-get", "https-head", "https-post-form", "imap", "imaps", "irc", "ldap2", "ldap3",
    "mssql", "mysql", "nntp", "oracle-listener", "oracle-sid", "pcanywhere", "pcnfs", "pop3",
    "pop3s", "postgres", "rdp", "redis", "rexec", "rlogin", "rsh", "s7-300", "sapr3",
    "sip", "smb", "smtp", "smtps", "snmp", "socks5", "ssh", "sshkey", "svn", "teamspeak",
    "telnet", "telnets", "vmauthd", "vnc", "xmpp",
})


def _project_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def list_hydra_wordlists():
    exts = {".txt", ".lst", ".list", ".dic", ".dict", ".pwd"}
    roots = [
        os.path.join(_project_root(), "wordlists"),
        "/usr/share/wordlists",
        "/usr/share/seclists/Passwords",
        r"C:\\wordlists",
        r"C:\\SecLists\\Passwords",
    ]
    found = []
    seen = set()

    for root in roots:
        if not os.path.isdir(root):
            continue
        root_depth = root.rstrip(os.sep).count(os.sep)
        for current_root, dirs, files in os.walk(root):
            if current_root.count(os.sep) - root_depth >= 2:
                dirs[:] = []
            for filename in files:
                _, ext = os.path.splitext(filename)
                if ext.lower() not in exts:
                    continue
                full_path = os.path.abspath(os.path.join(current_root, filename))
                if full_path in seen:
                    continue
                seen.add(full_path)
                found.append(full_path)
                if len(found) >= 120:
                    return sorted(found)

    return sorted(found)


def _extract_services_from_help(text):
    marker = "supported services:"
    lowered = text.lower()
    idx = lowered.find(marker)
    if idx < 0:
        return []

    tail = text[idx + len(marker):]
    lines = []
    for line in tail.splitlines():
        stripped = line.strip()
        if not stripped:
            break
        lines.append(stripped)
        if len(" ".join(lines)) > 1500:
            break

    raw = " ".join(lines).lower()
    candidates = set(re.findall(r"[a-z0-9][a-z0-9-]*", raw))
    stop_words = {"supported", "services", "and", "the", "for", "module"}
    return sorted(s for s in candidates if s not in stop_words)


def list_hydra_services():
    hydra_binary = _resolve_hydra_binary()
    if not hydra_binary:
        return DEFAULT_HYDRA_SERVICES

    try:
        process = subprocess.run([hydra_binary, "-h"], capture_output=True, text=True, timeout=5)
        output = f"{process.stdout or ''}\n{process.stderr or ''}"
        parsed = _extract_services_from_help(output)
        return parsed if parsed else DEFAULT_HYDRA_SERVICES
    except Exception:
        return DEFAULT_HYDRA_SERVICES


def _is_valid_host(host):
    return bool(re.fullmatch(r"[a-zA-Z0-9._:-]+", (host or "").strip()))


def _is_valid_service(service, allowed_services):
    return (service or "").strip().lower() in set(allowed_services or [])


def _is_valid_wordlist(wordlist_path):
    path = (wordlist_path or "").strip()
    return bool(path) and os.path.isfile(path)


def _resolve_hydra_binary():
    for candidate in ["hydra", "hydra.exe"]:
        binary = shutil.which(candidate)
        if binary:
            return binary

    if platform.system().lower().startswith("win"):
        windows_candidates = [
            r"C:\\Program Files\\THC-Hydra\\hydra.exe",
            r"C:\\Program Files (x86)\\THC-Hydra\\hydra.exe",
        ]
        for path in windows_candidates:
            if os.path.exists(path):
                return path

    for path in ["/usr/bin/hydra", "/usr/local/bin/hydra", "/bin/hydra"]:
        if os.path.exists(path):
            return path

    return None


def run_hydra_scan(target_host, service, username, wordlist, selected_flags=None, safe_scan=False):
    target_host = (target_host or "").strip()
    service = (service or "").strip().lower()
    username = (username or "").strip()
    wordlist = os.path.abspath((wordlist or "").strip())

    allowed_services = list_hydra_services()

    if not _is_valid_host(target_host):
        return "Erreur : cible invalide."
    if not _is_valid_service(service, allowed_services):
        return "Erreur : service Hydra invalide."
    if not username:
        return "Erreur : username obligatoire."
    if not _is_valid_wordlist(wordlist):
        return "Erreur : wordlist introuvable ou invalide."

    hydra_binary = _resolve_hydra_binary()
    if not hydra_binary:
        return (
            "Erreur : Hydra introuvable.\n"
            "- Kali/Linux : sudo apt install hydra\n"
            "- Windows : installe THC-Hydra puis ajoute-le au PATH"
        )

    selected_flags = selected_flags or []
    if safe_scan:
        hydra_flags = SAFE_SCAN_FLAGS
    else:
        hydra_flags = []
        for flag in selected_flags:
            if flag in ALLOWED_HYDRA_FLAGS:
                hydra_flags.extend(flag.split())
        if not hydra_flags:
            hydra_flags = ["-f", "-t", "4"]

    args = [
        hydra_binary,
        *hydra_flags,
        "-l",
        username,
        "-P",
        wordlist,
        target_host,
        service,
    ]

    try:
        process = subprocess.run(args, capture_output=True, text=True, timeout=120)
        output = (process.stdout or "") + ("\n" + process.stderr if process.stderr else "")
        return output.strip() if output.strip() else "Aucune sortie Hydra."
    except subprocess.TimeoutExpired:
        return "Erreur : Hydra a depasse le temps limite (120s)."
    except Exception as e:
        return f"Erreur systeme : {str(e)}"
