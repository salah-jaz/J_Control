<?php

namespace App\Http\Controllers;

use App\Models\PrintTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PrintTemplateController extends Controller
{
    public function index(Request $request)
    {
        $query = PrintTemplate::query();

        if ($request->filled('module')) {
            $query->where('module', $request->string('module'));
        }

        return $query
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (PrintTemplate $template) => $this->toClientShape($template));
    }

    public function show(PrintTemplate $printTemplate)
    {
        return $this->toClientShape($printTemplate);
    }

    public function store(Request $request)
    {
        $payload = $this->validatePayload($request, false);
        $id = $payload['id'] ?? ('tpl_' . Str::lower(Str::random(14)));

        $template = new PrintTemplate();
        $template->fill([
            'id' => $id,
            'name' => $payload['name'],
            'module' => $payload['module'],
            'is_default' => (bool) ($payload['isDefault'] ?? false),
            'description' => $payload['description'] ?? null,
            'template_html' => $payload['template_html'] ?? null,
            'template_css' => $payload['template_css'] ?? null,
            'styles' => $payload['styles'] ?? null,
            'sections' => $this->extractSections($payload),
        ]);
        $template->save();

        $this->syncDefault($template);

        return response()->json($this->toClientShape($template->fresh()), 201);
    }

    public function update(Request $request, PrintTemplate $printTemplate)
    {
        $payload = $this->validatePayload($request, true);

        $printTemplate->fill([
            'name' => $payload['name'] ?? $printTemplate->name,
            'module' => $payload['module'] ?? $printTemplate->module,
            'is_default' => array_key_exists('isDefault', $payload) ? (bool) $payload['isDefault'] : $printTemplate->is_default,
            'description' => array_key_exists('description', $payload) ? $payload['description'] : $printTemplate->description,
            'template_html' => array_key_exists('template_html', $payload) ? $payload['template_html'] : $printTemplate->template_html,
            'template_css' => array_key_exists('template_css', $payload) ? $payload['template_css'] : $printTemplate->template_css,
            'styles' => array_key_exists('styles', $payload) ? $payload['styles'] : $printTemplate->styles,
        ]);

        if ($this->hasSectionKeys($payload)) {
            $printTemplate->sections = $this->extractSections($payload);
        }

        $printTemplate->save();
        $this->syncDefault($printTemplate);

        return response()->json($this->toClientShape($printTemplate->fresh()));
    }

    public function destroy(PrintTemplate $printTemplate)
    {
        $module = $printTemplate->module;
        $wasDefault = $printTemplate->is_default;
        $printTemplate->delete();

        if ($wasDefault) {
            $next = PrintTemplate::where('module', $module)->orderByDesc('updated_at')->first();
            if ($next) {
                $next->is_default = true;
                $next->save();
            }
        }

        return response()->json(null, 204);
    }

    private function validatePayload(Request $request, bool $isUpdate): array
    {
        $rules = [
            'id' => [$isUpdate ? 'sometimes' : 'nullable', 'string', 'max:191'],
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'module' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:100'],
            'isDefault' => [$isUpdate ? 'sometimes' : 'nullable', 'boolean'],
            'description' => [$isUpdate ? 'sometimes' : 'nullable', 'nullable', 'string'],
            'template_html' => [$isUpdate ? 'sometimes' : 'nullable', 'nullable', 'string'],
            'template_css' => [$isUpdate ? 'sometimes' : 'nullable', 'nullable', 'string'],
            'styles' => [$isUpdate ? 'sometimes' : 'nullable', 'nullable', 'array'],
        ];

        return $request->validate($rules);
    }

    private function sectionKeys(): array
    {
        return [
            'title',
            'header',
            'customerLeft',
            'customerRight',
            'itemsTable',
            'totals',
            'bankDetails',
            'contactInfo',
            'signature',
            'termsAndConditions',
            'footer',
            'body',
            'partyDetailsProvider',
            'partyDetailsClient',
            'signatureProvider',
            'signatureClient',
        ];
    }

    private function hasSectionKeys(array $payload): bool
    {
        foreach ($this->sectionKeys() as $key) {
            if (array_key_exists($key, $payload)) {
                return true;
            }
        }
        return false;
    }

    private function extractSections(array $payload): array
    {
        $sections = [];
        foreach ($this->sectionKeys() as $key) {
            $sections[$key] = isset($payload[$key]) && is_array($payload[$key]) ? $payload[$key] : [];
        }
        return $sections;
    }

    private function syncDefault(PrintTemplate $template): void
    {
        if (! $template->is_default) {
            if (! PrintTemplate::where('module', $template->module)->where('is_default', true)->exists()) {
                $template->is_default = true;
                $template->save();
            }
            return;
        }

        PrintTemplate::where('module', $template->module)
            ->where('id', '!=', $template->id)
            ->update(['is_default' => false]);
    }

    private function toClientShape(PrintTemplate $template): array
    {
        return array_merge([
            'id' => $template->id,
            'name' => $template->name,
            'module' => $template->module,
            'isDefault' => (bool) $template->is_default,
            'description' => $template->description ?? '',
            'template_html' => $template->template_html,
            'template_css' => $template->template_css,
            'styles' => $template->styles,
        ], $template->sections ?? []);
    }
}
