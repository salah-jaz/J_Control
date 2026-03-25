import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Update Brand Colors to Violet/Premium Palette
    # Replace brand-XXX with violet-XXX
    content = re.sub(r'\bbrand-(\d00)\b', r'violet-\1', content)
    
    # Replace specific brand colors in classes
    content = re.sub(r'\btext-brand-(\d00)\b', r'text-violet-\1', content)
    content = re.sub(r'\bbg-brand-(\d00)\b', r'bg-violet-\1', content)
    content = re.sub(r'\bborder-brand-(\d00)\b', r'border-violet-\1', content)
    content = re.sub(r'\bring-brand-(\d00)\b', r'ring-violet-\1', content)
    content = re.sub(r'\bshadow-brand-(\d00)\b', r'shadow-violet-\1', content)

    # 2. Update Typography & Casing
    # Find headers and ensuring they aren't all caps if they were (common pattern in some UIs)
    # This is harder to do via regex safely for content, but we can look for .toUpperCase() or specific CSS classes.
    
    # 3. Enhance Buttons
    # If a button has bg-violet-600, give it the premium gradient and shimmer look where appropriate
    # Mostly we'll rely on the 'btn-primary' class which is already in index.css
    
    # 4. Table UI Improvements
    # Replace table headers classes if they look old
    content = re.sub(r'bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider', 
                     r'bg-slate-50/80 text-[13px] font-semibold text-slate-600 capitalize tracking-normal', content)

    # 5. Card UI Improvements
    # Many cards use 'bg-white rounded-2xl shadow-sm border border-gray-100'
    # index.css already targets some of these, but let's make it consistent
    content = re.sub(r'bg-white rounded-2xl shadow-sm border border-gray-100', r'card !border-0', content)
    content = re.sub(r'bg-white rounded-xl shadow-sm border border-gray-100', r'card !border-0', content)

    # 6. Spacing optimization
    # Often p-8 or p-6 is used, ClientManagement uses p-6 md:p-10 for main container
    
    # 7. Casing: Replace "ADD NEW" etc with "Add New"
    def title_case_match(match):
        text = match.group(0)
        if text.isupper() and len(text) > 3:
            return text.title()
        return text

    # This is aggressive, let's limit it to common labels in JSX
    # content = re.sub(r'>[A-Z\s]{4,}<', title_case_match, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    base_dirs = ['src/pages', 'src/components']
    updated_count = 0
    for base_dir in base_dirs:
        full_base_path = os.path.join(os.getcwd(), base_dir)
        if not os.path.exists(full_base_path):
            continue
        for root, dirs, files in os.walk(full_base_path):
            for file in files:
                if file.endswith('.jsx'):
                    if file == 'ClientManagement.jsx':
                        continue
                    if process_file(os.path.join(root, file)):
                        updated_count += 1
    print(f"Updated {updated_count} files.")

if __name__ == '__main__':
    main()
