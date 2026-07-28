export default function TemplatePicker({
    templates,
    selectedTemplateId,
    onSelectTemplate,
    onContinue,
    loading,
    error,
}) {
    return (
        <div className="flex flex-col gap-4 w-full border border-gray-200 p-6 rounded-lg bg-white shadow-sm text-left">
            <p className="font-semibold text-gray-700 text-center">Wybierz dokument</p>

            {loading && <p className="text-gray-500 text-center">Ładowanie listy dokumentów...</p>}
            {error && <p className="text-red-600 text-center">{error}</p>}

            {!loading && !error && (
                <>
                    <div className="flex flex-col gap-3">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => onSelectTemplate(template.id)}
                                className={`w-full rounded border px-4 py-3 text-left transition-colors ${
                                    selectedTemplateId === template.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="font-semibold text-gray-800">{template.label}</div>
                                {template.description && (
                                    <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={onContinue}
                            disabled={!selectedTemplateId}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-white font-bold py-2 px-6 rounded shadow"
                        >
                            Przejdź do formularza
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
