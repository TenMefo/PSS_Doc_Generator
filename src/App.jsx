import { useEffect, useState } from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { format, addDays, getDay, differenceInDays, parseISO } from 'date-fns';
import TemplatePicker from './components/TemplatePicker.jsx';
import TemplateForm from './components/TemplateForm.jsx';
import AppFooter from './components/AppFooter.jsx';

const strikeText = (text) => text.split('').join('\u0336') + '\u0336';

// Łączy nazwy/teksty organizatorów w naturalny polski sposób: "A", "A oraz B", "A, B oraz C".
const joinPolishList = (items, lastSeparator = ' oraz ') => {
    const filtered = items.filter(Boolean);
    if (filtered.length === 0) return '';
    if (filtered.length === 1) return filtered[0];
    return `${filtered.slice(0, -1).join(', ')}${lastSeparator}${filtered[filtered.length - 1]}`;
};

// Składa tagi kilku wybranych organizatorów w jeden zestaw tagów dla wniosku wspólnego.
const combineOrganizerTags = (selectedOptions) => {
    if (!selectedOptions || selectedOptions.length === 0) {
        return {
            organizacja_dopelniacz: '',
            organizacja_mianownik: '',
            swss: '',
            wydzial: undefined,
        };
    }

    const anyWydzial = selectedOptions.some((opt) => Boolean(opt.tags?.wydzial));

    return {
        organizacja_dopelniacz: joinPolishList(selectedOptions.map((opt) => opt.tags?.organizacja_dopelniacz)),
        organizacja_mianownik: joinPolishList(selectedOptions.map((opt) => opt.tags?.organizacja_mianownik)),
        swss: selectedOptions.map((opt) => opt.tags?.swss).filter(Boolean).join('/'),
        wydzial: anyWydzial ? true : undefined,
    };
};

const emptyUndefinedValues = (value) => {
    if (Array.isArray(value)) return value.map(emptyUndefinedValues);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, emptyUndefinedValues(item)]));
    }
    return value === undefined || value === null || value === 'undefined' ? '' : value;
};

const formatFunkcjaDopelniacz = (funkcja = 'Przewodniczący') => {
    if (!funkcja) return 'Przewodniczącego';
    const lower = String(funkcja).trim().toLowerCase();
    if (lower === 'przewodniczący' || lower === 'przewodniczacy') return 'Przewodniczącego';
    if (lower === 'wiceprzewodniczący' || lower === 'wiceprzewodniczacy') return 'Wiceprzewodniczącego';
    if (lower.endsWith('y')) return `${funkcja.slice(0, -1)}ego`;
    return funkcja;
};

const getOrganizerChairmen = (templateData, selectedOrganizerNames) => {
    const organizerField = (templateData?.form_wniosek ?? []).find((field) => field.id === 'wybor_organizacji');
    const allOptions = organizerField?.options ?? [];
    const selectedOptions = allOptions.filter((opt) => selectedOrganizerNames.includes(opt.name));

    if (selectedOptions.length === 0) {
        return ['Przewodniczącego'];
    }

    return selectedOptions.map((opt) => {
        const swss = opt.tags?.swss;
        if (swss) {
            return `Przewodniczącego ${swss}`;
        }
        return `Przewodniczącego ${opt.name}`;
    });
};

const expandMultipleOrganizerSignatures = (documentXml, chairmen) => {
    if (!Array.isArray(chairmen) || chairmen.length <= 1) {
        return documentXml;
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(documentXml, 'application/xml');
    const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paragraphs = [...document.getElementsByTagNameNS(wordNamespace, 'p')];

    const firstChairman = chairmen[0];
    const sigParagraphs = paragraphs.filter((p) => p.textContent.includes(firstChairman));

    if (sigParagraphs.length === 0) {
        return documentXml;
    }

    sigParagraphs.forEach((sigP) => {
        let dotsP = sigP.previousSibling;
        while (dotsP && dotsP.nodeType !== 1) {
            dotsP = dotsP.previousSibling;
        }

        let insertAnchor = sigP;

        for (let i = 1; i < chairmen.length; i += 1) {
            const chairmanName = chairmen[i];

            let newDotsP = null;
            if (dotsP) {
                newDotsP = dotsP.cloneNode(true);
                const pPrTabs = newDotsP.getElementsByTagNameNS(wordNamespace, 'tabs')[0];
                if (pPrTabs) {
                    const tabDefs = [...pPrTabs.getElementsByTagNameNS(wordNamespace, 'tab')];
                    tabDefs.forEach((t) => {
                        const pos = parseInt(t.getAttributeNS(wordNamespace, 'pos') || t.getAttribute('w:pos') || '0', 10);
                        if (pos > 4500) {
                            pPrTabs.removeChild(t);
                        }
                    });
                }
                const rNodes = [...newDotsP.getElementsByTagNameNS(wordNamespace, 'r')];
                rNodes.forEach((r) => {
                    const childTabs = [...r.getElementsByTagNameNS(wordNamespace, 'tab')];
                    if (childTabs.length > 1) {
                        for (let tIdx = 1; tIdx < childTabs.length; tIdx += 1) {
                            r.removeChild(childTabs[tIdx]);
                        }
                    }
                    const tNodes = [...r.getElementsByTagNameNS(wordNamespace, 't')];
                    if (tNodes.length > 1 && tNodes[0].textContent.includes('…') && tNodes[1].textContent.includes('…')) {
                        r.removeChild(tNodes[1]);
                    }
                });
            }

            const newSigP = sigP.cloneNode(true);
            const sigRuns = [...newSigP.getElementsByTagNameNS(wordNamespace, 'r')];
            let pastChairmanRun = false;
            sigRuns.forEach((r) => {
                if (pastChairmanRun) {
                    newSigP.removeChild(r);
                } else if (r.textContent.includes(firstChairman)) {
                    pastChairmanRun = true;
                }
            });

            const textNodes = newSigP.getElementsByTagNameNS(wordNamespace, 't');
            for (const t of textNodes) {
                if (t.textContent.includes(firstChairman)) {
                    t.textContent = t.textContent.replace(firstChairman, chairmanName);
                }
            }

            if (newDotsP) {
                sigP.parentNode.insertBefore(newDotsP, insertAnchor.nextSibling);
                sigP.parentNode.insertBefore(newSigP, newDotsP.nextSibling);
                insertAnchor = newSigP;
            } else {
                sigP.parentNode.insertBefore(newSigP, insertAnchor.nextSibling);
                insertAnchor = newSigP;
            }
        }
    });

    return new XMLSerializer().serializeToString(document);
};

const replaceTextInParagraph = (p, target, replacement, wordNamespace) => {
    const textNodes = [...p.getElementsByTagNameNS(wordNamespace, 't')];
    for (const t of textNodes) {
        if (t.textContent.includes(target)) {
            t.textContent = t.textContent.replace(target, replacement);
            return true;
        }
    }
    const fullText = textNodes.map((t) => t.textContent).join('');
    if (fullText.includes(target)) {
        const newFullText = fullText.replace(target, replacement);
        if (textNodes.length > 0) {
            textNodes[0].textContent = newFullText;
            for (let i = 1; i < textNodes.length; i += 1) {
                textNodes[i].textContent = '';
            }
            return true;
        }
    }
    return false;
};

const getFacultyGenitiveName = (option) => {
    if (!option) return '';
    const dopelniacz = option.tags?.organizacja_dopelniacz || '';
    const stripped = dopelniacz.replace(/^Sejmiku\s+Wydziałowego\s+Samorządu\s+Studenckiego\s+/i, '').trim();
    if (stripped) return stripped;
    const wydzial = option.tags?.wydzial || option.name || '';
    if (wydzial.startsWith('Wydział ')) return wydzial.replace(/^Wydział\s+/, 'Wydziału ');
    return wydzial;
};

const expandMultipleFacultyDeanBlocks = (documentXml, facultyOptions) => {
    if (!Array.isArray(facultyOptions) || facultyOptions.length === 0) {
        return documentXml;
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(documentXml, 'application/xml');
    const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paragraphs = [...document.getElementsByTagNameNS(wordNamespace, 'p')];

    const deanStartIndex = paragraphs.findIndex((p) => p.textContent.includes('Zapoznałem się i akceptuję wniosek'));
    if (deanStartIndex === -1) {
        return documentXml;
    }

    let deanEndIndex = paragraphs.findIndex(
        (p, idx) => idx >= deanStartIndex && p.textContent.includes('upoważnionego prodziekana'),
    );
    if (deanEndIndex === -1) {
        deanEndIndex = deanStartIndex + 4;
    }

    const deanTemplatePs = paragraphs.slice(deanStartIndex, deanEndIndex + 1);
    const firstFacultyName = getFacultyGenitiveName(facultyOptions[0]);

    if (firstFacultyName) {
        const firstDeanSigP = deanTemplatePs.find((p) => p.textContent.includes('dziekana')) || deanTemplatePs[3];
        if (firstDeanSigP) {
            replaceTextInParagraph(firstDeanSigP, 'dziekana wydziału', `dziekana ${firstFacultyName}`, wordNamespace);
        }
    }

    let insertAnchor = deanTemplatePs[deanTemplatePs.length - 1];

    for (let i = 1; i < facultyOptions.length; i += 1) {
        const facultyName = getFacultyGenitiveName(facultyOptions[i]);
        const clonedPs = deanTemplatePs.map((p) => p.cloneNode(true));

        const clonedDeanSigP = clonedPs.find((p) => p.textContent.includes('dziekana')) || clonedPs[3];
        if (clonedDeanSigP) {
            if (!replaceTextInParagraph(clonedDeanSigP, `dziekana ${firstFacultyName}`, `dziekana ${facultyName}`, wordNamespace)) {
                replaceTextInParagraph(clonedDeanSigP, 'dziekana wydziału', `dziekana ${facultyName}`, wordNamespace);
            }
        }

        clonedPs.forEach((newP) => {
            insertAnchor.parentNode.insertBefore(newP, insertAnchor.nextSibling);
            insertAnchor = newP;
        });
    }

    return new XMLSerializer().serializeToString(document);
};

const PSS_FUNDS_VALUE = 'WYDZIELONE ŚRODKI NA DZIAŁALNOŚĆ NAUKOWĄ, WYCHOWAWCZĄ, KULTURALNĄ I SPORTOWO-REKREACYJNĄ STUDENTÓW POZ. SAMORZĄD STUDENCKI';

const getFinancingSourceOptions = (templateData, selectedOrganizerNames) => {
    const organizerField = (templateData?.form_wniosek ?? []).find((field) => field.id === 'wybor_organizacji');
    const selectedOrganizers = (organizerField?.options ?? [])
        .filter((option) => selectedOrganizerNames.includes(option.name));
    const deanSources = selectedOrganizers
        .filter((option) => option.tags?.wydzial)
        .map((option) => ({
            label: `Środki dziekana ${(option.tags.swss ?? '').replace(/^SWSS\s+/, '')}`,
            value: `Środki w dyspozycji dziekana ${(option.tags.swss ?? '').replace(/^SWSS\s+/, '')}`,
        }));

    return [
        { label: 'Środki PSS', value: PSS_FUNDS_VALUE },
        ...deanSources,
        { label: 'Nagroda za ankietyzację', value: 'Nagroda za ankietyzację' },
        { label: 'Zbiórka koleżeńska', value: 'Zbiórka koleżeńska' },
        { label: 'Inne (do wpisania)', value: '__custom__' },
    ];
};

const calculateDefaultRozliczenie = (dateStr, rozliczenieRules = {}) => {
    if (!dateStr) return '';
    const baseDate = parseISO(dateStr);
    const baseDays = rozliczenieRules.baseDays ?? 14;
    const targetDayAdjustments = rozliczenieRules.targetDayAdjustments ?? {};
    let targetDate = addDays(baseDate, baseDays);
    const dayOfWeek = getDay(targetDate);
    const additionalDays = targetDayAdjustments[dayOfWeek] ?? 0;

    if (additionalDays > 0) {
        targetDate = addDays(targetDate, additionalDays);
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

const calculateDays = (startStr, endStr) => {
    if (!startStr) return 0;
    if (!endStr) return 1;

    return Math.max(differenceInDays(parseISO(endStr), parseISO(startStr)) + 1, 1);
};

const extractDateRange = (complexDateValue) => {
    if (!complexDateValue) {
        return { start: '', end: '' };
    }

    if (Array.isArray(complexDateValue)) {
        return {
            start: complexDateValue[0] ?? '',
            end: complexDateValue[1] ?? '',
        };
    }

    return {
        start: complexDateValue.start ?? complexDateValue.from ?? '',
        end: complexDateValue.end ?? complexDateValue.to ?? '',
    };
};

const createCostRow = (overrides = {}) => ({
    id: overrides.id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    description: overrides.description ?? '',
    quantity: overrides.quantity ?? '1',
    unitPrice: overrides.unitPrice ?? '',
    amount: overrides.amount ?? '',
    sourceType: overrides.sourceType ?? 'option',
    source: overrides.source ?? '',
    customSource: overrides.customSource ?? '',
});

const createInitialCostRows = (count = 1) => Array.from({ length: count }, () => createCostRow());

const createParticipantRow = (overrides = {}) => ({
    id: overrides.id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    imieNazwisko: overrides.imieNazwisko ?? '',
    wydzial: overrides.wydzial ?? '',
    kierunek: overrides.kierunek ?? '',
    rok: overrides.rok ?? '',
    kontakt: overrides.kontakt ?? '',
});

const createInitialParticipantRows = (count = 1) => Array.from({ length: count }, () => createParticipantRow());

const createEmptyParticipantExportRow = () => ({
    lp: '',
    imie_nazwisko: '',
    wydzial: '',
    kierunek: '',
    rok: '',
    kontakt: '',
});

const padParticipantRows = (rows, minRows = 5) => {
    const padded = [...rows];
    while (padded.length < minRows) {
        padded.push(createEmptyParticipantExportRow());
    }
    return padded;
};

const parseMoneyValue = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const normalized = String(value).replace(/\s/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoneyValue = (value) => value.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const createEmptyCostExportRow = () => ({
    lp: '',
    opis: '',
    ilosc: '',
    cena_jednostkowa: '',
    kwota: '',
    zrodlo_finansowania: '',
});

const padCostRows = (rows, minRows = 5) => {
    const padded = [...rows];
    while (padded.length < minRows) {
        padded.push(createEmptyCostExportRow());
    }
    return padded;
};

const mergeCostSourceCells = (documentXml, renderedCostRows) => {
    const parser = new DOMParser();
    const document = parser.parseFromString(documentXml, 'application/xml');
    const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const tables = [...document.getElementsByTagNameNS(wordNamespace, 'tbl')];
    const costTable = tables.find((table) => table.textContent.includes('Źródło finansowania'));

    if (!costTable) return documentXml;

    const rows = [...costTable.children].filter((node) => node.localName === 'tr');
    const headerIndex = rows.findIndex((row) => row.textContent.includes('Źródło finansowania'));
    if (headerIndex < 0) return documentXml;

    const sourceCells = renderedCostRows
        .map((row, index) => ({
            source: row.zrodlo_finansowania,
            row: rows[headerIndex + index + 1],
        }))
        .filter(({ source, row }) => source && row);

    const cellChildren = (row) => [...row.children].filter((node) => node.localName === 'tc');
    const getCellProperties = (cell) => {
        let properties = [...cell.children].find((node) => node.localName === 'tcPr');
        if (!properties) {
            properties = document.createElementNS(wordNamespace, 'w:tcPr');
            cell.insertBefore(properties, cell.firstChild);
        }
        return properties;
    };
    const setVerticalMerge = (cell, value) => {
        const properties = getCellProperties(cell);
        [...properties.children]
            .filter((node) => node.localName === 'vMerge')
            .forEach((node) => properties.removeChild(node));
        const merge = document.createElementNS(wordNamespace, 'w:vMerge');
        merge.setAttributeNS(wordNamespace, 'w:val', value);
        properties.appendChild(merge);
    };

    let groupStart = 0;
    while (groupStart < sourceCells.length) {
        const source = sourceCells[groupStart].source;
        let groupEnd = groupStart;
        while (groupEnd + 1 < sourceCells.length && sourceCells[groupEnd + 1].source === source) {
            groupEnd += 1;
        }

        if (groupEnd > groupStart) {
            setVerticalMerge(cellChildren(sourceCells[groupStart].row).at(-1), 'restart');
            for (let index = groupStart + 1; index <= groupEnd; index += 1) {
                const cell = cellChildren(sourceCells[index].row).at(-1);
                setVerticalMerge(cell, 'continue');
                [...cell.children]
                    .filter((node) => node.localName !== 'tcPr')
                    .forEach((node) => cell.removeChild(node));
            }
        }

        groupStart = groupEnd + 1;
    }

    return new XMLSerializer().serializeToString(document);
};

const validateCostRows = (rows) => {
    for (const [index, row] of rows.entries()) {
        const rowNumber = index + 1;
        if (!String(row.description ?? '').trim()) return `Wiersz ${rowNumber}: uzupełnij wyszczególnienie kosztów.`;
        if (!String(row.quantity ?? '').trim()) return `Wiersz ${rowNumber}: uzupełnij ilość.`;
        if (!String(row.unitPrice ?? '').trim()) return `Wiersz ${rowNumber}: uzupełnij cenę jednostkową.`;

        const quantity = Number(String(row.quantity).replace(',', '.'));
        const unitPrice = parseMoneyValue(row.unitPrice);
        if (!Number.isFinite(quantity) || quantity <= 0) return `Wiersz ${rowNumber}: ilość musi być większa od 0.`;
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) return `Wiersz ${rowNumber}: cena jednostkowa musi być większa od 0.`;

        if (row.sourceType === 'custom') {
            if (!String(row.customSource ?? '').trim()) return `Wiersz ${rowNumber}: uzupełnij źródło finansowania.`;
        } else if (!String(row.source ?? '').trim()) {
            return `Wiersz ${rowNumber}: uzupełnij źródło finansowania.`;
        }
    }

    return '';
};

const createInitialFormData = (todayStr, defaultValues = {}) => ({
    typ_wniosku: 'wydarzenie',
    data_wniosku: todayStr,
    opiekun: defaultValues.opiekun ?? 'Prorektor ds. Studenckich',
    rok_preliminarz: String(new Date().getFullYear()),
    zgodny_z_planem: true,
    bezkosztowe: false,
    koszt_wymagany: '',
    wybor_organizacji: [],
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
    const [costRows, setCostRows] = useState(() => createInitialCostRows());
    const [participantRows, setParticipantRows] = useState(() => createInitialParticipantRows());
    const [kosztWymaganyTouched, setKosztWymaganyTouched] = useState(false);
    const [rozliczenieTouched, setRozliczenieTouched] = useState(false);
    const [organizerMode, setOrganizerMode] = useState('single');
    const formUi = templateData?.ui?.form;
    const costUi = templateData?.form_koszty;
    const uczestnicyUi = templateData?.form_uczestnicy;
    const uczestnicyAvailable = (uczestnicyUi?.availableFor ?? []).includes(formData.typ_wniosku);
    const financingSourceOptions = getFinancingSourceOptions(templateData, formData.wybor_organizacji);

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
                    setFormData(createInitialFormData(todayStr, data.ui?.form?.defaultValues));
                    setComplexDates({});
                    setCostRows(createInitialCostRows(data.form_koszty?.minRows ?? 1));
                    setParticipantRows(createInitialParticipantRows(data.form_uczestnicy?.minRows ?? 1));
                    setKosztWymaganyTouched(false);
                    setRozliczenieTouched(false);
                    setOrganizerMode('single');
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

    const syncRozliczenie = (nextFormData, nextComplexDates, options = {}) => {
        const touched = options.rozliczenieTouched ?? rozliczenieTouched;
        if (touched) {
            // Użytkownik ręcznie ustawił termin rozliczenia — nie nadpisujemy go automatycznie.
            return nextFormData;
        }

        const rozliczenieRules = formUi?.rules?.rozliczenie ?? {};
        const baseDateForRozliczenie = resolveRozliczenieBaseDate(nextFormData, nextComplexDates);

        if (!baseDateForRozliczenie) {
            const nextFormDataWithoutRozliczenie = { ...nextFormData };
            delete nextFormDataWithoutRozliczenie.data_rozliczenia;
            return nextFormDataWithoutRozliczenie;
        }

        return {
            ...nextFormData,
            data_rozliczenia: calculateDefaultRozliczenie(baseDateForRozliczenie, rozliczenieRules),
        };
    };

    const kosztCałkowityNumeric = formData.bezkosztowe
        ? 0
        : costRows.reduce((sum, row) => sum + (parseMoneyValue(row.quantity) * parseMoneyValue(row.unitPrice)), 0);
    // Dopóki użytkownik nie zmieni kwoty ręcznie (patrz handleKosztWymaganyChange w handleChange),
    // pole "koszt_wymagany" wyświetla i wysyła bieżącą sumę tabeli kosztów — bez zapisu do stanu,
    // żeby uniknąć efektu wywołującego setState (kaskadowe rendery).
    const kosztWymaganyDisplay = kosztWymaganyTouched
        ? (formData.koszt_wymagany ?? '')
        : formatMoneyValue(kosztCałkowityNumeric);

    const handleChange = (e) => {
        const { name } = e.target;
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

        if (name === 'data_rozliczenia') {
            // Ręczna edycja terminu rozliczenia — zapamiętujemy to i przestajemy nadpisywać wartość automatem.
            setRozliczenieTouched(true);
            setFormData((prev) => ({ ...prev, data_rozliczenia: value }));
            return;
        }

        if (name === 'koszt_wymagany') {
            setKosztWymaganyTouched(true);
            setFormData((prev) => ({ ...prev, koszt_wymagany: value }));
            return;
        }

        setFormData((prev) => syncRozliczenie({
            ...prev,
            [name]: value,
        }, complexDates));
    };

    const handleResetRozliczenie = () => {
        setRozliczenieTouched(false);
        setFormData((prev) => syncRozliczenie(prev, complexDates, { rozliczenieTouched: false }));
    };

    const handleResetKosztWymagany = () => {
        setKosztWymaganyTouched(false);
    };

    const handleComplexSelect = (selectedTags) => {
        const defaultValues = formUi?.defaultValues ?? {};
        let opiekunValue = defaultValues.opiekun ?? 'Prorektor ds. Studenckich';

        if (selectedTags.wydzial) {
            opiekunValue = defaultValues.opiekunDlaWydzialu ?? 'Przewodniczący PSS';
        }

        setFormData((prev) => syncRozliczenie({
            ...prev,
            ...selectedTags,
            opiekun: opiekunValue,
        }, complexDates));
    };

    const handleOrganizerSingleSelect = (field, optionName) => {
        const selectedOption = (field.options ?? []).find((option) => option.name === optionName);
        if (!selectedOption) return;

        const tags = combineOrganizerTags([selectedOption]);
        const defaultValues = formUi?.defaultValues ?? {};
        const validSourceValues = new Set(getFinancingSourceOptions(templateData, [optionName]).map((option) => option.value));
        setCostRows((rows) => rows.map((row) => (
            row.sourceType === 'option' && row.source && !validSourceValues.has(row.source)
                ? { ...row, source: '' }
                : row
        )));
        setFormData((prev) => syncRozliczenie({
            ...prev,
            wybor_organizacji: optionName ? [optionName] : [],
            ...tags,
            opiekun: tags.wydzial
                ? (defaultValues.opiekunDlaWydzialu ?? 'Przewodniczący PSS')
                : (defaultValues.opiekun ?? 'Prorektor ds. Studenckich'),
        }, complexDates));
    };

    const handleOrganizerModeChange = (nextMode) => {
        setOrganizerMode(nextMode);
        if (nextMode === 'single' && formData.wybor_organizacji.length > 1) {
            const firstName = formData.wybor_organizacji[0];
            const organizerField = (templateData?.form_wniosek ?? []).find((field) => field.id === 'wybor_organizacji');
            handleOrganizerSingleSelect(organizerField, firstName);
        }
    };

    // Obsługa pola typu select_complex_multi (np. wyboru kilku organizatorów naraz).
    // W przeciwieństwie do handleComplexSelect, tu zawsze przeliczamy tagi od nowa
    // na podstawie PEŁNEJ listy aktualnie zaznaczonych opcji (żeby odznaczenie działało poprawnie).
    const handleComplexMultiSelect = (fieldId, optionName, isChecked, allOptions) => {
        setFormData((prev) => {
            const prevNames = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
            const nextNames = isChecked
                ? (prevNames.includes(optionName) ? prevNames : [...prevNames, optionName])
                : prevNames.filter((name) => name !== optionName);

            const selectedOptions = allOptions.filter((opt) => nextNames.includes(opt.name));
            const combinedTags = combineOrganizerTags(selectedOptions);
            const validSourceValues = new Set(getFinancingSourceOptions(templateData, nextNames).map((option) => option.value));
            setCostRows((rows) => rows.map((row) => (
                row.sourceType === 'option' && row.source && !validSourceValues.has(row.source)
                    ? { ...row, source: '' }
                    : row
            )));
            const defaultValues = formUi?.defaultValues ?? {};
            const opiekunValue = combinedTags.wydzial
                ? (defaultValues.opiekunDlaWydzialu ?? 'Przewodniczący PSS')
                : (defaultValues.opiekun ?? 'Prorektor ds. Studenckich');

            return syncRozliczenie({
                ...prev,
                [fieldId]: nextNames,
                organizacja_dopelniacz: combinedTags.organizacja_dopelniacz,
                organizacja_mianownik: combinedTags.organizacja_mianownik,
                swss: combinedTags.swss,
                wydzial: combinedTags.wydzial,
                opiekun: opiekunValue,
            }, complexDates);
        });
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
                setFormData((current) => syncRozliczenie({
                    ...current,
                    [fieldId]: '',
                }, updated));
            }

            return updated;
        });
    };

    const handleCostRowChange = (rowId, field, value) => {
        setCostRows((prev) => prev.map((row) => {
            if (row.id !== rowId) return row;

            if (field === 'source') {
                if (value === '__custom__') {
                    return {
                        ...row,
                        sourceType: 'custom',
                        source: '',
                        customSource: '',
                    };
                }

                return {
                    ...row,
                    sourceType: 'option',
                    source: value,
                    customSource: '',
                };
            }

            return {
                ...row,
                [field]: value,
            };
        }));
    };

    const handleAddCostRow = () => {
        const maxRows = costUi?.maxRows ?? 10;
        setCostRows((prev) => (prev.length >= maxRows ? prev : [...prev, createCostRow()]));
    };

    const handleRemoveCostRow = (rowId) => {
        const minRows = costUi?.minRows ?? 1;
        setCostRows((prev) => {
            if (prev.length <= minRows) return prev;
            return prev.filter((row) => row.id !== rowId);
        });
    };

    const handleParticipantRowChange = (rowId, field, value) => {
        setParticipantRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
    };

    const handleAddParticipantRow = () => {
        const maxRows = uczestnicyUi?.maxRows ?? 30;
        setParticipantRows((prev) => (prev.length >= maxRows ? prev : [...prev, createParticipantRow()]));
    };

    const handleRemoveParticipantRow = (rowId) => {
        const minRows = uczestnicyUi?.minRows ?? 1;
        setParticipantRows((prev) => {
            if (prev.length <= minRows) return prev;
            return prev.filter((row) => row.id !== rowId);
        });
    };

    const isPrzedsięwzięcieTooShort = () => {
        if (!formData.data_wniosku) return false;

        const leadTimeDays = formUi?.fieldWarnings?.['data_przedsięwzięcia']?.leadTimeDays ?? 14;
        const eventDateStr = formData.typ_wniosku === 'wyjazd'
            ? complexDates['data_przedsięwzięcia']?.start
            : formData['data_przedsięwzięcia'];

        if (!eventDateStr) return false;

        const start = parseISO(formData.data_wniosku);
        const eventDate = parseISO(eventDateStr);
        return differenceInDays(eventDate, start) < leadTimeDays;
    };

    const isRozliczenieTooSoon = () => {
        if (!formData.data_rozliczenia) return false;

        const leadTimeDays = formUi?.fieldWarnings?.['data_rozliczenia']?.leadTimeDays ?? 14;
        const baseDateForRozliczenie = resolveRozliczenieBaseDate(formData, complexDates);

        if (!baseDateForRozliczenie) return false;

        const baseDate = parseISO(baseDateForRozliczenie);
        const rozliczenieDate = parseISO(formData.data_rozliczenia);
        return differenceInDays(rozliczenieDate, baseDate) < leadTimeDays;
    };

    const resetTemplateSelection = () => {
        setActiveTemplate(null);
        setTemplateData(null);
        setTemplateError('');
        setSelectedTemplateId(templates[0]?.id ?? '');
        setFormData(createInitialFormData(todayStr, formUi?.defaultValues));
        setComplexDates({});
        setCostRows(createInitialCostRows());
        setParticipantRows(createInitialParticipantRows());
        setKosztWymaganyTouched(false);
        setRozliczenieTouched(false);
        setOrganizerMode('single');
    };

    const generateDocument = async () => {
        if (!activeTemplate || !templateData) {
            alert(templatesConfig?.ui?.messages?.chooseDocumentFirst ?? 'Najpierw wybierz dokument.');
            return;
        }

        if (!Array.isArray(formData.wybor_organizacji) || formData.wybor_organizacji.length === 0) {
            alert('Wybierz przynajmniej jednego organizatora wniosku.');
            return;
        }

        try {
            const response = await fetch(resolvePublicUrl(activeTemplate.docxUrl));
            if (!response.ok) {
                alert('Nie udało się pobrać szablonu');
                return;
            }

            if (!formData.bezkosztowe) {
                const costValidationError = validateCostRows(costRows);
                if (costValidationError) {
                    alert(costValidationError);
                    return;
                }
            }

            const content = await response.arrayBuffer();
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: () => '',
            });

            // Data wyjazdu/wydarzenia jeszcze w formacie ISO — liczymy to PRZED ogólnym
            // formatowaniem dat poniżej, żeby nie zależeć od kolejności operacji.
            const eventRange = extractDateRange(complexDates['data_przedsięwzięcia']);
            let wyjazdStart = '';
            let wyjazdEnd = '';
            if (formData.typ_wniosku === 'wyjazd') {
                try {
                    wyjazdStart = eventRange.start ? format(parseISO(eventRange.start), 'dd.MM.yyyy') : '';
                    wyjazdEnd = eventRange.end ? format(parseISO(eventRange.end), 'dd.MM.yyyy') : '';
                } catch {
                    wyjazdStart = '';
                    wyjazdEnd = '';
                }
            } else if (formData['data_przedsięwzięcia']) {
                // Dla "wydarzenia" i "zakupu" nie ma zakresu dat — używamy tej samej,
                // pojedynczej daty jako początku i końca, żeby zdanie w dokumencie miało sens.
                try {
                    const singleDate = format(parseISO(formData['data_przedsięwzięcia']), 'dd.MM.yyyy');
                    wyjazdStart = singleDate;
                    wyjazdEnd = singleDate;
                } catch {
                    wyjazdStart = '';
                    wyjazdEnd = '';
                }
            }

            const finalData = { ...formData };

            // Upewniamy się, że żadne pole formularza zadeklarowane w JSON nie trafi jako undefined/null
            const allFormFields = [
                ...(templateData.form_wniosek ?? []),
                ...(templateData.form_wydarzenie ?? []),
                ...(templateData.form_zakup ?? []),
                ...(templateData.form_wyjazd ?? []),
                ...(templateData.form_odpowiedzialny ?? []),
                ...(templateData.end ? [templateData.end] : []),
            ];
            allFormFields.forEach((field) => {
                if (field?.id && (finalData[field.id] === undefined || finalData[field.id] === null)) {
                    finalData[field.id] = '';
                }
            });

            // Generyczne formatowanie WSZYSTKICH pól typu "date" zadeklarowanych w JSON na dd.mm.rrrr,
            // zamiast wybiórczego formatowania pojedynczych, zahardkodowanych nazw pól.
            const activeTypeFields = {
                wydarzenie: templateData.form_wydarzenie ?? [],
                zakup: templateData.form_zakup ?? [],
                wyjazd: templateData.form_wyjazd ?? [],
            }[formData.typ_wniosku] ?? [];

            const dateFieldIds = [...new Set([
                ...(templateData.form_wniosek ?? []),
                ...activeTypeFields,
                ...(templateData.form_odpowiedzialny ?? []),
                ...(templateData.end ? [templateData.end] : []),
            ]
                .filter((field) => field.type === 'date')
                .map((field) => field.id))];

            dateFieldIds.forEach((fieldId) => {
                if (finalData[fieldId]) {
                    try {
                        finalData[fieldId] = format(parseISO(finalData[fieldId]), 'dd.MM.yyyy');
                    } catch {
                        finalData[fieldId] = '';
                    }
                } else {
                    finalData[fieldId] = '';
                }
            });

            const sortedCostRows = [...costRows].sort((left, right) => {
                const leftSource = left.sourceType === 'custom' ? left.customSource : left.source;
                const rightSource = right.sourceType === 'custom' ? right.customSource : right.source;
                return String(leftSource ?? '').localeCompare(String(rightSource ?? ''), 'pl');
            });

            const renderedCostRows = formData.bezkosztowe
                ? padCostRows([], 5)
                : padCostRows(sortedCostRows.map((row, index) => ({
                    lp: index + 1,
                    opis: row.description,
                    ilosc: row.quantity || '1',
                    cena_jednostkowa: row.unitPrice,
                    kwota: formatMoneyValue(parseMoneyValue(row.quantity) * parseMoneyValue(row.unitPrice)),
                    zrodlo_finansowania: row.sourceType === 'custom' ? row.customSource : row.source,
                })), 5);

            finalData.koszty = renderedCostRows;
            finalData.koszt_całkowity = formatMoneyValue(kosztCałkowityNumeric);
            finalData.koszt_wymagany = formData.bezkosztowe
                ? '0,00'
                : formatMoneyValue(kosztWymaganyTouched ? parseMoneyValue(formData.koszt_wymagany) : kosztCałkowityNumeric);

            if (uczestnicyAvailable) {
                const filledParticipants = participantRows.filter((row) => String(row.imieNazwisko ?? '').trim());
                finalData.uczestnicy = padParticipantRows(
                    filledParticipants.map((row, index) => ({
                        lp: index + 1,
                        imie_nazwisko: row.imieNazwisko,
                        wydzial: row.wydzial,
                        kierunek: row.kierunek,
                        rok: row.rok,
                        kontakt: row.kontakt,
                    })),
                    5,
                );
                finalData.liczba_uczestników = String(filledParticipants.length);
            } else {
                finalData.uczestnicy = padParticipantRows([], 5);
                finalData.liczba_uczestników = '';
            }

            finalData.dzien_tekst = `${strikeText('dniu')}/dniach`;
            finalData.dzienTekst = finalData.dzien_tekst;
            if (calculateDays(eventRange.start, eventRange.end) <= 1) {
                finalData.dzien_tekst = `dniu/${strikeText('dniach')}`;
                finalData.dzienTekst = finalData.dzien_tekst;
            }

            finalData.cel_tekst = formData.typ_wniosku === 'wyjazd'
                ? `${strikeText('przedsięwzięcia')}/wyjazdu`
                : `przedsięwzięcia/${strikeText('wyjazdu')}`;
            finalData.celTekst = finalData.cel_tekst;

            finalData.organizator_tekst = formData.organizacja_mianownik
                ? `organizacja/${strikeText('studenckie koło naukowe')}`
                : `organizacja/studenckie koło naukowe`;
            finalData.organizatorTekst = finalData.organizator_tekst;

            finalData.preliminarz_tekst = formData.zgodny_z_planem
                ? `TAK/${strikeText('NIE')}`
                : `${strikeText('TAK')}/NIE`;
            finalData.preliminarzTekst = finalData.preliminarz_tekst;

            finalData.data_wyjazdu_start = wyjazdStart;
            finalData['data_wyjazdu_powrót'] = wyjazdEnd;
            finalData.data_wyjazdu_powrot = wyjazdEnd;

            const selectedOrganizerNames = Array.isArray(formData.wybor_organizacji)
                ? formData.wybor_organizacji
                : (formData.wybor_organizacji ? [formData.wybor_organizacji] : []);

            const chairmen = selectedOrganizerNames.length > 1
                ? getOrganizerChairmen(templateData, selectedOrganizerNames)
                : [];

            if (chairmen.length > 1) {
                finalData.odpowiedzialny_funkcja = chairmen[0];
                finalData.swss = '';
            } else {
                finalData.odpowiedzialny_funkcja = formatFunkcjaDopelniacz(formData.odpowiedzialny_funkcja || 'Przewodniczący');
            }

            const organizerField = (templateData?.form_wniosek ?? []).find((field) => field.id === 'wybor_organizacji');
            const allOrganizerOptions = organizerField?.options ?? [];
            const facultyOptions = allOrganizerOptions.filter(
                (opt) => selectedOrganizerNames.includes(opt.name) && Boolean(opt.tags?.wydzial),
            );

            doc.render(emptyUndefinedValues({
                ...(templateData.static_tags ?? {}),
                ...finalData,
            }));

            let documentXml = doc.getZip().file('word/document.xml').asText();
            documentXml = mergeCostSourceCells(documentXml, renderedCostRows);
            if (chairmen.length > 1) {
                documentXml = expandMultipleOrganizerSignatures(documentXml, chairmen);
            }
            if (facultyOptions.length > 1 || (facultyOptions.length === 1 && selectedOrganizerNames.length > 1)) {
                documentXml = expandMultipleFacultyDeanBlocks(documentXml, facultyOptions);
            }
            doc.getZip().file('word/document.xml', documentXml);

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
        <div className="app-shell">
            <header className="app-header">e-Parlament</header>

            {activeTemplate ? (
                <TemplateForm
                    key={activeTemplate.id}
                    activeTemplate={activeTemplate}
                    templateData={templateData}
                    ui={formUi}
                    formData={formData}
                    costRows={costRows}
                    participantRows={participantRows}
                    uczestnicyUi={uczestnicyUi}
                    uczestnicyAvailable={uczestnicyAvailable}
                    financingSourceOptions={financingSourceOptions}
                    complexDates={complexDates}
                    onChange={handleChange}
                    onCostRowChange={handleCostRowChange}
                    onAddCostRow={handleAddCostRow}
                    onRemoveCostRow={handleRemoveCostRow}
                    onParticipantRowChange={handleParticipantRowChange}
                    onAddParticipantRow={handleAddParticipantRow}
                    onRemoveParticipantRow={handleRemoveParticipantRow}
                    onComplexDateChange={handleComplexDateChange}
                    onComplexSelect={handleComplexSelect}
                    onOrganizerSingleSelect={handleOrganizerSingleSelect}
                    organizerMode={organizerMode}
                    onOrganizerModeChange={handleOrganizerModeChange}
                    onComplexMultiSelect={handleComplexMultiSelect}
                    isPrzedsięwzięcieTooShort={isPrzedsięwzięcieTooShort}
                    isRozliczenieTooSoon={isRozliczenieTooSoon}
                    rozliczenieTouched={rozliczenieTouched}
                    onResetRozliczenie={handleResetRozliczenie}
                    kosztWymaganyTouched={kosztWymaganyTouched}
                    kosztWymaganyDisplay={kosztWymaganyDisplay}
                    onResetKosztWymagany={handleResetKosztWymagany}
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
                    ui={templatesConfig?.ui?.templatePicker}
                />
            )}

            <AppFooter devInfo={templatesConfig?.dev} />
        </div>
    );
}

export default App;