import { useEffect, useState } from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { format, addDays, getDay, differenceInDays, parseISO } from 'date-fns';
import TemplatePicker from './components/TemplatePicker.jsx';
import TemplateForm from './components/TemplateForm.jsx';
import AppFooter from './components/AppFooter.jsx';

const calculateDefaultRozliczenie = (dateStr) => {
    if (!dateStr) return '';
    const baseDate = parseISO(dateStr);
    let targetDate = addDays(baseDate, 14);
    const dayOfWeek = getDay(targetDate);

    if (dayOfWeek === 3 || dayOfWeek === 0) {
        targetDate = addDays(baseDate, 15);
    } else if (dayOfWeek === 6) {
        targetDate = addDays(baseDate, 16);
    }

    return format(targetDate, 'yyyy-MM-dd');
};

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
    }

    return `${startDay}.${startMonth}-${endDay}.${endMonth}.${endYear}`;
};

const createInitialFormData = (todayStr) => ({
    typ_wniosku: 'wydarzenie',
    data_wniosku: todayStr,
    opiekun: 'Prorektor ds. Studenckich',
});

const resolvePublicUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
const templateConfigUrl = resolvePublicUrl('templates.json');

function App() {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const [templates, setTemplates] = useState([]);
    const [templatesConfig, setTemplatesConfig] = useState(null);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [templatesError, setTemplatesError] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [templateData, setTemplateData] = useState(null);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [templateError, setTemplateError] = useState('');
    const [formData, setFormData] = useState(() => createInitialFormData(todayStr));
    const [complexDates, setComplexDates] = useState({});

    useEffect(() => {
        let isMounted = true;

        const loadTemplates = async () => {
            try {
                const response = await fetch(templateConfigUrl);
                if (!response.ok) {
                    throw new Error('Nie udało się pobrać listy dokumentów.');
                }

                const data = await response.json();
                const list = Array.isArray(data.templates) ? data.templates : [];

                if (!list.length) {
                    throw new Error('Lista dokumentów jest pusta.');
                }

                if (isMounted) {
                    const defaultTemplateId = list.some((item) => item.id === data.defaultTemplateId)
                        ? data.defaultTemplateId
                        : list[0].id;

                    setTemplatesConfig(data);
                    setTemplates(list);
                    setSelectedTemplateId(defaultTemplateId);
                }
            } catch (error) {
                if (isMounted) {
                    setTemplatesError(error.message);
                }
            } finally {
                if (isMounted) {
                    setTemplatesLoading(false);
                }
            }
        };

        loadTemplates();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!activeTemplate) {
            return;
        }

        let isMounted = true;

        const loadTemplate = async () => {
            setTemplateLoading(true);
            setTemplateError('');

            try {
                const response = await fetch(resolvePublicUrl(activeTemplate.jsonUrl));
                if (!response.ok) {
                    throw new Error(`Nie udało się pobrać konfiguracji dla: ${activeTemplate.label}`);
                }

                const data = await response.json();

                if (isMounted) {
                    setTemplateData(data);
                    setFormData(createInitialFormData(todayStr));
                    setComplexDates({});
                }
            } catch (error) {
                if (isMounted) {
                    setTemplateError(error.message);
                }
            } finally {
                if (isMounted) {
                    setTemplateLoading(false);
                }
            }
        };

        loadTemplate();

        return () => {
            isMounted = false;
        };
    }, [activeTemplate, todayStr]);

    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

    const resolveRozliczenieBaseDate = (nextFormData, nextComplexDates) => {
        if (nextFormData.typ_wniosku === 'wyjazd') {
            return nextComplexDates['data_przedsięwzięcia']?.end ?? null;
        }

        return nextFormData['data_przedsięwzięcia'] ?? null;
    };

    const syncRozliczenie = (nextFormData, nextComplexDates) => {
        const baseDateForRozliczenie = resolveRozliczenieBaseDate(nextFormData, nextComplexDates);

        if (!baseDateForRozliczenie) {
            const nextFormDataWithoutRozliczenie = { ...nextFormData };
            delete nextFormDataWithoutRozliczenie.data_rozliczenia;
            return nextFormDataWithoutRozliczenie;
        }

        return {
            ...nextFormData,
            data_rozliczenia: calculateDefaultRozliczenie(baseDateForRozliczenie),
        };
    };

    const handleChange = (e) => {
        setFormData((prev) => syncRozliczenie({
            ...prev,
            [e.target.name]: e.target.value,
        }, complexDates));
    };

    const handleComplexSelect = (selectedTags) => {
        let opiekunValue = 'Prorektor ds. Studenckich';

        if (selectedTags.organizacja_mianownik && selectedTags.organizacja_mianownik.includes('Wydział')) {
            opiekunValue = 'Przewodniczący PSS';
        }

        setFormData((prev) => syncRozliczenie({
            ...prev,
            ...selectedTags,
            opiekun: opiekunValue,
        }, complexDates));
    };

    const handleComplexDateChange = (fieldId, type, value) => {
        setComplexDates((prev) => {
            const updated = {
                ...prev,
                [fieldId]: { ...prev[fieldId], [type]: value },
            };

            if (updated[fieldId].start && updated[fieldId].end) {
                const formatted = formatComplexDate(updated[fieldId].start, updated[fieldId].end);
                setFormData((current) => syncRozliczenie({
                    ...current,
                    [fieldId]: formatted,
                }, updated));
            } else {
                setFormData((current) => syncRozliczenie(current, updated));
            }

            return updated;
        });
    };

    const isPrzedsięwzięcieTooShort = () => {
        if (!formData.data_wniosku) return false;

        const eventDateStr = formData.typ_wniosku === 'wyjazd'
            ? complexDates['data_przedsięwzięcia']?.start
            : formData['data_przedsięwzięcia'];

        if (!eventDateStr) return false;

        const start = parseISO(formData.data_wniosku);
        const eventDate = parseISO(eventDateStr);
        return differenceInDays(eventDate, start) < 14;
    };

    const resetTemplateSelection = () => {
        setActiveTemplate(null);
        setTemplateData(null);
        setTemplateError('');
        setSelectedTemplateId(templates[0]?.id ?? '');
        setFormData(createInitialFormData(todayStr));
        setComplexDates({});
    };

    const generateDocument = async () => {
        if (!activeTemplate || !templateData) {
            alert('Najpierw wybierz dokument.');
            return;
        }

        try {
            const response = await fetch(resolvePublicUrl(activeTemplate.docxUrl));
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
                ...(templateData.static_tags ?? {}),
                ...finalData,
            });

            const blob = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            saveAs(blob, `${activeTemplate.id}_wypelniony.docx`);
        } catch (error) {
            console.error('Błąd:', error);
            alert('Coś poszło nie tak przy generowaniu!');
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <p className="font-bold tracking-normal text-blue-900 text-4xl pb-5">e-Parlament</p>

            {activeTemplate ? (
                <TemplateForm
                    activeTemplate={activeTemplate}
                    templateData={templateData}
                    formData={formData}
                    complexDates={complexDates}
                    onChange={handleChange}
                    onComplexDateChange={handleComplexDateChange}
                    onComplexSelect={handleComplexSelect}
                    isPrzedsięwzięcieTooShort={isPrzedsięwzięcieTooShort}
                    onGenerateDocument={generateDocument}
                    onResetTemplateSelection={resetTemplateSelection}
                    loading={templateLoading}
                    error={templateError}
                />
            ) : (
                <TemplatePicker
                    templates={templates}
                    selectedTemplateId={selectedTemplateId}
                    onSelectTemplate={setSelectedTemplateId}
                    onContinue={() => selectedTemplate && setActiveTemplate(selectedTemplate)}
                    loading={templatesLoading}
                    error={templatesError}
                />
            )}

            <AppFooter devInfo={templatesConfig?.dev} />
        </div>
    );
}

export default App;