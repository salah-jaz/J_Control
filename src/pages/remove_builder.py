import re

def update_file():
    filepath = 'c:/Users/imam0/Desktop/Jaz-project/J_Control/src/pages/ModernPrintTemplateBuilder.jsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Change default active tab "builder" -> "code"
    content = content.replace("const [activeTab, setActiveTab] = useState('builder');", "const [activeTab, setActiveTab] = useState('code');")

    # 2. Remove "Visual Builder" tab button
    old_tabs = """            <div className="flex gap-2 border-b border-slate-200 pt-8 mt-2 -mx-6 px-6">
              <button onClick={() => setActiveTab('builder')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'builder' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Visual Builder</button>
              <button onClick={() => setActiveTab('code')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'code' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Code className="w-4 h-4 inline mr-1 -mt-0.5" /> HTML/CSS</button>"""
    new_tabs = """            <div className="flex gap-2 border-b border-slate-200 pt-8 mt-2 -mx-6 px-6">
              <button onClick={() => setActiveTab('code')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'code' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Code className="w-4 h-4 inline mr-1 -mt-0.5" /> HTML/CSS</button>"""
    if old_tabs in content:
        content = content.replace(old_tabs, new_tabs)
    else:
        print("Could not find tabs block.")

    # 3. Remove "{/* Builder specific left panel */}" up to "{/* HTML Code specific left panel */}"
    builder_panel_start = content.find("          {/* Builder specific left panel */}")
    html_panel_start = content.find("          {/* HTML Code specific left panel */}")
    if builder_panel_start != -1 and html_panel_start != -1:
        content = content[:builder_panel_start] + content[html_panel_start:]
    else:
        print("Could not find builder panel section")

    # 4. Remove empty document logic reference to visual builder
    old_empty = "Use the visual builder on the left to drag and drop fields, or write custom HTML to generate the layout."
    new_empty = "Write custom HTML to generate the layout."
    content = content.replace(old_empty, new_empty)
    
    # 5. Remove "Sync from Builder" button
    sync_btn = """<button type="button" onClick={handleRegenerateFromBuilder} className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 transition-colors">Sync from Builder</button>"""
    if sync_btn in content:
        content = content.replace(sync_btn, "")
    
    # 6. We can leave unused fields (DropZone, states) for now if they don't crash, but we can also clean them.
    # To be safe, we just leave the unused hooks there to maintain the rest of the flow easily, without risking removing wrong lines.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done removing visual builder tab.")

update_file()
