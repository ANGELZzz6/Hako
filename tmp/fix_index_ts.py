
import os

path = r'C:\Users\elang\Documents\PROYECTOS\V1 HAKU\Hako\client\src\pages\OrdersPage\index.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the void return at 1116 (already fixed, but safety check)
content = content.replace(
    '// Nota: React no permite hooks condicionales; definimos fuera del render condicional\n            })()',
    '// Nota: React no permite hooks condicionales; definimos fuera del render condicional\n              return null;\n            })()'
)

# Fix .imagenes property access
content = content.replace('.imagenes', ' as any).imagenes')
content = content.replace('item.product?.imagenes', '(item.product as any)?.imagenes')
content = content.replace('item.product.imagenes', '(item.product as any).imagenes')
content = content.replace('foundProduct?.product?.imagenes', '(foundProduct?.product as any)?.imagenes')
content = content.replace('foundProduct.product.imagenes', '(foundProduct.product as any).imagenes')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixes applied successfully via Python script.")
