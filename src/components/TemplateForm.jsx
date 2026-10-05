import { useState } from 'react';

const labelClass = 'form-label-row';
const spanTextClass = 'form-label-text';
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
    sourceOptions: [
        { label: 'Środki PSS', value: 'WYDZIELONE ŚRODKI NA DZIAŁALNOŚĆ NAUKOWĄ, WYCHOWAWCZĄ, KULTURALNĄ I SPORTOWO-REKREACYJNĄ STUDENTÓW POZ. SAMORZĄD STUDENCKI' },
        { label: 'Nagroda za ankietyzację', value: 'Nagroda za ankietyzację' },
        { label: 'Zbiórka koleżeńska', value: 'Zbiórka koleżeńska' },
        { label: 'Inne (do wpisania)', value: '__custom__' },
    ],
    customSourcePlaceholder: 'Wpisz własne źródło finansowania',
};
const defaultUczestnicyUi = {
    title: 'Lista uczestników',
    availableFor: ['wydarzenie', 'wyjazd'],
    minRows: 1,
    maxRows: 30,
    addRowLabel: 'Dodaj uczestnika',
    removeRowLabel: 'Usuń',
    countLabel: 'Liczba uczestników',
    columns: {
        imie_nazwisko: 'Nazwisko i imię',
        wydzial: 'Wydział',
        kierunek: 'Kierunek',
        rok: 'Rok',
        kontakt: 'Dane kontaktowe',
    },
    columnHints: {
        imie_nazwisko: 'Imię i nazwisko uczestnika.',
        wydzial: 'Wydział, na którym studiuje uczestnik.',
        kierunek: 'Kierunek studiów uczestnika.',
        rok: 'Rok studiów.',
        kontakt: 'Telefon lub adres e-mail uczestnika.',
    },
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
        general: 'Informacje ogólne',
        costs: 'Tabela kosztów',
        details: 'Szczegóły przedsięwzięcia',
        participants: 'Lista uczestników',
        responsible: 'Dane osobowe do rozliczeń',
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
    templateData,
    ui,
    formData,
    costRows,
    participantRows,
    uczestnicyUi: uczestnicyUiProp,
    uczestnicyAvailable,
    complexDates,
    onChange,
    onCostRowChange,
    onAddCostRow,
    onRemoveCostRow,
    onParticipantRowChange,
    onAddParticipantRow,
    onRemoveParticipantRow,
    onComplexDateChange,
    onComplexSelect,
    onOrganizerSingleSelect,
    organizerMode,
    onOrganizerModeChange,
    onComplexMultiSelect,
    isPrzedsięwzięcieTooShort,
    isRozliczenieTooSoon,
    rozliczenieTouched,
    onResetRozliczenie,
    kosztWymaganyTouched,
    kosztWymaganyDisplay,
    onResetKosztWymagany,
    onGenerateDocument,
    loading,
    error,
    financingSourceOptions,
}) {
    const [currentPage, setCurrentPage] = useState(0);

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
        sourceOptions: financingSourceOptions ?? templateData?.form_koszty?.sourceOptions ?? defaultCostUi.sourceOptions,
    };
    const uczestnicyUi = {
        ...defaultUczestnicyUi,
        ...(uczestnicyUiProp ?? {}),
        columns: {
            ...defaultUczestnicyUi.columns,
            ...(uczestnicyUiProp?.columns ?? {}),
        },
        columnHints: {
            ...defaultUczestnicyUi.columnHints,
            ...(uczestnicyUiProp?.columnHints ?? {}),
        },
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

        if (field.type === 'select_complex_multi') {
            const selectedNames = Array.isArray(formData[field.id]) ? formData[field.id] : [];
            const isOrganizerField = field.id === 'wybor_organizacji';

            return (
                <div key={field.id} className="w-full flex flex-col">
                    <div className={labelClass}>
                        <span className={spanTextClass}>{field.label}: {hintElement}</span>
                        <div className="flex-1 flex flex-col gap-3">
                            {isOrganizerField && (
                                <div className="organizer-mode" role="radiogroup" aria-label="Liczba organizatorów">
                                    <label>
                                        <input
                                            type="radio"
                                            name="organizerMode"
                                            checked={organizerMode === 'single'}
                                            onChange={() => onOrganizerModeChange('single')}
                                        />
                                        Jeden organizator
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            name="organizerMode"
                                            checked={organizerMode === 'multiple'}
                                            onChange={() => onOrganizerModeChange('multiple')}
                                        />
                                        Kilku organizatorów
                                    </label>
                                </div>
                            )}
                            {isOrganizerField && organizerMode === 'single' ? (
                                <select
                                    className={inputClass}
                                    value={selectedNames[0] ?? ''}
                                    onChange={(e) => onOrganizerSingleSelect(field, e.target.value)}
                                >
                                    <option value="">{formUi.selectPlaceholder}</option>
                                    {field.options.map((opt) => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                                </select>
                            ) : (
                                <div className="flex flex-col gap-2 border border-gray-300 rounded p-3">
                                    {field.options.map((opt) => (
                                        <label key={opt.name} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 accent-pss-blue"
                                                style={{accentColor: 'var(--pss-blue)'}}
                                                checked={selectedNames.includes(opt.name)}
                                                onChange={(e) => onComplexMultiSelect(field.id, opt.name, e.target.checked, field.options)}
                                            />
                                            <span className="text-sm text-gray-700">{opt.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
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
                        className="mt-3 h-5 w-5"
                        style={{accentColor: 'var(--pss-blue)'}}
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
                {field.id === 'data_rozliczenia' && (
                    <>
                        {isRozliczenieTooSoon() && (
                            <div className="flex flex-row w-full">
                                <div className="w-2/5"></div>
                                <p className="flex-1 text-red-500 text-xs font-semibold mt-1 animate-pulse ml-4">
                                    {formUi.fieldWarnings['data_rozliczenia']?.message
                                        ?? '⚠️ Uwaga: termin rozliczenia jest krótszy niż wymagane 14 dni od przedsięwzięcia!'}
                                </p>
                            </div>
                        )}
                        {rozliczenieTouched && (
                            <div className="flex flex-row w-full">
                                <div className="w-2/5"></div>
                                <button
                                    type="button"
                                    onClick={onResetRozliczenie}
                                    className="flex-1 text-left text-blue-600 hover:text-blue-800 text-xs font-medium mt-1 ml-4"
                                >
                                    Przywróć sugerowany termin (14 dni + najbliższy dzień roboczy)
                                </button>
                            </div>
                        )}
                    </>
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
        const totalCost = costRows.reduce(
            (sum, row) => sum + (parseFloat(String(row.quantity).replace(',', '.')) || 0) * (parseFloat(String(row.unitPrice).replace(',', '.')) || 0),
            0,
        );
        const totalCostLabel = totalCost.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return (
            <div className="border-t border-gray-300 pt-6 mt-2 flex flex-col gap-4">
                <label className={labelClass}>
                    <span className={spanTextClass}>Bezkosztowe:</span>
                    <input
                        type="checkbox"
                        name="bezkosztowe"
                        checked={isBezkosztowe}
                        onChange={onChange}
                        className="mt-3 h-5 w-5"
                        style={{accentColor: 'var(--pss-blue)'}}
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
                                        <td className="border border-gray-200 px-2 py-2 w-40" style={{minWidth:'140px', maxWidth:'180px'}}>
                                            <select
                                                className="w-full p-2 border border-gray-300 rounded"
                                                value={sourceValue}
                                                onChange={(e) => onCostRowChange(row.id, 'source', e.target.value)}
                                            >
                                                <option value="">Wybierz...</option>
                                                {costUi.sourceOptions.map((option) => {
                                                    const normalizedOption = typeof option === 'string'
                                                        ? { label: option, value: option === 'Wpisz własne' ? '__custom__' : option }
                                                        : option;
                                                    return (
                                                    <option key={normalizedOption.value} value={normalizedOption.value}>
                                                        {normalizedOption.label}
                                                    </option>
                                                    );
                                                })}
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

                <div className="flex flex-col items-end gap-1 mt-1">
                    <p className="text-sm text-gray-700">
                        {costUi.totalLabel ?? 'Razem (koszt całkowity)'}: <span className="font-semibold">{totalCostLabel} zł</span>
                    </p>
                </div>

                <label className={labelClass}>
                    <span className={spanTextClass}>
                        {costUi.requiredAmountLabel ?? 'Kwota wnioskowana (koszt wymagany)'}:
                        {costUi.requiredAmountHint ? renderHint(costUi.requiredAmountHint) : null}
                    </span>
                    <div className="flex-1 flex items-center gap-3">
                        <input
                            type="text"
                            name="koszt_wymagany"
                            onChange={onChange}
                            value={kosztWymaganyDisplay ?? ''}
                            className={inputClass}
                        />
                        {kosztWymaganyTouched && (
                            <button
                                type="button"
                                onClick={onResetKosztWymagany}
                                className="whitespace-nowrap text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                                Przywróć sumę
                            </button>
                        )}
                    </div>
                </label>
                    </>
                )}
            </div>
        );
    };

    const renderFields = (fields = []) => fields.map(renderField);

    const renderParticipantTable = () => {
        if (!uczestnicyAvailable || !templateData?.form_uczestnicy) {
            return null;
        }

        const canAddRow = participantRows.length < (uczestnicyUi.maxRows ?? 30);
        const canRemoveRow = participantRows.length > (uczestnicyUi.minRows ?? 1);
        const filledCount = participantRows.filter((row) => String(row.imieNazwisko ?? '').trim()).length;
        const columnKeys = ['imie_nazwisko', 'wydzial', 'kierunek', 'rok', 'kontakt'];
        const rowFieldMap = {
            imie_nazwisko: 'imieNazwisko',
            wydzial: 'wydzial',
            kierunek: 'kierunek',
            rok: 'rok',
            kontakt: 'kontakt',
        };

        return (
            <div className="border-t border-gray-300 pt-6 mt-2 flex flex-col gap-4">
                <p className="font-semibold text-gray-700 text-center pt-0 mb-2">
                    {uczestnicyUi.title}
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border border-gray-200 px-2 py-2 text-left">Lp.</th>
                                {columnKeys.map((key) => (
                                    <th key={key} className="border border-gray-200 px-2 py-2 text-left">
                                        <span className="inline-flex items-center gap-1">
                                            {uczestnicyUi.columns[key]}
                                            {uczestnicyUi.columnHints[key] ? renderHint(uczestnicyUi.columnHints[key], 'bottom') : null}
                                        </span>
                                    </th>
                                ))}
                                <th className="border border-gray-200 px-2 py-2 text-left">Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participantRows.map((row, index) => (
                                <tr key={row.id} className="align-top">
                                    <td className="border border-gray-200 px-2 py-2 w-12 text-center">{index + 1}</td>
                                    {columnKeys.map((key) => (
                                        <td key={key} className="border border-gray-200 px-2 py-2">
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-gray-300 rounded"
                                                value={row[rowFieldMap[key]]}
                                                onChange={(e) => onParticipantRowChange(row.id, rowFieldMap[key], e.target.value)}
                                            />
                                        </td>
                                    ))}
                                    <td className="border border-gray-200 px-2 py-2 w-24">
                                        <button
                                            type="button"
                                            className="text-red-600 disabled:text-gray-400"
                                            onClick={() => onRemoveParticipantRow(row.id)}
                                            disabled={!canRemoveRow}
                                        >
                                            {uczestnicyUi.removeRowLabel}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onAddParticipantRow}
                        disabled={!canAddRow}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-white font-bold py-2 px-6 rounded shadow"
                    >
                        {uczestnicyUi.addRowLabel}
                    </button>
                </div>

                <p className="text-sm text-gray-700 text-right">
                    {uczestnicyUi.countLabel ?? 'Liczba uczestników'}: <span className="font-semibold">{filledCount}</span>
                    <span className="text-gray-400"> (wiersze z uzupełnionym imieniem i nazwiskiem)</span>
                </p>
            </div>
        );
    };

    const conditionalForms = {
        wydarzenie: templateData?.form_wydarzenie ?? [],
        zakup: templateData?.form_zakup ?? [],
        wyjazd: templateData?.form_wyjazd ?? [],
    };

    const pages = [
        { title: formUi.sectionTitles.general ?? 'Informacje ogólne', content: () => (
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
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </label>
                {renderFields(templateData.form_wniosek)}
            </>
        ) },
        { title: formUi.sectionTitles.costs ?? 'Tabela kosztów', content: () => renderCostTable() },
        { title: formUi.sectionTitles.details ?? 'Szczegóły przedsięwzięcia', content: () => (
            <div className="form-page-fields">{renderFields(conditionalForms[formData.typ_wniosku] ?? [])}</div>
        ) },
        { title: formUi.sectionTitles.participants ?? 'Lista uczestników', content: () => (
            uczestnicyAvailable ? renderParticipantTable() : (
                <p className="empty-page-message">Lista uczestników nie dotyczy wybranego typu przedsięwzięcia.</p>
            )
        ) },
        { title: formUi.sectionTitles.responsible ?? 'Dane osobowe do rozliczeń', content: () => (
            <>
                <div className="form-page-fields">{renderFields(templateData.form_odpowiedzialny)}</div>
                <div className="form-page-fields">{renderField(templateData.end)}</div>
            </>
        ) },
    ];
    const activePage = pages[currentPage] ?? pages[0];

    return (
        <div className="flex flex-col gap-4 w-full border border-gray-200 p-6 rounded-xl bg-white shadow-sm text-left overflow-hidden">

            {loading && <p className="text-gray-500 text-center">{formUi.loadingText}</p>}
            {error && <p className="text-red-600 text-center">{error}</p>}

            {!loading && templateData && (
                <div className="form-wizard">
                    <aside className="form-wizard-sidebar">
                        {pages.map((page, index) => (
                            <button
                                key={page.title}
                                type="button"
                                className={`wizard-step-button ${index === currentPage ? 'active' : ''}`}
                                onClick={() => setCurrentPage(index)}
                            >
                                &gt; {page.title}
                            </button>
                        ))}
                        <div className="form-wizard-actions">
                            <button
                                type="button"
                                className="wizard-secondary-button"
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage((page) => Math.max(page - 1, 0))}
                            >
                                Wstecz
                            </button>
                            {currentPage < pages.length - 1 ? (
                                <button
                                    type="button"
                                    className="wizard-primary-button"
                                    onClick={() => setCurrentPage((page) => Math.min(page + 1, pages.length - 1))}
                                >
                                    Przejdź dalej <span aria-hidden="true">→</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onGenerateDocument}
                                    className="wizard-primary-button"
                                >
                                    {formUi.generateButtonText}
                                </button>
                            )}
                        </div>
                    </aside>
                    <section className="form-wizard-content">
                        <h2>{activePage.title}:</h2>
                        <div className="form-page-content">{activePage.content()}</div>
                    </section>
                </div>
            )}
        </div>
    );
}
