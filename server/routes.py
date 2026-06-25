import os
import tempfile
import uuid
from datetime import datetime

from flask import render_template, request, redirect, url_for, session, jsonify
from tools.nmap.scanner import run_nmap_scan # Importation propre
from tools.sqlmap.scanner import run_sqlmap_scan
from tools.hydra.scanner import list_hydra_services, run_hydra_scan
from tools.nikto.scanner import run_nikto_scan

LOGIN_USERS = {
    "admin": "admin",
    "rayan": "Rayan123",
    "anis": "Anis123",
}

def configure_routes(app):

    def add_scan_to_history(tool_name, command, result):
        if 'scan_history' not in session:
            session['scan_history'] = []
        
        session['scan_history'].insert(0, {
            'id': uuid.uuid4().hex,
            'timestamp': datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            'tool': tool_name,
            'command': command,
            'result': result,
            'in_report': False
        })
        session.modified = True

    @app.before_request
    def require_login():
        allowed_routes = ['login', 'static']
        if request.endpoint not in allowed_routes and 'username' not in session:
            return redirect(url_for('login'))

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        error = None
        if request.method == 'POST':
            username = request.form.get('username', '')
            password = request.form.get('password', '')
            if LOGIN_USERS.get(username) == password:
                session['username'] = username
                return redirect(url_for('home'))
            error = "Identifiant ou mot de passe incorrect."
        return render_template('login.html', error=error)

    @app.route('/logout')
    def logout():
        session.clear()
        return redirect(url_for('login'))

    @app.route('/toggle_report', methods=['POST'])
    def toggle_report():
        scan_id = request.json.get('scan_id')
        in_report = request.json.get('in_report')
        if 'scan_history' in session:
            for scan in session['scan_history']:
                if scan['id'] == scan_id:
                    scan['in_report'] = in_report
                    session.modified = True
                    return jsonify({"success": True, "state": in_report})
        return jsonify({"success": False}), 404

    @app.route('/', methods=['GET'])
    def home():
        username = session.get('username', 'Visiteur')
        return render_template('index.html', username=username)

    @app.route('/nmap', methods=['GET', 'POST'])
    def nmap_page():
        scan_result = ""
        target_ip = ""
        selected_options = []
        safe_scan = False

        if request.method == 'POST':
            target_ip = request.form.get('target', '')
            selected_options = request.form.getlist('nmap_args')
            safe_scan = request.form.get('safe_scan') == '1'
            # Appel de ta fonction modulaire
            scan_result = run_nmap_scan(target_ip, selected_options, safe_scan)
            
            cmd_args = " ".join(selected_options) if not safe_scan else "-F -sV --script safe -T2"
            command = f"nmap {cmd_args} {target_ip}"
            add_scan_to_history("Nmap", command, scan_result)

        history = [s for s in session.get('scan_history', []) if s['tool'] == 'Nmap']

        return render_template(
            'nmap.html',
            history=history,
            result=scan_result,
            last_target=target_ip,
            selected_options=selected_options,
            safe_scan=safe_scan,
        )

    @app.route('/hydra', methods=['GET', 'POST'])
    def hydra_page():
        scan_result = ""
        target_host = ""
        hydra_services = list_hydra_services()
        service = "ssh" if "ssh" in hydra_services else (hydra_services[0] if hydra_services else "")
        username = "admin"
        wordlist_name = ""
        selected_options = []
        safe_scan = False

        if request.method == 'POST':
            target_host = request.form.get('target', '')
            service = request.form.get('service', service)
            username = request.form.get('username', 'admin')
            selected_options = request.form.getlist('hydra_profiles')
            safe_scan = request.form.get('safe_scan') == '1'
            uploaded_wordlist = request.files.get('wordlist_file')

            if not uploaded_wordlist or not uploaded_wordlist.filename:
                scan_result = "Erreur : importe une wordlist (.txt/.lst/.dic)."
            else:
                suffix = os.path.splitext(uploaded_wordlist.filename)[1] or ".txt"
                wordlist_name = uploaded_wordlist.filename
                temp_path = ""

                try:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                        uploaded_wordlist.save(tmp.name)
                        temp_path = tmp.name

                    scan_result = run_hydra_scan(
                        target_host,
                        service,
                        username,
                        temp_path,
                        selected_options,
                        safe_scan,
                    )
                    
                    cmd_args = " ".join(selected_options) if not safe_scan else ""
                    command = f"hydra -l {username} -P {wordlist_name} {service}://{target_host} {cmd_args}"
                    add_scan_to_history("Hydra", command, scan_result)
                finally:
                    if temp_path and os.path.exists(temp_path):
                        os.remove(temp_path)

        history = [s for s in session.get('scan_history', []) if s['tool'] == 'Hydra']

        return render_template(
            'hydra.html',
            history=history,
            result=scan_result,
            last_target=target_host,
            service=service,
            username=username,
            wordlist_name=wordlist_name,
            hydra_services=hydra_services,
            selected_options=selected_options,
            safe_scan=safe_scan,
        )

    @app.route('/sqlmap', methods=['GET', 'POST'])
    def sqlmap_page():
        scan_result = ""
        target_url = ""
        selected_options = []
        safe_scan = False

        if request.method == 'POST':
            target_url = request.form.get('target', '')
            selected_options = request.form.getlist('sqlmap_args')
            safe_scan = request.form.get('safe_scan') == '1'
            scan_result = run_sqlmap_scan(target_url, selected_options, safe_scan)
            
            cmd_args = " ".join(selected_options) if not safe_scan else "--batch --risk=1 --level=1"
            command = f"sqlmap -u {target_url} {cmd_args}"
            add_scan_to_history("SQLMap", command, scan_result)

        history = [s for s in session.get('scan_history', []) if s['tool'] == 'SQLMap']

        return render_template(
            'sqlmap.html',
            history=history,
            result=scan_result,
            last_target=target_url,
            selected_options=selected_options,
            safe_scan=safe_scan,
        )

    @app.route('/nikto', methods=['GET', 'POST'])
    def nikto_page():
        scan_result = ""
        target_url = ""
        selected_options = []
        safe_scan = False

        if request.method == 'POST':
            target_url = request.form.get('target', '')
            selected_options = request.form.getlist('nikto_profiles')
            safe_scan = request.form.get('safe_scan') == '1'
            scan_result = run_nikto_scan(target_url, selected_options, safe_scan)
            
            cmd_args = " ".join(selected_options) if not safe_scan else "-Tuning 1 2 3"
            command = f"nikto -h {target_url} {cmd_args}"
            add_scan_to_history("Nikto", command, scan_result)

        history = [s for s in session.get('scan_history', []) if s['tool'] == 'Nikto']

        return render_template(
            'nikto.html',
            history=history,
            result=scan_result,
            last_target=target_url,
            selected_options=selected_options,
            safe_scan=safe_scan,
        )

    @app.route('/reporting')
    def reporting_page():
        # Récupère tous les scans qui ont la checkbox cochée
        report_scans = [s for s in session.get('scan_history', []) if s.get('in_report')]
        return render_template('reporting.html', report_scans=report_scans)

    @app.route('/about')
    def about_page():
        return render_template('about.html')

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('404.html'), 404