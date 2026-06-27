import { useState } from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import dane from '/public/dane.json'
import { saveAs } from 'file-saver';
import logo_pss from '/public/assets/logo_pss.png';

function App() {
  // Stany formularza (dodaj więcej, w zależności ile tagów zrobisz w Wordzie)
  const [dataWniosku, setDataWniosku] = useState('');
  const [organizacja, setOrganizacja] = useState('Samorząd Studencki ZUT');

  const renderWydzialyOptions = () =>
    dane.organizacja.name_short.map((skrot, index) => {
      const pelnaNazwa = dane.organizacja.name_prefix[2] + ' ' + dane.organizacja.name_full[index];
      const wydzial = 'Wydział' + ' ' + dane.organizacja.name_full[index];
      return (
        <option key={skrot} value={pelnaNazwa}>
          {wydzial}
        </option>
      );
    });

  const generateDocument = async () => {
    try {
      // Wczytanie pliku z folderu public
      const response = await fetch('public/Dofinansowanie.docx');
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

      // Podstawianie zmiennych pod tagi w pliku np. {data_wniosku}
      doc.render({
        data_wniosku: dataWniosku,
        organizacja: organizacja,
      });

      // Wypluwanie gotowego pliku
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
        <h1>Generator Wniosku PSS</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px' }}>

          <label>
            Data wniosku:
            <input
                type="date"
                value={dataWniosku}
                onChange={(e) => setDataWniosku(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>

          <label>
            W imieniu organizacji:
            <select
                value={organizacja}
                onChange={(e) => setOrganizacja(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              {renderWydzialyOptions()}
            </select>
          </label>

          <button onClick={generateDocument} style={{ padding: '10px 20px', cursor: 'pointer', marginTop: '10px' }}>
            Generuj gotowy dokument
          </button>
        </div>
        <div className="mt-10 text-left px-6 border-2 border-gray-200 py-2 bg-gray-100 flex flex-row items-end justify-between">
          <img src={logo_pss} className="h-auto w-1/4" />
          <div>
            <p>Utworzone przez <a href={dane.dev.link} className="font-bold tracking-tighter text-blue-600">{dane.dev.author}</a></p>
            <p>Wersja: {dane.dev.version}</p>
            <p>Ostatnia aktualizacja: {dane.dev.date}</p>
          </div>
        </div>
      </div>
  );
}

export default App;