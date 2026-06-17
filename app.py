from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for, session
from flask_cors import CORS
import json
import os
import base64
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from functools import wraps

app = Flask(__name__)
CORS(app)

# Configuracoes
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'store_data.json')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'chave-secreta-padrao-mude-para-producao')
app.config['ADMIN_PASSWORD'] = os.environ.get('ADMIN_PASSWORD', 'admin123')

os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ============================================
# HELPERS
# ============================================

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return get_default_data()

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_default_data():
    return {
        "products": [],
        "appearance": {
            "logo": None,
            "banner": None,
            "primaryColor": "#6366f1",
            "secondaryColor": "#ec4899",
            "theme": "modern"
        },
        "payment": {
            "pix": {"key": "", "name": "", "city": "", "qrCode": None},
            "card": {"link": "", "active": True},
            "boleto": {"instructions": "", "active": False}
        },
        "contact": {
            "whatsapp": "",
            "whatsappMessage": "Ola! Vi seu site e tenho interesse em:",
            "instagram": "",
            "facebook": "",
            "email": "",
            "phone": "",
            "address": "",
            "businessHours": ""
        },
        "settings": {
            "storeName": "Minha Loja",
            "slug": "",
            "description": "",
            "favicon": None,
            "analyticsId": "",
            "isOpen": True
        }
    }

def save_base64_image(base64_string, prefix="img"):
    if not base64_string or not base64_string.startswith('data:image'):
        return None
    try:
        header, encoded = base64_string.split(',', 1)
        ext = header.split('/')[1].split(';')[0]
        if ext == 'svg+xml':
            ext = 'svg'
        filename = f"{prefix}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(encoded))
        return f"/static/uploads/{filename}"
    except Exception as e:
        print(f"Erro ao salvar imagem: {e}")
        return None

def process_images_in_data(data):
    if data.get('appearance', {}).get('logo') and data['appearance']['logo'].startswith('data:image'):
        data['appearance']['logo'] = save_base64_image(data['appearance']['logo'], 'logo')
    if data.get('appearance', {}).get('banner') and data['appearance']['banner'].startswith('data:image'):
        data['appearance']['banner'] = save_base64_image(data['appearance']['banner'], 'banner')
    if data.get('settings', {}).get('favicon') and data['settings']['favicon'].startswith('data:image'):
        data['settings']['favicon'] = save_base64_image(data['settings']['favicon'], 'favicon')
    if data.get('payment', {}).get('pix', {}).get('qrCode') and data['payment']['pix']['qrCode'].startswith('data:image'):
        data['payment']['pix']['qrCode'] = save_base64_image(data['payment']['pix']['qrCode'], 'pix')

    for product in data.get('products', []):
        new_images = []
        for img in product.get('images', []):
            if img and img.startswith('data:image'):
                saved = save_base64_image(img, f"product_{product['id']}")
                if saved:
                    new_images.append(saved)
            elif img:
                new_images.append(img)
        product['images'] = new_images
    return data

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ============================================
# ROTAS - LOJA PUBLICA (PRINCIPAL)
# ============================================

@app.route('/')
def index():
    return render_template('loja.html')

@app.route('/admin')
@login_required
def admin():
    return render_template('admin.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password', '')
        if password == app.config['ADMIN_PASSWORD']:
            session['admin_logged_in'] = True
            return redirect(url_for('admin'))
        else:
            return render_template('login.html', error='Senha incorreta!')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('index'))

# ============================================
# API - ADMIN
# ============================================

@app.route('/api/data', methods=['GET'])
@login_required
def get_data():
    return jsonify(load_data())

@app.route('/api/data', methods=['POST'])
@login_required
def post_data():
    data = request.get_json()
    if data:
        data = process_images_in_data(data)
        save_data(data)
        return jsonify({"success": True, "message": "Dados salvos com sucesso!"})
    return jsonify({"success": False, "message": "Dados invalidos"}), 400

@app.route('/api/reset', methods=['POST'])
@login_required
def reset_data():
    default = get_default_data()
    save_data(default)
    return jsonify({"success": True, "message": "Dados resetados!"})

@app.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "Nenhum arquivo enviado"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "Nenhum arquivo selecionado"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(f"{uuid.uuid4().hex}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return jsonify({"success": True, "url": f"/static/uploads/{filename}"})
    return jsonify({"success": False, "message": "Tipo de arquivo nao permitido"}), 400

# ============================================
# API - LOJA PUBLICA
# ============================================

@app.route('/api/store')
def get_store_data():
    data = load_data()
    public_data = {
        "products": [p for p in data.get('products', []) if p.get('active', True)],
        "appearance": data.get('appearance', {}),
        "contact": data.get('contact', {}),
        "settings": {
            "storeName": data.get('settings', {}).get('storeName', 'Minha Loja'),
            "description": data.get('settings', {}).get('description', ''),
            "isOpen": data.get('settings', {}).get('isOpen', True)
        }
    }
    return jsonify(public_data)

@app.route('/sitemap.xml')
def sitemap():
    data = load_data()
    products = [p for p in data.get('products', []) if p.get('active', True)]
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '    <url>',
        '        <loc>/</loc>',
        '        <changefreq>daily</changefreq>',
        '        <priority>1.0</priority>',
        '    </url>'
    ]
    for p in products:
        xml_lines.append(f'    <url>')
        xml_lines.append(f'        <loc>/#product-{p["id"]}</loc>')
        xml_lines.append(f'        <changefreq>weekly</changefreq>')
        xml_lines.append(f'        <priority>0.8</priority>')
        xml_lines.append(f'    </url>')
    xml_lines.append('</urlset>')
    return '\n'.join(xml_lines), 200, {'Content-Type': 'application/xml'}

@app.route('/robots.txt')
def robots():
    return 'User-agent: *\nAllow: /\nSitemap: /sitemap.xml', 200, {'Content-Type': 'text/plain'}

@app.route('/static/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.errorhandler(404)
def not_found(e):
    return render_template('loja.html'), 200

@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "message": "Erro interno do servidor"}), 500

# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    print("=" * 50)
    print("  LOJA ONLINE - AdminPro Python")
    print("=" * 50)
    print("Loja publica:  http://localhost:5000")
    print("Painel admin:  http://localhost:5000/admin")
    print("Login admin:   http://localhost:5000/login")
    print("Senha padrao:  admin123")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
