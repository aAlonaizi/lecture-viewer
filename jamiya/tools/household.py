"""Household receipts and shopping history, stored encrypted for a public static site.

Extraction reuses the VendNations contract unchanged (schema.py: SCHEMA, PROMPT,
validate_extraction, to_draft, reconcile). This file only adds:
  * a household record built from that draft (canonical name + category per line),
  * an encrypted vault (vault.json) that the browser page opens with a password.

Vault design
  - One RSA-3072 key pair. The public key is stored in the clear, so records can be
    appended without any password (this tool never needs one to add receipts).
  - The private key (PKCS8) is wrapped once per user with AES-256-GCM under a key
    derived from that user's password (PBKDF2-HMAC-SHA256, 600k iterations).
    Users are listed by a salted hash of the username, not the name itself.
  - Every record is its own blob: random AES-256-GCM key, wrapped with RSA-OAEP-SHA256.
  - The plaintext private key is never written to disk.

Commands
  python3 -I household.py init <user>              create vault, print the password
  VAULT_USER=.. VAULT_PASS=.. python3 -I household.py add-user <user>
  python3 -I household.py add-receipt <input.json>  see RECEIPT_INPUT below
  python3 -I household.py add-list <input.json>     {"date","note","items":[{canonical,category,detail?}]}
  VAULT_USER=.. VAULT_PASS=.. python3 -I household.py dump   (local check only)
"""
import base64
import hashlib
import json
import os
import re
import secrets
import sys
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

sys.path.insert(0, str(Path(__file__).resolve().parent))
from schema import to_draft, validate_extraction  # noqa: E402  (VendNations contract)

VAULT = Path(__file__).resolve().parent.parent / 'masareef' / 'vault.json'
ITERATIONS = 600_000
CATEGORIES = {
    'veg': '🥬 خضار وفواكه', 'meat': '🍗 لحوم وأسماك', 'dairy': '🥚 ألبان وبيض',
    'bread': '🍞 مخبوزات', 'pantry': '🫙 بقالة', 'drinks': '🥤 مشروبات',
    'frozen': '🧊 مجمدات', 'care': '🧴 عناية شخصية', 'home': '🧽 أغراض البيت',
    'kids': '🧸 أطفال', 'other': '📦 أخرى',
}
OAEP = padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
b64 = lambda b: base64.b64encode(b).decode()
unb64 = base64.b64decode


# ---------------------------------------------------------------- vault ----
def user_key(name):
    return hashlib.sha256(('jamiya-user:' + name.strip().lower()).encode()).hexdigest()[:24]


def derive(password, salt):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITERATIONS).derive(password.encode())


def wrap_private(pkcs8, name, password):
    salt, iv = os.urandom(16), os.urandom(12)
    uk = user_key(name)
    ct = AESGCM(derive(password, salt)).encrypt(iv, pkcs8, ('jamiya:' + uk).encode())
    return uk, {'salt': b64(salt), 'iv': b64(iv), 'iter': ITERATIONS, 'wrapped': b64(ct)}


def unwrap_private(vault, name, password):
    uk = user_key(name)
    u = vault['users'].get(uk)
    if not u:
        raise SystemExit('Unknown user')
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=unb64(u['salt']), iterations=u['iter']).derive(password.encode())
    pkcs8 = AESGCM(key).decrypt(unb64(u['iv']), unb64(u['wrapped']), ('jamiya:' + uk).encode())
    return serialization.load_der_private_key(pkcs8, None)


def new_password():
    alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
    groups = [''.join(secrets.choice(alphabet) for _ in range(4)) for _ in range(4)]
    return '-'.join(groups)  # ~78 bits


def load():
    return json.loads(VAULT.read_text(encoding='utf8'))


def save(vault):
    VAULT.parent.mkdir(parents=True, exist_ok=True)
    tmp = VAULT.with_suffix('.tmp')
    tmp.write_text(json.dumps(vault, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    tmp.replace(VAULT)


def seal(vault, record):
    pub = serialization.load_der_public_key(unb64(vault['public_key']))
    key, iv = AESGCM.generate_key(256), os.urandom(12)
    body = json.dumps(record, ensure_ascii=False, separators=(',', ':')).encode()
    blob_id = record['id']
    if any(b['id'] == blob_id for b in vault['blobs']):
        raise SystemExit(f'Already recorded: {blob_id}')
    vault['blobs'].append({'id': blob_id, 'ek': b64(pub.encrypt(key, OAEP)), 'iv': b64(iv),
                           'ct': b64(AESGCM(key).encrypt(iv, body, ('jamiya-blob:' + blob_id).encode()))})


def open_all(vault, priv):
    out = []
    for b in vault['blobs']:
        key = priv.decrypt(unb64(b['ek']), OAEP)
        out.append(json.loads(AESGCM(key).decrypt(unb64(b['iv']), unb64(b['ct']), ('jamiya-blob:' + b['id']).encode())))
    return out


# -------------------------------------------------------------- records ----
def dec(v):
    try:
        return Decimal(v) if v not in (None, '') else None
    except InvalidOperation:
        return None


TOTAL_LABEL = re.compile(r'total|grand|net|amount due|المجموع|الإجمالي|الاجمالي|المبلغ|الصافي|checkout', re.I)


def build_receipt(inp):
    """RECEIPT_INPUT:
    {"store": "جمعية ...", "extraction": <VendNations schema v2>,
     "lines": [{"canonical": "بيض", "category": "dairy"}, ...]   # one per extraction item
     "paid_total": "12.350" (optional, what was actually paid), "note": "" (optional)}
    """
    ext = validate_extraction(inp['extraction'])
    lines = inp['lines']
    if len(lines) != len(ext['items']):
        raise SystemExit('lines must match extraction items one-to-one')
    draft = to_draft(ext)
    rec = draft['reconciliation']
    matched = rec.get('status') == 'matched'
    use_printed = set(rec.get('price_ids', [])) if matched else set()
    overlaps = set(rec.get('overlap_ids', [])) if matched else set()
    items, warnings = [], list(ext['warnings'])
    for row, meta in zip(draft['rows'], lines):
        if meta.get('category') not in CATEGORIES:
            raise SystemExit(f"Unknown category for {row['name']}: {meta.get('category')}")
        if row['source_id'] in overlaps:
            continue
        ex = row['extracted']
        amount, source = dec(row['cost']), 'line_total'
        if amount is None and row['source_id'] in use_printed:
            # Same rule as VendNations' explicit "use checked line totals" action:
            # printed amounts add up exactly to the printed total.
            amount, source = dec(row['printed_amount']), 'printed_amount_reconciled'
        qty = int(row['quantity']) if row['quantity'] else None
        items.append({
            'name': row['name'], 'canonical': meta['canonical'].strip(), 'category': meta['category'],
            'qty': qty, 'amount': format(amount, '.3f') if amount is not None and not ex['void'] else None,
            'unit': format(amount / qty, '.3f') if amount is not None and qty and not ex['void'] else None,
            'pack': row['pack'], 'void': ex['void'], 'uncertain': ex['uncertain'], 'amount_source': source,
        })
    priced = [Decimal(i['amount']) for i in items if i['amount']]
    printed = [t for t in ext.get('totals', []) if TOTAL_LABEL.search(t['label'])]
    total, total_source = None, None
    if inp.get('paid_total'):
        total, total_source = dec(inp['paid_total']), 'paid'
    elif matched:
        total, total_source = dec(rec['printed_total']), 'printed_reconciled'
    elif printed:
        total, total_source = max(dec(t['amount']) for t in printed), 'printed_unreconciled'
        warnings.append('Printed total does not equal the sum of lines; check missing or extra lines.')
    elif priced:
        total, total_source = sum(priced, Decimal(0)), 'sum_of_lines'
    if not draft['date']:
        warnings.append('No clear invoice date; set "date" in the input.')
    day = inp.get('date') or draft['date']
    body = json.dumps(ext, sort_keys=True, ensure_ascii=False).encode()
    return {
        'type': 'receipt', 'id': 'r-' + hashlib.sha256(body).hexdigest()[:16],
        'date': day, 'store': inp.get('store', '').strip() or 'غير معروف', 'currency': 'KWD',
        'total': format(total, '.3f') if total is not None else None, 'total_source': total_source,
        'delivery': draft['delivery'] or None, 'items': items, 'reconciliation': rec,
        'warnings': warnings, 'note': inp.get('note', ''), 'added_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
    }


def build_list(inp):
    for it in inp['items']:
        if it.get('category') not in CATEGORIES:
            raise SystemExit(f"Unknown category for {it.get('canonical')}: {it.get('category')}")
    body = json.dumps(inp, sort_keys=True, ensure_ascii=False).encode()
    return {'type': 'list', 'id': 'l-' + hashlib.sha256(body).hexdigest()[:16], 'date': inp['date'],
            'note': inp.get('note', ''),
            'items': [{'canonical': i['canonical'].strip(), 'category': i['category'], 'detail': i.get('detail', '')} for i in inp['items']],
            'added_at': datetime.now(timezone.utc).isoformat(timespec='seconds')}


# ------------------------------------------------------------------ cli ----
def main(argv):
    cmd = argv[1] if len(argv) > 1 else ''
    if cmd == 'init':
        if VAULT.exists():
            raise SystemExit('vault.json already exists')
        priv = rsa.generate_private_key(public_exponent=65537, key_size=3072)
        pkcs8 = priv.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
        spki = priv.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
        password = new_password()
        uk, wrapped = wrap_private(pkcs8, argv[2], password)
        save({'version': 1, 'public_key': b64(spki), 'categories': CATEGORIES, 'users': {uk: wrapped}, 'blobs': []})
        print(f'user: {argv[2]}\npassword: {password}')
    elif cmd == 'add-user':
        vault = load()
        priv = unwrap_private(vault, os.environ['VAULT_USER'], os.environ['VAULT_PASS'])
        pkcs8 = priv.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
        password = os.environ.get('NEW_PASS') or new_password()
        uk, wrapped = wrap_private(pkcs8, argv[2], password)
        vault['users'][uk] = wrapped
        save(vault)
        print(f'user: {argv[2]}\npassword: {password}')
    elif cmd == 'remove-user':
        vault = load()
        vault['users'].pop(user_key(argv[2]), None)
        save(vault)
        print('removed (note: someone who copied the old file can still open it with the old password)')
    elif cmd in ('add-receipt', 'add-list'):
        inp = json.loads(Path(argv[2]).read_text(encoding='utf8'))
        record = build_receipt(inp) if cmd == 'add-receipt' else build_list(inp)
        vault = load()
        seal(vault, record)
        save(vault)
        summary = {k: record[k] for k in ('id', 'type', 'date') if k in record}
        if record['type'] == 'receipt':
            summary.update(store=record['store'], total=record['total'], total_source=record['total_source'],
                           lines=len(record['items']), reconciliation=record['reconciliation'].get('status'),
                           warnings=record['warnings'])
        else:
            summary.update(items=len(record['items']))
        print(json.dumps(summary, ensure_ascii=False, indent=1))
    elif cmd == 'dump':
        vault = load()
        priv = unwrap_private(vault, os.environ['VAULT_USER'], os.environ['VAULT_PASS'])
        print(json.dumps(open_all(vault, priv), ensure_ascii=False, indent=1))
    else:
        print(__doc__)


if __name__ == '__main__':
    main(sys.argv)
