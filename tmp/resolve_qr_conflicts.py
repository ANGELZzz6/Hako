
import os
import re

files = [
    r'C:\Users\elang\Documents\PROYECTOS\V1 HAKU\Hako\server\controllers\qrController.js',
    r'C:\Users\elang\Documents\PROYECTOS\V1 HAKU\Hako\server\models\qrModel.js',
    r'C:\Users\elang\Documents\PROYECTOS\V1 HAKU\Hako\server\routes\qrRoutes.js'
]

def resolve_qr_controller(content):
    # Block 1: existingQR logic
    # Keep USB (replacement of expired QR)
    content = re.sub(r'<<<<<<< HEAD.*?=======', '', content, flags=re.DOTALL)
    content = content.replace('>>>>>>> usb/main', '')
    return content

for file_path in files:
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple strategy: If it's the specific blocks we identified, handle them.
    # Otherwise, resolve all remaining markers by keeping USB features (Version B)
    # as requested by the priority rule: "Keep new features from usb/main"
    
    # Generic resolution for the identified files:
    # Keep everything between ======= and >>>>>>> usb/main
    # Remove everything between <<<<<<< HEAD and =======
    
    new_content = re.sub(r'<<<<<<< HEAD.*?=======', '', content, flags=re.DOTALL)
    new_content = new_content.replace('>>>>>>> usb/main', '')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Resolved conflicts in {file_path}")

