import { useState, useEffect } from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { format, addDays, getDay, differenceInDays, parseISO } from 'date-fns';
import dane from '/public/dane.json';
import logo_pss from '/public/assets/logo_pss.png';

// Pomocnicza funkcja do obliczania daty rozliczenia (od zakończenia wydarzenia)
const calculateDefaultRozliczenie = (dateStr) => {
    if (!dateStr) return '';
    const baseDate = parseISO(dateStr);
    let targetDate = addDays(baseDate, 14);
    const dayOfWeek = getDay(targetDate); // 0 = niedziela, 3 = środa, 6 = sobota

    if (dayOfWeek === 3 || dayOfWeek === 0) {
        targetDate = addDays(baseDate, 15);
    } else if (dayOfWeek === 6) {
        targetDate = addDays(baseDate, 16);
    }
    return format(targetDate, 'yyyy-MM-dd');
};

// Pomocnicza funkcja do formatowania zakresu dat (complex_date) dla Worda
const formatComplexDate = (startStr, endStr) => {
    if (!startStr || !endStr) return '';
    const start = parseISO(startStr);
    const end = parseISO(endStr);

    const startDay = format(start, 'dd');
    const startMonth = format(start, 'MM');
    const endDay = format(end, 'dd');
    const endMonth = format(end, 'MM');
    const endYear = format(end, 'yyyy');

    if (startMonth === endMonth) {
        return `${startDay}-${endDay}.${endMonth}.${endYear}`;
    } else {
        return `${startDay}.${startMonth}-${endDay}.${endMonth}.${endYear}`;
    }
};

function App() {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const [formData, setFormData] = useState({
        typ_wniosku: 'wydarzenie',
        data_wniosku: todayStr,
        opiekun: 'Prorektor ds. Studenckich' // Domyślnie dla PSS
    });

    const [complexDates, setComplexDates] = useState({});

    // Obliczanie niewidocznej dla usera data_rozliczenia
    useEffect(() => {
        let baseDateForRozliczenie = null;

        // Bierzemy datę końcową dla wyjazdu lub zwykłą datę dla wydarzenia/zakupu
        if (formData.typ_wniosku === 'wyjazd' && complexDates['data_przedsięwzięcia']?.end) {
            baseDateForRozliczenie = complexDates['data_przedsięwzięcia'].end;
        } else if (formData.typ_wniosku !== 'wyjazd' && formData['data_przedsięwzięcia']) {
            baseDateForRozliczenie = formData['data_przedsięwzięcia'];
        }

        if (baseDateForRozliczenie) {
            setFormData((prev) => ({
                ...prev,
                data_rozliczenia: calculateDefaultRozliczenie(baseDateForRozliczenie),
            }));
        }
    }, [formData['data_przedsięwzięcia'], complexDates, formData.typ_wniosku]);

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleComplexDateChange = (fieldId, type, value) => {
        setComplexDates((prev) => {
            const updated = {
                ...prev,
                [fieldId]: { ...prev[fieldId], [type]: value }
            };

            if (updated[fieldId].start && updated[fieldId].end) {
                const formatted = formatComplexDate(updated[fieldId].start, updated[fieldId].end);
                setFormData(fPrev => ({ ...fPrev, [fieldId]: formatted }));
            }
            return updated;
        });
    };

    // Walidacja czy między złożeniem wniosku a rozpoczęciem jest 14 dni
    const isPrzedsięwzięcieTooShort = () => {
        if (!formData.data_wniosku) return false;
        let eventDateStr = null;

        if (formData.typ_wniosku === 'wyjazd') {
            eventDateStr = complexDates['data_przedsięwzięcia']?.start;
        } else {
            eventDateStr = formData['data_przedsięwzięcia'];
        }

        if (!eventDateStr) return false;

        const start = parseISO(formData.data_wniosku);
        const eventDate = parseISO(eventDateStr);
        return differenceInDays(eventDate, start) < 14;
    };

    const labelClass = "flex flex-row items-start gap-4 w-full my-1";
    const spanTextClass = "w-2/5 text-right font-medium text-gray-700 pt-2 flex items-center justify-end gap-1";
    const inputClass = "flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

    const renderField = (field) => {
        const hintElement = field.hint ? (
            <div className="relative group inline-block cursor-pointer ml-1 select-none text-gray-400 hover:text-blue-500">
                <span className="border border-gray-400 rounded-full w-4 h-4 inline-flex items-center justify-center text-xs font-bold">?</span>
                <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-64 bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10 shadow-md whitespace-normal font-normal text-center">
                    {field.hint}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
            </div>
        ) : null;

        if (field.type === 'select_complex') {
            return (
                <label key={field.id} className={labelClass}>
                    <span className={spanTextClass}>{field.label}: {hintElement}</span>
                    <select
                        className={inputClass}
                        onChange={(e) => {
                            if (!e.target.value) return;
                            const selectedTags = JSON.parse(e.target.value);

                            let opiekunValue = "Prorektor ds. Studenckich";
                            if (selectedTags.organizacja_mianownik && selectedTags.organizacja_mianownik.includes("Wydział")) {
                                opiekunValue = "Przewodniczący PSS";
                            }

                            setFormData((prev) => ({
                                ...prev,
                                ...selectedTags,
                                opiekun: opiekunValue
                            }));
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
                        onChange={handleChange}
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
                                onChange={(e) => handleComplexDateChange(field.id, 'start', e.target.value)}
                            />
                            <span className="self-center text-gray-500">do</span>
                            <input
                                type="date"
                                className={inputClass}
                                value={currentComplex.end}
                                onChange={(e) => handleComplexDateChange(field.id, 'end', e.target.value)}
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

        // --- TUTAJ DODAJEMY OBSŁUGĘ TEXTAREA ---
        if (field.type === 'textarea') {
            return (
                <label key={field.id} className={labelClass}>
                    <span className={spanTextClass}>{field.label}: {hintElement}</span>
                    <textarea
                        name={field.id}
                        onChange={handleChange}
                        value={formData[field.id] !== undefined ? formData[field.id] : (field.value || '')}
                        placeholder={field.placeholder}
                        className={`${inputClass} min-h-[100px] resize-y`} // Definiujemy minimalną wysokość i możliwość zmiany rozmiaru w pionie
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
                        onChange={handleChange}
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
        wydarzenie: dane.form_wydarzenie ?? [],
        zakup: dane.form_zakup ?? [],
        wyjazd: dane.form_wyjazd ?? [],
    };

    const generateDocument = async () => {
        try {
            const response = await fetch('./public/Dofinansowanie.docx');
            if (!response.ok) {
                alert('Nie udało się pobrać szablonu');
                return;
            }

            const content = await response.arrayBuffer();
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            const finalData = { ...formData };
            if (finalData.data_wniosku) {
                finalData.data_wniosku = format(parseISO(finalData.data_wniosku), 'dd.MM.yyyy');
            }
            if (finalData.data_rozliczenia) {
                finalData.data_rozliczenia = format(parseISO(finalData.data_rozliczenia), 'dd.MM.yyyy');
            }

            doc.render({
                ...dane.static_tags,
                ...finalData
            });

            const blob = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            saveAs(blob, 'Wniosek_Wypelniony.docx');
        } catch (error) {
            console.error('Błąd:', error);
            alert('Coś poszło nie tak przy generowaniu!');
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <p className="font-bold tracking-tighter text-blue-600 text-4xl pb-5">Generator wniosku</p>

            <div className="flex flex-col gap-4 w-full border border-gray-200 p-6 rounded-lg bg-white shadow-sm">

                <label className={labelClass}>
                    <span className={spanTextClass}>Typ przedsięwzięcia:</span>
                    <select
                        name="typ_wniosku"
                        value={formData.typ_wniosku}
                        onChange={handleChange}
                        className={inputClass}
                        defaultValue={formData.typ_wniosku}
                    >
                        <option value="wydarzenie">Wydarzenie</option>
                        <option value="zakup">Zakup</option>
                        <option value="wyjazd">Wyjazd</option>
                    </select>
                </label>

                {renderFields(dane.form_wniosek)}
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
                    {renderFields(dane.form_odpowiedzialny)}
                </div>
                <div className="border-t border-gray-300 pt-6 mt-2 flex flex-col gap-4">
                    {renderField(dane.end)}
                </div>
                <div className="flex justify-end mt-4">
                    <button
                        onClick={generateDocument}
                        className="bg-blue-500 hover:bg-blue-600 transition-colors text-white font-bold py-2 px-6 rounded shadow"
                    >
                        Generuj gotowy dokument
                    </button>
                </div>
            </div>

            {/* STOPKA */}
            <div className="mt-10 text-left px-6 border-2 border-gray-200 py-2 bg-gray-100 flex flex-row items-end justify-between">
                <a href="https://www.samorzad.zut.edu.pl/index.php?id=9298" target="_blank" rel="noopener noreferrer" className="h-auto w-1/4">
                    <img src={logo_pss} alt="Logo PSS"/>
                </a>
                <div>
                    <p>Utworzone przez <a href={dane.dev.link} className="font-bold tracking-tighter text-blue-600" target="_blank">{dane.dev.author}</a></p>
                    <p>Wersja: {dane.dev.version}</p>
                    <p>Ostatnia aktualizacja: {dane.dev.date}</p>
                </div>
            </div>
        </div>
    );
}

export default App;