from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET

FILE = Path(__file__).with_name('ODOO_CHAT_UI_V33_1_SERVER_AUTHORITATIVE_CONTEXT.xml')
s = FILE.read_text(encoding='utf-8')

# Structural validity
ET.fromstring(s)
assert "var UI_VERSION='33.1.0';" in s

# Old browser-side semantic routing must stay removed.
banned = [
    'shouldClearActiveChatProduct',
    'isVisualFollowupMessage',
    'isNewTopicAwayFromImage',
    'isVisualCancelMessage',
    'hasDirectVisualReference',
]
for token in banned:
    assert token not in s, f'legacy semantic interceptor returned: {token}'

# Browser must not invent an assistant answer when backend has none.
assert 'ما في رد متاح حاليًا.' not in s
assert 'No response is available right now.' not in s
assert "if(!reply) throw new Error('empty_backend_reply');" in s

# Context transport must remain intact.
for token in [
    'selected_product_context:activeChatProduct',
    'selected_product_contexts:selectedComparisonProducts',
    'history:historyBefore',
    'conversation_state:conversationState()',
    'images:imagesToSend',
]:
    assert token in s, f'missing context transport: {token}'

# Server state must remain authoritative after each answer.
assert 'serverVisualContextActive()' in s
assert 'var serverProductContext=data.conversation_state.active_product_context;' in s
assert 'activeChatProduct=serverProductContext&&serverProductContext.active' in s
assert 'data.conversation_state.active_visual_context.active===false' in s

# JS syntax check.
m = re.search(r'<script type="text/javascript"><!\[CDATA\[(.*?)\]\]></script>', s, re.S)
assert m, 'script CDATA not found'
with tempfile.NamedTemporaryFile('w', suffix='.js', encoding='utf-8', delete=False) as f:
    f.write(m.group(1))
    js_path = f.name
proc = subprocess.run(['node', '--check', js_path], capture_output=True, text=True)
assert proc.returncode == 0, proc.stderr

print('PASS: V33.1 frontend semantic-boundary regression checks')
