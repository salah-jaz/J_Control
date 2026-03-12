import re

def main():
    with open('c:/Users/imam0/Desktop/Jaz-project/J_Control/src/pages/ModernPrintTemplateBuilder.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to replace everything from "  return (" down to "}" at the end of the file.
    # So we split on "  const DropZone =" and keep the part before, then rebuild DropZone and the new return.
    
    parts = content.split("  const DropZone = ({ zone, title }) => (")
    if len(parts) < 2:
        print("Could not find DropZone in file.")
        return
        
    top_part = parts[0]
    
    # Let's write the new DropZone and new return
    new_return = '''  const DropZone = ({ zone, title }) => (
    <div
      className={`min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-all ${isDragging ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50'}`}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, zone)}
    >
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
        {title}
        <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">Zone</span>
      </p>
      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {(template[zone] || []).map((item, idx) => (
          <span
            key={`${zone}-${idx}-${item.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 shadow-sm text-xs font-medium text-slate-700"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
            {item.label}
            <button
              type="button"
              onClick={() => removeFromZone(zone, idx)}
              className="ml-1 text-slate-400 hover:text-red-600 transition-colors"
              aria-label="Remove"
            >
              ×
            </button>
          </span>
        ))}
        {(template[zone] || []).length === 0 && (
          <span className="text-slate-400 text-xs self-center w-full text-center py-2 italic opacity-60">Drop fields here</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/80 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 flex-shrink-0 bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="bg-indigo-50 p-1.5 rounded-lg">
               <Eye className="w-5 h-5 text-indigo-600" />
            </div>
            {isEdit ? 'Edit Template' : 'New Template'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Design your structured print layouts precisely.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => navigate('/print-templates')} className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all hover:shadow hover:-translate-y-0.5 flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Template
          </button>
        </div>
      </div>

      {/* Split Layout Body */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 items-start">
        
        {/* Left Panel (Configuration Section) */}
        <div className="w-full lg:w-[480px] flex flex-col gap-6 sticky top-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Configuration</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Template Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm outline-none"
                  placeholder="e.g. Corporate Standard"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Module Type</label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm outline-none cursor-pointer"
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                >
                  {MODULES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 border-b border-slate-200 pt-8 mt-2 -mx-6 px-6">
              <button onClick={() => setActiveTab('builder')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'builder' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Visual Builder</button>
              <button onClick={() => setActiveTab('code')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'code' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Code className="w-4 h-4 inline mr-1 -mt-0.5" /> HTML/CSS</button>
              {selectedModule === 'agreements' && (
                <button onClick={() => setActiveTab('styles')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'styles' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Palette className="w-4 h-4 inline mr-1 -mt-0.5" /> Appearance</button>
              )}
            </div>
          </div>

          {/* Builder specific left panel */}
          {activeTab === 'builder' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 flex flex-col max-h-[calc(100vh-22rem)] overflow-hidden">
              <div className="bg-slate-50/50 p-5 border-b border-slate-200 flex-shrink-0">
                <h3 className="text-sm font-bold text-slate-700 mb-1">Available Fields</h3>
                <p className="text-xs text-slate-500 mb-3">Drag into layout zones below</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {availableFields.map((field) => (
                    <div key={field.id} draggable onDragStart={(e) => handleDragStart(e, field)} onDragEnd={handleDragEnd} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 text-xs font-medium text-slate-600 select-none shadow-sm transition-colors">
                      <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                      {field.label}
                    </div>
                  ))}
                </div>
              </div>
              <div ref={builderScrollRef} className="p-5 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200 bg-slate-50/30 space-y-5">
                {selectedModule === 'agreements' ? (
                  <>
                    <DropZone zone="header" title={SECTION_LABELS.header} />
                    <div className="grid grid-cols-2 gap-4">
                      <DropZone zone="partyDetailsProvider" title={SECTION_LABELS.partyDetailsProvider} />
                      <DropZone zone="partyDetailsClient" title={SECTION_LABELS.partyDetailsClient} />
                    </div>
                    <DropZone zone="body" title={SECTION_LABELS.body} />
                    <div className="grid grid-cols-2 gap-4">
                      <DropZone zone="signatureProvider" title={SECTION_LABELS.signatureProvider} />
                      <DropZone zone="signatureClient" title={SECTION_LABELS.signatureClient} />
                    </div>
                    <DropZone zone="footer" title={SECTION_LABELS.footer} />
                  </>
                ) : (
                  <>
                    <DropZone zone="title" title={SECTION_LABELS.title} />
                    <DropZone zone="header" title={SECTION_LABELS.header} />
                    <div className="grid grid-cols-2 gap-4">
                      <DropZone zone="customerLeft" title={SECTION_LABELS.customerLeft} />
                      <DropZone zone="customerRight" title={SECTION_LABELS.customerRight} />
                    </div>
                    <DropZone zone="itemsTable" title={SECTION_LABELS.itemsTable} />
                    <DropZone zone="totals" title={SECTION_LABELS.totals} />
                    <div className="grid grid-cols-2 gap-4">
                      <DropZone zone="bankDetails" title={SECTION_LABELS.bankDetails} />
                      <DropZone zone="contactInfo" title={SECTION_LABELS.contactInfo} />
                    </div>
                    <DropZone zone="signature" title={SECTION_LABELS.signature} />
                    <DropZone zone="termsAndConditions" title={SECTION_LABELS.termsAndConditions} />
                    <DropZone zone="footer" title={SECTION_LABELS.footer} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* HTML Code specific left panel */}
          {activeTab === 'code' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 max-h-[calc(100vh-22rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Code Editor</h3>
                <div className="flex gap-2">
                  {selectedModule === 'invoices' && (
                    <button type="button" onClick={handleLoadJazInvoiceTemplate} className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 transition-colors">Load Preset</button>
                  )}
                  <button type="button" onClick={handleRegenerateFromBuilder} className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 transition-colors">Sync from Builder</button>
                </div>
              </div>
              <p className="text-xs text-slate-500 border-l-2 border-indigo-300 pl-3">Changes here reflect on the live preview instantly.</p>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">CSS</label>
                <textarea spellCheck={false} value={displayCss} onChange={(e) => setTemplateCss(e.target.value)} className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg min-h-[150px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">HTML</label>
                <textarea spellCheck={false} value={displayHtml} onChange={(e) => setTemplateHtml(e.target.value)} className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg min-h-[250px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-none" />
              </div>
            </div>
          )}
          
          {/* Styles specific left panel */}
          {activeTab === 'styles' && selectedModule === 'agreements' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 max-h-[calc(100vh-22rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 space-y-5">
              <h3 className="text-sm font-bold text-slate-700">Appearance Settings</h3>
              <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Global Font Family</label>
                    <select className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-slate-50 outline-none" value={templateStyles.fontFamily ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, fontFamily: e.target.value }))}>
                      <option value="Arial, sans-serif">Arial, sans-serif</option>
                      <option value="Georgia, serif">Georgia, serif</option>
                      <option value="'Times New Roman', Times, serif">Times New Roman</option>
                      <option value="system-ui, -apple-system, sans-serif">System UI</option>
                      <option value="'Inter', 'Helvetica Neue', Arial, sans-serif">Modern (Inter)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Section Gap</label>
                    <input type="text" className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-slate-50 outline-none" value={templateStyles.section?.marginBottom ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, section: { ...(prev.section || {}), marginBottom: e.target.value } }))} placeholder="24px" />
                  </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 bg-indigo-50 inline-block px-2 py-0.5 rounded">Headings</h4>
                <div className="grid grid-cols-2 gap-3 pl-1 border-l-2 border-indigo-100">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Size</label>
                    <input type="text" className="w-full text-xs p-1.5 border border-slate-200 rounded bg-slate-50" value={templateStyles.heading?.fontSize ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), fontSize: e.target.value } }))} placeholder="24px" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Color</label>
                    <div className="flex gap-1.5">
                       <input type="color" className="w-6 h-6 rounded cursor-pointer border border-slate-300" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.heading?.color) ? templateStyles.heading.color : '#1e293b'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), color: e.target.value } }))} />
                       <input type="text" className="flex-1 text-xs p-1 border border-slate-200 rounded bg-slate-50" value={templateStyles.heading?.color ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), color: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              </div>
              
               <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 bg-indigo-50 inline-block px-2 py-0.5 rounded">Body Text</h4>
                <div className="grid grid-cols-2 gap-3 pl-1 border-l-2 border-indigo-100">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Size</label>
                    <input type="text" className="w-full text-xs p-1.5 border border-slate-200 rounded bg-slate-50" value={templateStyles.paragraph?.fontSize ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), fontSize: e.target.value } }))} placeholder="14px" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Color</label>
                    <div className="flex gap-1.5">
                       <input type="color" className="w-6 h-6 rounded cursor-pointer border border-slate-300" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.paragraph?.color) ? templateStyles.paragraph.color : '#475569'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), color: e.target.value } }))} />
                       <input type="text" className="flex-1 text-xs p-1 border border-slate-200 rounded bg-slate-50" value={templateStyles.paragraph?.color ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), color: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel (Live Preview Section) */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200/80 flex flex-col min-h-0 overflow-hidden relative group self-stretch bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2Y4ZmFmYyI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0iI2UxZTRlOCI+PC9jaXJjbGU+Cjwvc3ZnPg==')]">
           <div className="bg-white/95 backdrop-blur flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
             <div className="flex items-center gap-2">
               <span className="relative flex h-3 w-3 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
               </span>
               <h2 className="text-sm font-bold text-slate-700">Live Document Preview</h2>
             </div>
             <div className="text-[11px] font-semibold tracking-wide uppercase px-3 py-1 bg-slate-100 rounded-full text-slate-500 border border-slate-200">
               A4 Proportion
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-8 flex items-start justify-center">
              <div className="bg-white shadow-xl shadow-slate-200 border border-slate-100 w-full max-w-[800px] rounded-sm transition-all duration-300 ring-1 ring-slate-900/5">
                {(() => {
                const previewZones = selectedModule === 'agreements' ? AGREEMENT_TEMPLATE_SECTIONS : [...TEMPLATE_SECTIONS, 'body'];
                const hasBuilderFields = previewZones.some((zone) => (template[zone]?.length || 0) > 0);
                const hasCustomHtml = templateHtml.trim().length > 0;
                
                if (!hasBuilderFields && !hasCustomHtml) {
                  return (
                    <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 p-8 text-center bg-slate-50/50">
                      <LayoutTemplate className="w-16 h-16 text-slate-300 mb-4 opacity-50" />
                      <p className="font-medium text-slate-500">Document is empty</p>
                      <p className="text-sm mt-1 max-w-sm">Use the visual builder on the left to drag and drop fields, or write custom HTML to generate the layout.</p>
                    </div>
                  );
                }
                
                return (
                  <iframe
                    key={`preview-${selectedModule}-${templateHtml.length}-${templateCss.length}${selectedModule === 'agreements' && templateStyles ? '-sty' : ''}`}
                    title="Print template preview"
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;box-sizing:border-box;">${previewHtml}</body></html>`}
                    className="w-full border-0"
                    style={{ minHeight: '1000px', height: '100vh', pointerEvents: 'none' }}
                    sandbox="allow-same-origin"
                  />
                 );
                 })()}
              </div>
           </div>
        </div>
        
      </div>
    </div>
  );
}
'''
    content_new = top_part + new_return
    with open('c:/Users/imam0/Desktop/Jaz-project/J_Control/src/pages/ModernPrintTemplateBuilder.jsx', 'w', encoding='utf-8') as f:
        f.write(content_new)
    print("Successfully replaced builder layout.")

if __name__ == "__main__":
    main()
