const labelClass = 'flex flex-row items-start gap-4 w-full my-1';
const spanTextClass = 'w-2/5 text-right font-medium text-gray-700 pt-2 flex items-center justify-end gap-1';
const inputClass = 'flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';

const renderHint = (hint) => (
    <div className="relative group inline-block cursor-pointer ml-1 select-none text-gray-400 hover:text-blue-500">
        <span className="border border-gray-400 rounded-full w-4 h-4 inline-flex items-center justify-center text-xs font-bold">?</span>
        <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-64 bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10 shadow-md whitespace-normal font-normal text-center">
            {hint}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
    </div>
);

export default function TemplateForm({
    activeTemplate,
    templateData,
    formData,
    complexDates,
    onChange,
    onComplexDateChange,
    onComplexSelect,
    isPrzedsięwzięcieTooShort,
    onGenerateDocument,
    onResetTemplateSelection,
    loading,
    error,
}) {
    const renderField = (field) => {
        const hintElement = field.hint ? renderHint(field.hint) : null;

        if (field.type === 'select_complex') {
            return (
                <label key={field.id} className={labelClass}>
                    <span className={spanTextClass}>{field.label}: {hintElement}</span>
                    <select
                        className={inputClass}
                        onChange={(e) => {
                            if (!e.target.value) return;
                            onComplexSelect(JSON.parse(e.target.value));
                        }}
                    >
                        <option value="">Wybierz...</option>
                        {field.options.map((opt) => (
                            <option key={opt.name} value={JSON.stringify(opt.tags)}>
                                {opt.name}
                            </option>
                        ))}
                    </select>
                </label>
            );
        }

        if (field.type === 'select') {
            return (
                <label key={field.id} className={labelClass}>
                    <span className={spanTextClass}>{field.label}: {hintElement}</span>
                    <select
                        name={field.id}
                        onChange={onChange}
                        className={inputClass}
                        value={formData[field.id] || ''}
                    >
                        <option value="">Wybierz...</option>
                        {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                </label>
            );
        }

        if (field.type === 'complex_date') {
            const currentComplex = complexDates[field.id] || { start: '', end: '' };

            return (
                <div key={field.id} className="w-full flex flex-col">
                    <div className={labelClass}>
                        <span className={spanTextClass}>{field.label}: {hintElement}</span>
                        <div className="flex-1 flex gap-2 w-full">
                            <input
                                type="date"
                                className={inputClass}
                                value={currentComplex.start}
                                onChange={(e) => onComplexDateChange(field.id, 'start', e.target.value)}
                            />
                            <span className="self-center text-gray-500">do</span>
                            <input
                                type="date"
                                className={inputClass}
                                value={currentComplex.end}
                                onChange={(e) => onComplexDateChange(field.id, 'end', e.target.value)}
                            />
                        </div>
                    </div>
                    {field.id === 'data_przedsięwzięcia' && isPrzedsięwzięcieTooShort() && (
                        <div className="flex flex-row w-full">
                            <div className="w-2/5"></div>
                            <p className="flex-1 text-red-500 text-xs font-semibold mt-1 animate-pulse ml-4">
                                ⚠️ Uwaga: Wniosek należy złożyć przynajmniej 14 dni przed przedsięwzięciem!
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        if (field.type === 'textarea') {
            return (
                <label key={field.id} className={labelClass}>
                    <span className={spanTextClass}>{field.label}: {hintElement}</span>
                    <textarea
                        name={field.id}
                        onChange={onChange}
                        value={formData[field.id] !== undefined ? formData[field.id] : (field.value || '')}
                        placeholder={field.placeholder}
                        className={`${inputClass} min-h-[100px] resize-y`}
                    />
                </label>
            );
        }

        return (
            <div key={field.id} className="w-full flex flex-col">
                <label className={labelClass}>
                    <span className={spanTextClass}>{field.label}: {hintElement}</span>
                    <input
                        type={field.type}
                        name={field.id}
                        onChange={onChange}
                        value={formData[field.id] !== undefined ? formData[field.id] : (field.value || '')}
                        placeholder={field.placeholder}
                        className={inputClass}
                    />
                </label>
                {field.id === 'data_przedsięwzięcia' && isPrzedsięwzięcieTooShort() && (
                    <div className="flex flex-row w-full">
                        <div className="w-2/5"></div>
                        <p className="flex-1 text-red-500 text-xs font-semibold mt-1 animate-pulse ml-4">
                            ⚠️ Uwaga: Wniosek należy złożyć przynajmniej 14 dni przed przedsięwzięciem!
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderFields = (fields = []) => fields.map(renderField);
    const conditionalForms = {
        wydarzenie: templateData?.form_wydarzenie ?? [],
        zakup: templateData?.form_zakup ?? [],
        wyjazd: templateData?.form_wyjazd ?? [],
    };

    return (
        <div className="flex flex-col gap-4 w-full border border-gray-200 p-6 rounded-lg bg-white shadow-sm text-left">
            <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-gray-700">Dokument: {activeTemplate?.label}</p>
                <button
                    onClick={onResetTemplateSelection}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    Zmień dokument
                </button>
            </div>

            {loading && <p className="text-gray-500 text-center">Ładowanie formularza...</p>}
            {error && <p className="text-red-600 text-center">{error}</p>}

            {!loading && templateData && (
                <>
                    <label className={labelClass}>
                        <span className={spanTextClass}>Typ przedsięwzięcia:</span>
                        <select
                            name="typ_wniosku"
                            value={formData.typ_wniosku}
                            onChange={onChange}
                            className={inputClass}
                        >
                            <option value="wydarzenie">Wydarzenie</option>
                            <option value="zakup">Zakup</option>
                            <option value="wyjazd">Wyjazd</option>
                        </select>
                    </label>

                    {renderFields(templateData.form_wniosek)}

                    <div className="border-t border-gray-300 pt-6 mt-2 flex flex-col gap-4">
                        <p className="font-semibold text-gray-700 text-center pt-0 mb-2">
                            Szczegóły przedsięwzięcia
                        </p>
                        {renderFields(conditionalForms[formData.typ_wniosku] ?? [])}
                    </div>

                    <div className="border-t border-gray-300 pt-6 mt-2 flex flex-col gap-4">
                        <p className="font-semibold text-gray-700 text-center pt-0 mb-2">
                            Dane osobowe osoby odpowiedzialnej za <span className="font-bold">rozliczanie</span> wydarzenia
                        </p>
                        {renderFields(templateData.form_odpowiedzialny)}
                    </div>

                    <div className="border-t border-gray-300 pt-6 mt-2 flex flex-col gap-4">
                        {renderField(templateData.end)}
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            onClick={onGenerateDocument}
                            className="bg-blue-500 hover:bg-blue-600 transition-colors text-white font-bold py-2 px-6 rounded shadow"
                        >
                            Generuj gotowy dokument
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
