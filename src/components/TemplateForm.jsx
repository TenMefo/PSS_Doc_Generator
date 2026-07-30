const labelClass = 'flex flex-row items-start gap-4 w-full my-1';
const spanTextClass = 'w-2/5 text-right font-medium text-gray-700 pt-2 flex items-center justify-end gap-1';
const inputClass = 'flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';
const defaultCostUi = {
    title: 'Tabela kosztów',
    minRows: 1,
    maxRows: 10,
    defaultQuantity: '1',
    addRowLabel: 'Dodaj pozycję',
    removeRowLabel: 'Usuń',
    columns: {
        description: 'Wyszczególnienie kosztów',
        quantity: 'Ilość',
        unitPrice: 'Cena jednostkowa',
        source: 'Źródło finansowania',
    },
    columnHints: {
        description: 'Krótki opis pozycji kosztowej.',
        quantity: 'Wpisz liczbę sztuk; domyślnie 1.',
        unitPrice: 'Cena jednej sztuki lub usługi.',
        source: 'Wybierz dostępne źródło lub wpisz własne.',
    },
    sourceOptions: ['Dofinansowanie PSS', 'Środki własne', 'Wpłaty uczestników', 'Inne', 'Wpisz własne'],
    customSourcePlaceholder: 'Wpisz własne źródło finansowania',
};
const defaultFormUi = {
    documentLabel: 'Dokument',
    changeDocument: 'Zmień dokument',
    typeLabel: 'Typ przedsięwzięcia',
    typeOptions: [
        { value: 'wydarzenie', label: 'Wydarzenie' },
        { value: 'zakup', label: 'Zakup' },
        { value: 'wyjazd', label: 'Wyjazd' },
    ],
    selectPlaceholder: 'Wybierz...',
    loadingText: 'Ładowanie formularza...',
    generateButtonText: 'Generuj gotowy dokument',
    dateRangeSeparator: 'do',
    sectionTitles: {
        details: 'Szczegóły przedsięwzięcia',
        responsible: 'Dane osobowe osoby odpowiedzialnej za rozliczanie wydarzenia',
    },
    fieldWarnings: {},
    defaultValues: {
        opiekun: 'Prorektor ds. Studenckich',
        opiekunDlaWydzialu: 'Przewodniczący PSS',
    },
};

const renderHint = (hint, position = 'top') => (
    <div className="relative group inline-block cursor-pointer ml-1 select-none text-gray-400 hover:text-blue-500">
        <span className="border border-gray-400 rounded-full w-4 h-4 inline-flex items-center justify-center text-xs font-bold">?</span>
        <div
            className={`absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-64 ${
                position === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' : 'bottom-full mb-2 left-1/2 -translate-x-1/2'
            } z-10 shadow-md whitespace-normal font-normal text-center`}
        >
            {hint}
            <div
                className={`absolute left-1/2 transform -translate-x-1/2 border-4 border-transparent ${
                    position === 'bottom'
                        ? 'top-0 -mt-2 border-b-gray-800'
                        : 'top-full border-t-gray-800'
                }`}
            />
        </div>
    </div>
);

export default function TemplateForm({
    activeTemplate,
    templateData,
    ui,
    formData,
    costRows,
    complexDates,
    onChange,
    onCostRowChange,
    onAddCostRow,
    onRemoveCostRow,
    onComplexDateChange,
    onComplexSelect,
    isPrzedsięwzięcieTooShort,
    onGenerateDocument,
    onResetTemplateSelection,
    loading,
    error,
}) {
    const formUi = {
        ...defaultFormUi,
        ...(ui ?? {}),
        sectionTitles: {
            ...defaultFormUi.sectionTitles,
            ...(ui?.sectionTitles ?? {}),
        },
        fieldWarnings: {
            ...defaultFormUi.fieldWarnings,
            ...(ui?.fieldWarnings ?? {}),
        },
        defaultValues: {
            ...defaultFormUi.defaultValues,
            ...(ui?.defaultValues ?? {}),
        },
        typeOptions: ui?.typeOptions ?? defaultFormUi.typeOptions,
    };
    const costUi = {
        ...defaultCostUi,
        ...(templateData?.form_koszty ?? {}),
        columns: {
            ...defaultCostUi.columns,
            ...(templateData?.form_koszty?.columns ?? {}),
        },
        columnHints: {
            ...defaultCostUi.columnHints,
            ...(templateData?.form_koszty?.columnHints ?? {}),
        },
        sourceOptions: templateData?.form_koszty?.sourceOptions ?? defaultCostUi.sourceOptions,
    };

    const renderField = (field) => {
        const hintElement = field.hint ? renderHint(field.hint) : null;
        const fieldWarning = formUi.fieldWarnings[field.id];
        const warningMessage = fieldWarning?.message ?? '⚠️ Uwaga: Wniosek należy złożyć przynajmniej 14 dni przed przedsięwzięciem!';

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
                        <option value="">{formUi.selectPlaceholder}</option>
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
                        <option value="">{formUi.selectPlaceholder}</option>
                        {(field.options ?? formUi.typeOptions).map((opt) => (
                            <option key={opt.value ?? opt} value={opt.value ?? opt}>
                                {opt.label ?? opt}
                            </option>
                        ))}
                    </select>
                </label>
            );
        }

        if (field.type === 'checkbox') {
            return (
                <label key={field.id} className={labelClass}>
                    <span className={spanTextClass}>{field.label}: {hintElement}</span>
                    <input
                        type="checkbox"
                        name={field.id}
                        checked={Boolean(formData[field.id])}
                        onChange={onChange}
                        className="mt-3 h-5 w-5 accent-blue-600"
                    />
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
                            <span className="self-center text-gray-500">{formUi.dateRangeSeparator}</span>
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
                                {warningMessage}
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
                            {warningMessage}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderCostTable = () => {
        if (!templateData?.form_koszty) {
            return null;
        }

        const isBezkosztowe = Boolean(formData.bezkosztowe);
        const canAddRow = costRows.length < (costUi.maxRows ?? 10);
        const canRemoveRow = costRows.length > (costUi.minRows ?? 1);

        return (
            <div className="border-t border-gray-300 pt-6 mt-2 flex flex-col gap-4">
                <label className={labelClass}>
                    <span className={spanTextClass}>Bezkosztowe:</span>
                    <input
                        type="checkbox"
                        name="bezkosztowe"
                        checked={isBezkosztowe}
                        onChange={onChange}
                        className="mt-3 h-5 w-5 accent-blue-600"
                    />
                </label>

                {isBezkosztowe ? (
                    <p className="text-sm text-gray-500 text-center">Tabela kosztów zostanie wygenerowana jako pusta.</p>
                ) : (
                    <>
                <p className="font-semibold text-gray-700 text-center pt-0 mb-2">
                    {costUi.title}
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border border-gray-200 px-2 py-2 text-left">Lp.</th>
                                <th className="border border-gray-200 px-2 py-2 text-left">
                                    <span className="inline-flex items-center gap-1">
                                        {costUi.columns.description}
                                        {renderHint(costUi.columnHints.description, 'bottom')}
                                    </span>
                                </th>
                                <th className="border border-gray-200 px-2 py-2 text-left">
                                    <span className="inline-flex items-center gap-1">
                                        {costUi.columns.quantity}
                                        {renderHint(costUi.columnHints.quantity, 'bottom')}
                                    </span>
                                </th>
                                <th className="border border-gray-200 px-2 py-2 text-left">
                                    <span className="inline-flex items-center gap-1">
                                        {costUi.columns.unitPrice}
                                        {renderHint(costUi.columnHints.unitPrice, 'bottom')}
                                    </span>
                                </th>
                                <th className="border border-gray-200 px-2 py-2 text-left">
                                    <span className="inline-flex items-center gap-1">
                                        {costUi.columns.source}
                                        {renderHint(costUi.columnHints.source, 'bottom')}
                                    </span>
                                </th>
                                <th className="border border-gray-200 px-2 py-2 text-left">Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {costRows.map((row, index) => {
                                const sourceValue = row.sourceType === 'custom' ? '__custom__' : (row.source || '');

                                return (
                                    <tr key={row.id} className="align-top">
                                        <td className="border border-gray-200 px-2 py-2 w-12 text-center">{index + 1}</td>
                                        <td className="border border-gray-200 px-2 py-2">
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-gray-300 rounded"
                                                value={row.description}
                                                onChange={(e) => onCostRowChange(row.id, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td className="border border-gray-200 px-2 py-2 w-24">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full p-2 border border-gray-300 rounded"
                                                value={row.quantity}
                                                onChange={(e) => onCostRowChange(row.id, 'quantity', e.target.value)}
                                            />
                                        </td>
                                        <td className="border border-gray-200 px-2 py-2 w-32">
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-gray-300 rounded"
                                                value={row.unitPrice}
                                                onChange={(e) => onCostRowChange(row.id, 'unitPrice', e.target.value)}
                                            />
                                        </td>
                                        <td className="border border-gray-200 px-2 py-2 min-w-64">
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded"
                                                value={sourceValue}
                                                onChange={(e) => onCostRowChange(row.id, 'source', e.target.value)}
                                            >
                                                <option value="">Wybierz...</option>
                                                {costUi.sourceOptions.map((option) => (
                                                    <option key={option} value={option === 'Wpisz własne' ? '__custom__' : option}>
                                                        {option}
                                                    </option>
                                                ))}
                                            </select>
                                            {row.sourceType === 'custom' && (
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border border-gray-300 rounded mt-2"
                                                    value={row.customSource}
                                                    placeholder={costUi.customSourcePlaceholder}
                                                    onChange={(e) => onCostRowChange(row.id, 'customSource', e.target.value)}
                                                />
                                            )}
                                        </td>
                                        <td className="border border-gray-200 px-2 py-2 w-24">
                                            <button
                                                type="button"
                                                className="text-red-600 disabled:text-gray-400"
                                                onClick={() => onRemoveCostRow(row.id)}
                                                disabled={!canRemoveRow}
                                            >
                                                {costUi.removeRowLabel}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onAddCostRow}
                        disabled={!canAddRow}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-white font-bold py-2 px-6 rounded shadow"
                    >
                        {costUi.addRowLabel}
                    </button>
                </div>
                    </>
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
                <p className="font-semibold text-gray-700">{formUi.documentLabel}: {activeTemplate?.label}</p>
                <button
                    onClick={onResetTemplateSelection}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    {formUi.changeDocument}
                </button>
            </div>

            {loading && <p className="text-gray-500 text-center">{formUi.loadingText}</p>}
            {error && <p className="text-red-600 text-center">{error}</p>}

            {!loading && templateData && (
                <>
                    <label className={labelClass}>
                        <span className={spanTextClass}>{formUi.typeLabel}:</span>
                        <select
                            name="typ_wniosku"
                            value={formData.typ_wniosku}
                            onChange={onChange}
                            className={inputClass}
                        >
                            {formUi.typeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {renderFields(templateData.form_wniosek)}

                    {renderCostTable()}

                    <div className="border-t border-gray-300 pt-6 mt-2 flex flex-col gap-4">
                        <p className="font-semibold text-gray-700 text-center pt-0 mb-2">
                            {formUi.sectionTitles.details}
                        </p>
                        {renderFields(conditionalForms[formData.typ_wniosku] ?? [])}
                    </div>

                    <div className="border-t border-gray-300 pt-6 mt-2 flex flex-col gap-4">
                        <p className="font-semibold text-gray-700 text-center pt-0 mb-2">
                            {formUi.sectionTitles.responsible}
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
                            {formUi.generateButtonText}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
