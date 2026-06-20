import React, { useState } from 'react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

function App() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const generateDocument = async () => {
    // 1. Tworzymy strukturę dokumentu
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: title, bold: true, size: 36 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: content, size: 24 }),
            ],
          }),
        ],
      }],
    });

    // 2. Generujemy plik jako Blob (Binary Large Object)
    const blob = await Packer.toBlob(doc);

    // 3. Wymuszamy pobranie pliku w przeglądarce użytkownika
    saveAs(blob, `${title || 'dokument'}.docx`);
  };

  return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>Generator Dokumentów .docx</h1>
        <div style={{ marginBottom: '10px' }}>
          <input
              type="text"
              placeholder="Tytuł dokumentu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ padding: '8px', width: '300px', display: 'block', marginBottom: '10px' }}
          />
          <textarea
              placeholder="Treść dokumentu..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ padding: '8px', width: '300px', height: '100px', display: 'block' }}
          />
        </div>
        <button onClick={generateDocument} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Generuj i pobierz plik
        </button>
      </div>
  );
}

export default App;